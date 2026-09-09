// VOICE FOR THE ASSISTANT — speech-to-text for what the user says, and
// text-to-speech for the reply, both from the browser's own Web Speech API.
// Nothing is sent anywhere extra: recognition runs in the browser (Chrome and
// Edge route it through the platform's speech service, exactly as the address
// bar's dictation does) and the app only ever receives the finished text,
// which then follows the same path as anything typed.
//
// Support is uneven — Chrome and Edge implement SpeechRecognition, Firefox
// does not — so every entry point here reports whether it is available and the
// UI hides or explains the control rather than offering a dead button.

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
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
  stop: () => void;
}

// Listen once and hand back what was said. `onResult` fires with the final
// transcript; `onEnd` always fires afterwards so the caller can clear its
// "listening" state whether the user spoke, went silent, or stopped it.
export function listenOnce({
  lang,
  onResult,
  onError,
  onEnd,
}: {
  lang: string;
  onResult: (transcript: string) => void;
  onError?: (kind: VoiceErrorKind) => void;
  onEnd?: () => void;
}): VoiceSession | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let finished = false;
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim();
    if (transcript) {
      finished = true;
      onResult(transcript);
    }
  };
  recognition.onerror = (event) => {
    // "aborted" is what a deliberate stop() reports — not worth surfacing.
    if (event?.error === "aborted") return;
    onError?.(event?.error === "not-allowed" || event?.error === "service-not-allowed" ? "denied" : "other");
  };
  recognition.onend = () => {
    if (!finished) onError?.("other");
    onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    onError?.("other");
    onEnd?.();
    return null;
  }
  return { stop: () => recognition.abort() };
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
