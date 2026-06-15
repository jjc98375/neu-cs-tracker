"use client";

import { useEffect, useState } from "react";

/**
 * Fades its children from opacity 0 → 1 after `delay` ms, over `duration` ms.
 * Uses a setTimeout + state flip and an inline transitionDuration so each
 * instance can be timed independently (hero entrance choreography).
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 1000,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`transition-opacity ${className}`}
      style={{ opacity: shown ? 1 : 0, transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}
