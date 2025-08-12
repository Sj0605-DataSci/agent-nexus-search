import React, { useEffect, useRef, useMemo, ReactNode, RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
  children: ReactNode;
  scrollContainerRef?: RefObject<HTMLElement>;
  enableBlur?: boolean;
  baseOpacity?: number;
  baseRotation?: number;
  blurStrength?: number;
  containerClassName?: string;
  textClassName?: string;
  rotationEnd?: string;
  wordAnimationEnd?: string;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = "",
  textClassName = "",
  rotationEnd = "bottom bottom",
  wordAnimationEnd = "bottom bottom",
}) => {
  const containerRef = useRef<HTMLHeadingElement>(null);

  const splitText = useMemo(() => {
    const text = typeof children === "string" ? children : "";
    return text.split(/(\s+)/).map((word, index) => {
      if (word.match(/^\s+$/)) return word;
      return (
        <span className="inline-block text-2xl word" key={index}>
          {word}
        </span>
      );
    });
  }, [children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scroller =
      scrollContainerRef && scrollContainerRef.current ? scrollContainerRef.current : window;

    gsap.set(el, {
      opacity: 0,
      y: 50,
      rotate: baseRotation,
    });

    gsap.to(el, {
      opacity: 1,
      y: 0,
      rotate: 0,
      duration: 1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        scroller,
        start: "top 85%", // Start when top of element is 85% down the viewport
        end: "top 40%", // End when top of element is 40% down the viewport
        scrub: 1,
        toggleActions: "play none none none",
      },
    });

    const wordElements = el.querySelectorAll<HTMLElement>(".word");

    if (wordElements.length > 0) {
      gsap.fromTo(
        wordElements,
        {
          opacity: baseOpacity,
          y: 30,
          filter: enableBlur ? `blur(${blurStrength}px)` : "none",
          willChange: "opacity, transform, filter",
        },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          stagger: 0.03,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            scroller,
            start: "top 90%",
            end: "top 60%",
            scrub: 1,
            toggleActions: "play none none none",
          },
        }
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [
    scrollContainerRef,
    enableBlur,
    baseRotation,
    baseOpacity,
    rotationEnd,
    wordAnimationEnd,
    blurStrength,
  ]);

  return (
    <div className="w-full">
      <h2 ref={containerRef} className={`${containerClassName} w-full`}>
        <div className={`text-[clamp(1.2rem,3vw,2rem)] leading-snug font-medium ${textClassName}`}>
          {splitText}
        </div>
      </h2>
    </div>
  );
};

export default ScrollReveal;
