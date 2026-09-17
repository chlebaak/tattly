"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";

export function DrawLine({
  className,
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "h-px origin-left border-t border-dashed transition-transform duration-500 ease-brand motion-reduce:transition-none",
        on ? "scale-x-100" : "scale-x-0",
        className
      )}
    />
  );
}
