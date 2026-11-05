"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export type SlidingPillState = {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
};

const EMPTY_PILL: SlidingPillState = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  visible: false,
};

/**
 * Jeden sdílený „pill“ pro navigaci. Měří aktivní položku a vrací pozici
 * relativně ke kontejneru. Animace samotná je v MotionPill.
 */
export function useSlidingPill<T extends HTMLElement = HTMLElement>(
  activeKey: string | null,
  options?: { padding?: number }
) {
  const padding = options?.padding ?? 0;
  const containerRef = useRef<T | null>(null);
  const itemsRef = useRef(new Map<string, HTMLElement>());
  const [pill, setPill] = useState<SlidingPillState>(EMPTY_PILL);
  const [animate, setAnimate] = useState(false);
  const wasVisibleRef = useRef(false);

  const register = useCallback(
    (key: string) => (node: HTMLElement | null) => {
      if (node) itemsRef.current.set(key, node);
      else itemsRef.current.delete(key);
    },
    []
  );

  const measure = useCallback(() => {
    const container = containerRef.current;
    const item = activeKey ? itemsRef.current.get(activeKey) : undefined;

    if (!container || !item) {
      setPill((current) =>
        current.visible ? { ...current, visible: false } : current
      );
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const width = Math.max(0, itemRect.width - padding * 2);
    const height = Math.max(0, itemRect.height - padding * 2);

    setPill({
      x: itemRect.left - containerRect.left + padding,
      y: itemRect.top - containerRect.top + padding,
      width,
      height,
      visible: width > 0 && height > 0,
    });
  }, [activeKey, padding]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(container);

    const activeItem = activeKey ? itemsRef.current.get(activeKey) : null;
    if (activeItem) observer.observe(activeItem);

    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure).catch(() => undefined);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeKey, measure]);

  useEffect(() => {
    wasVisibleRef.current = pill.visible;
  }, [pill.visible]);

  // První zobrazení pillu na pozici necháme jen fade-in, aby nepřiletěl
  // z levého horního rohu. Posuny mezi položkami už animujeme.
  return {
    containerRef,
    register,
    pill,
    animate: animate && wasVisibleRef.current,
  };
}
