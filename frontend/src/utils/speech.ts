// VOICE FOR THE ASSISTANT — speech-to-text for what the user says, and
// text-to-speech for the reply, both from the browser's own Web Speech API.
// Nothing is sent anywhere extra: recognition runs in the browser (Chrome and
// Edge route it through the platform's speech service, exactly as the address
// bar's dictation does) and the app only ever receives the finished text,
// which then follows the same path as anything typed.
//
// Listening waits for the WHOLE sentence. The API's default behaviour ends the
// session at the first pause, which cuts a speaker off mid-thought ("show me
// the daily pest control monitoring record …" — pause to think — "… for
// January"), so recognition runs in continuous mode and this module decides
// when the speaker has finished: it keeps accumulating while they talk and
// only completes after a clear silence (SILENCE_MS) once something has
// actually been said. Interim words are reported as they arrive so the
// composer can show the sentence building up, and the user can always finish
// early by pressing stop.
//
// Support is uneven — Chrome and Edge implement SpeechRecognition, Firefox
// does not — so every entry point here reports whether it is available and the
// UI hides or explains the control rather than offering a dead button.

// How long a speaker may pause, mid-sentence, before we treat the utterance as
// finished. Generous on purpose: being cut off is far more annoying than
// waiting an extra second, and the stop button is always there for an
// immediate finish.
const SILENCE_MS = 2500;
// Chrome sometimes ends a continuous session on its own after a long silence.
// While the user still means to be talking, restart — bounded, so a browser
// that refuses to listen can never spin.
const MAX_RESTARTS = 3;

type RecognitionResultLike = { isFinal: boolean; length: number; 0: { transcript: string } };
type RecognitionEventLike = { results: ArrayLike<RecognitionResultLike> };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isVoiceInputSupported(): boolean {
  return recognitionCtor() !== null;
}

export function isSpeechOutputSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export type VoiceErrorKind = "denied" | "other";

export interface VoiceSession {
  // Finish now with whatever has been said so far (the mic button while
  // listening) — the sentence is delivered, not discarded.
  finish: () => void;
  // Drop the session and say nothing (navigating away, unmounting).
  cancel: () => void;
}

// Listen until the speaker finishes their sentence.
//   onInterim — the sentence so far, updated as they speak (for live display)
//   onFinal   — the complete sentence, exactly once, when they have finished
//   onEnd     — always, so the caller can clear its "listening" state
export function listenForUtterance({
  lang,
  onInterim,
  onFinal,
  onError,
  onEnd,
  silenceMs = SILENCE_MS,
}: {
  lang: string;
  onInterim?: (text: string) => void;
  onFinal: (transcript: string) => void;
  onError?: (kind: VoiceErrorKind) => void;
  onEnd?: () => void;
  silenceMs?: number;
}): VoiceSession | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = lang;
  // Continuous: a pause must not end the sentence — see the header comment.
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let settled = false; // onFinal / onEnd already delivered
  let stopping = false; // deliberate finish/cancel — don't restart
  let restarts = 0;
  let finalText = "";
  let silenceTimer: number | undefined;

  const clearSilenceTimer = () => {
    if (silenceTimer !== undefined) {
      window.clearTimeout(silenceTimer);
      silenceTimer = undefined;
    }
  };

  const settle = (deliver: boolean) => {
    if (settled) return;
    settled = true;
    clearSilenceTimer();
    stopping = true;
    try {
      recognition.abort();
    } catch {
      /* already stopped */
    }
    const text = finalText.trim();
    if (deliver && text) onFinal(text);
    onEnd?.();
  };

  // The speaker has gone quiet for long enough — treat the sentence as done.
  const armSilenceTimer = () => {
    clearSilenceTimer();
    silenceTimer = window.setTimeout(() => {
      if (finalText.trim()) settle(true);
    }, silenceMs);
  };

  recognition.onresult = (event) => {
    let interim = "";
    finalText = "";
    // Rebuild from the whole result list rather than appending per event:
    // Chrome revises earlier segments as it hears more, and re-reading is
    // what keeps the accumulated sentence in step with those revisions.
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result?.[0]?.transcript ?? "";
      if (result?.isFinal) finalText += text;
      else interim += text;
    }
    onInterim?.((finalText + interim).trim());
    // Any speech at all — final or interim — means they're still going.
    armSilenceTimer();
  };

  recognition.onerror = (event) => {
    // "aborted" is a deliberate stop; "no-speech" just means they haven't
    // started yet, and the session either restarts or ends on its own.
    if (event?.error === "aborted") return;
    if (event?.error === "no-speech") return;
    onError?.(event?.error === "not-allowed" || event?.error === "service-not-allowed" ? "denied" : "other");
    settle(true);
  };

  recognition.onend = () => {
    if (settled || stopping) return;
    // Ended by itself: deliver if they said something, otherwise keep the
    // microphone open — they may simply not have started yet.
    if (finalText.trim()) {
      settle(true);
      return;
    }
    if (restarts < MAX_RESTARTS) {
      restarts += 1;
      try {
        recognition.start();
        return;
      } catch {
        /* fall through to settle */
      }
    }
    settle(false);
  };

  try {
    recognition.start();
  } catch {
    onError?.("other");
    onEnd?.();
    return null;
  }
  return {
    finish: () => settle(true),
    cancel: () => settle(false),
  };
}

// Read a reply out loud. Picks a voice matching the requested language when
// the platform has one (Gujarati is not installed everywhere — the browser
// then falls back to its default voice rather than staying silent).
export function speak(text: string, lang: string): void {
  if (!isSpeechOutputSupported() || !text.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  const base = lang.split("-")[0];
  const voice = synth.getVoices().find((v) => v.lang === lang) ?? synth.getVoices().find((v) => v.lang.startsWith(base));
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (isSpeechOutputSupported()) window.speechSynthesis.cancel();
}
