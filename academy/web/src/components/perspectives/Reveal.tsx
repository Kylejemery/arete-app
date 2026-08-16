"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scroll reveal for the canon cards. Respects prefers-reduced-motion by
 * rendering visible immediately and never registering an observer.
 */
export default function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <aside ref={ref} className={`${className} pv-reveal${shown ? " pv-in" : ""}`}>
      {children}
    </aside>
  );
}
