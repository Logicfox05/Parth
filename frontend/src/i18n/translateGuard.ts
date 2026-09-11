// GOOGLE TRANSLATE × REACT.
//
// Google's website translator swaps each English text node on the page for a
// <font> holding the Gujarati (or wraps it in one). React still holds the
// original node, so left alone it (a) crashes the moment it removes, or
// inserts next to, a node that is no longer where it put it ("Failed to
// execute 'removeChild' on 'Node'") and (b) writes new text into a node that
// is no longer on screen, so the old translation stays up — a count, a
// status or a name that silently stops changing.
//
// This guard keeps React's picture of the page true while Google Translate is
// in use (it is installed only then — English users never load it):
//   * removing a swapped node removes whatever stands in for it on screen;
//   * inserting before a swapped node inserts before its stand-in;
//   * moving a swapped node takes its stand-in off the page first;
//   * when React changes the text of a swapped node, a FRESH text node with
//     the new English is put on screen in place of the stale translation.
//     It must be a new node: Google only translates text it hasn't seen, so
//     putting React's own (already handled) node back would leave the new
//     text in English — checked against the real Google Translate.
// Stand-ins chain: React's node → the fresh copy → the <font> Google swaps
// that copy for, and so on; everything below follows the chain to whatever
// is on screen now. React never renders <font>, so a <font> taking a text
// node's place can only be Google's.

const standIn = new WeakMap<Node, Node>(); // node → what replaced it on screen
const pending = new WeakMap<Node, Node>(); // text node → <font> inserted before it, not yet swapped
let installed = false;
const MAX_HOPS = 16;

function isFont(n: Node | null | undefined): n is Element {
  return !!n && n.nodeName === "FONT";
}

function isText(n: Node | null | undefined): n is Text {
  return !!n && n.nodeType === 3;
}

// React marks every node it renders with an own "__reactFiber$…" property;
// Google's and the guard's own nodes don't have one.
function isReactNode(n: Node): boolean {
  return Object.keys(n).some((k) => k.startsWith("__reactFiber$"));
}

// The outermost <font> Google has wrapped this node in, if any.
function outerFont(n: Node): Element | null {
  let found: Element | null = null;
  for (let cur = n.parentNode; cur && isFont(cur); cur = cur.parentNode) found = cur;
  return found;
}

export function installTranslateGuard(): void {
  if (installed || typeof Node !== "function") return;
  installed = true;
  const proto = Node.prototype;
  const removeChild = proto.removeChild;
  const insertBefore = proto.insertBefore;
  const replaceChild = proto.replaceChild;
  const appendChild = proto.appendChild;

  // Whatever stands for `node` on screen now (following the chain), or null.
  const onScreen = (node: Node): Node | null => {
    let n: Node | undefined = standIn.get(node);
    for (let hops = 0; n && hops < MAX_HOPS; hops++) {
      if (n.parentNode) return outerFont(n) ?? n;
      n = standIn.get(n);
    }
    return null;
  };

  // Where `node` is under `parent` right now: itself, the <font> it is
  // wrapped in, or what stands in for it. null = not under `parent` at all.
  const locate = (node: Node, parent: Node): Node | null => {
    if (node.parentNode === parent) return node;
    const wrapper = outerFont(node);
    if (wrapper && wrapper.parentNode === parent) return wrapper;
    const s = onScreen(node);
    return s && s.parentNode === parent ? s : null;
  };

  // React is about to place this node again: take its stand-in off the page
  // first, or the old translation would stay on screen beside it.
  const retire = (node: Node) => {
    const s = onScreen(node);
    standIn.delete(node);
    if (s && s.parentNode) removeChild.call(s.parentNode, s);
  };

  // React changed this node's text while Google had it swapped out (or
  // wrapped): show the new English as a fresh node for Google to translate.
  const refresh = (text: Text) => {
    const wrapper = text.parentNode ? outerFont(text) : null;
    const target = wrapper ?? (text.parentNode ? null : onScreen(text));
    if (!target || !target.parentNode) return;
    const fresh = document.createTextNode(text.nodeValue ?? "");
    replaceChild.call(target.parentNode, fresh, target);
    standIn.set(text, fresh);
  };

  proto.removeChild = function (this: Node, child: Node) {
    const at = locate(child, this);
    if (at === null) return child; // already gone — nothing to remove, nothing to crash on
    if (at !== child) {
      standIn.delete(child);
      removeChild.call(this, at);
      return child;
    }
    const f = isText(child) ? pending.get(child) : undefined;
    if (f) {
      pending.delete(child);
      if (f.parentNode === this) standIn.set(child, f);
    }
    return removeChild.call(this, child);
  } as typeof proto.removeChild;

  proto.insertBefore = function (this: Node, node: Node, ref: Node | null) {
    if (!isFont(node)) retire(node);
    // A reference node that isn't here any more: use what stands in for it,
    // or append rather than throw.
    const at = ref && ref.parentNode !== this ? locate(ref, this) : ref;
    if (at && isFont(node) && isText(at)) pending.set(at, node);
    return insertBefore.call(this, node, at);
  } as typeof proto.insertBefore;

  proto.appendChild = function (this: Node, node: Node) {
    if (!isFont(node)) retire(node);
    return appendChild.call(this, node);
  } as typeof proto.appendChild;

  proto.replaceChild = function (this: Node, node: Node, old: Node) {
    const at = locate(old, this);
    if (at === null) return old;
    if (at === old && isText(old) && isFont(node)) standIn.set(old, node);
    else if (at !== old) standIn.delete(old);
    if (!isFont(node)) retire(node);
    return replaceChild.call(this, node, at);
  } as typeof proto.replaceChild;

  // React writes text through nodeValue; textContent / data cover the rest.
  const hook = (owner: object, prop: string) => {
    const d = Object.getOwnPropertyDescriptor(owner, prop);
    if (!d || !d.get || !d.set) return;
    const set = d.set;
    Object.defineProperty(owner, prop, {
      ...d,
      set(this: Node, value: unknown) {
        set.call(this, value);
        if (isText(this) && (standIn.has(this) || isFont(this.parentNode)) && isReactNode(this)) refresh(this);
      },
    });
  };
  hook(Node.prototype, "nodeValue");
  hook(Node.prototype, "textContent");
  hook(CharacterData.prototype, "data");
}
