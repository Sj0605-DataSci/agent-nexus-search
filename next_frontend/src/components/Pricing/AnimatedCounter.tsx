"use client";

import { useEffect, useRef } from "react";
import { animate, motion } from "framer-motion";

function AnimatedCounter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const previousValue = Number(node.textContent);

    const controls = animate(previousValue, value, {
      duration: 0.5,
      ease: "easeOut",
      onUpdate(latest) {
        node.textContent = latest.toFixed(0);
      },
    });

    return () => controls.stop();
  }, [value]);

  return <span ref={ref}>{value}</span>;
}

export default AnimatedCounter;
