import { useCallback, useEffect, useRef, useState } from "react";

export interface DragPosition {
  x: number;
  y: number;
}

// Movement under this threshold is treated as a click, not a drag — lets a
// draggable handle also be a button (e.g. the assistant's collapsed pill)
// without a steady hand being required to open it.
const MOVE_THRESHOLD = 4;

// Makes an element draggable anywhere within the viewport via a pointer-down
// handle. Position is per-browser (localStorage) so it survives reloads;
// `style` is undefined until the user drags at least once, so the caller's
// own default CSS position (e.g. fixed bottom-right) applies until then.
export function useDraggable(storageKey: string) {
  const [pos, setPos] = useState<DragPosition | null>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as DragPosition) : null;
    } catch {
      return null;
    }
  });
  const elRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ offsetX: number; offsetY: number; startX: number; startY: number; moved: boolean } | null>(null);
  const justDraggedRef = useRef(false);

  const clamp = useCallback((x: number, y: number) => {
    const el = elRef.current;
    const w = el?.offsetWidth ?? 0;
    const h = el?.offsetHeight ?? 0;
    const maxX = Math.max(8, window.innerWidth - w - 8);
    const maxY = Math.max(8, window.innerHeight - h - 8);
    return { x: Math.min(Math.max(8, x), maxX), y: Math.min(Math.max(8, y), maxY) };
  }, []);

  // If the window shrinks (or the widget grew) since the last saved
  // position, pull it back on screen rather than letting it hang off the
  // edge or go fully out of view.
  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p.x, p.y) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top, startX: e.clientX, startY: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > MOVE_THRESHOLD) {
      drag.moved = true;
    }
    if (drag.moved) setPos(clamp(e.clientX - drag.offsetX, e.clientY - drag.offsetY));
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.moved) {
      justDraggedRef.current = true;
      setPos((p) => {
        if (p) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(p));
          } catch {
            /* private-mode / quota — position just won't persist */
          }
        }
        return p;
      });
    }
  };

  // A pointerup that ended a drag is immediately followed by a click event
  // on the same element — call this at the top of the handle's onClick to
  // swallow exactly that one synthetic click, so dragging the assistant's
  // pill doesn't also re-open/close it.
  const didJustDrag = () => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return true;
    }
    return false;
  };

  // Call after the element's own content size changes (e.g. a collapsed
  // pill expanding into a full panel) so a widget parked near an edge
  // doesn't hang off-screen at the new size. A no-op until the user has
  // dragged at least once (default CSS positioning has no fixed point to
  // clamp against).
  const reclamp = useCallback(() => {
    setPos((p) => (p ? clamp(p.x, p.y) : p));
  }, [clamp]);

  return {
    elRef,
    style: pos ? ({ left: pos.x, top: pos.y, right: "auto", bottom: "auto" } as React.CSSProperties) : undefined,
    dragHandleProps: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    didJustDrag,
    reclamp,
  };
}
