import { useEffect, useRef } from "react";

type InputAction = "left" | "right" | "jump" | "slide";
type InputHandler = (action: InputAction) => void;

export function useInput(onInput: InputHandler, enabled: boolean) {
  const handlerRef = useRef(onInput);
  handlerRef.current = onInput;

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") handlerRef.current("left");
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") handlerRef.current("right");
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") handlerRef.current("jump");
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") handlerRef.current("slide");
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      touchStartRef.current = null;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < -30) handlerRef.current("left");
        else if (dx > 30) handlerRef.current("right");
      } else {
        if (dy < -30) handlerRef.current("jump");
        else if (dy > 30) handlerRef.current("slide");
      }
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled]);
}
