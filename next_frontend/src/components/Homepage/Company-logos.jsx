"use client";

import Image from "next/image";
import React from "react";

const originalLogos = [
  {
    src: "https://framerusercontent.com/images/BSPLYRZxoX6Uf0dDgkCZT7tk0.png",
    alt: "NVIDIA",
    width: 111,
    height: 24,
  },
  {
    src: "https://framerusercontent.com/images/2QxonHNai5gTnavVtYwmvXYyA0.png",
    alt: "Andreessen Horowitz",
    width: 185,
    height: 24,
  },
  {
    src: "https://framerusercontent.com/images/YgZBXvWxNYHTzT2SbYcTJN9aEs.png",
    alt: "Cohesity",
    width: 104,
    height: 22,
  },
  {
    src: "https://framerusercontent.com/images/ntYC3bZIkQbNN7rUr8HcZH0.png",
    alt: "Z Fellows",
    width: 100,
    height: 29,
  },
  {
    src: "https://framerusercontent.com/images/tsWG5DFpjacHTizESFHqHWWE0Y.png",
    alt: "On Deck",
    width: 92,
    height: 26,
  },
  {
    src: "https://framerusercontent.com/images/PvgwSMiePPVCkKOvVbrtoBamnE.png",
    alt: "Adobe",
    width: 75,
    height: 24,
  },
  {
    src: "https://framerusercontent.com/images/5XDZiyhGrzAZJeU0oFWPVtCAVo.png",
    alt: "JPMorgan",
    width: 122,
    height: 18,
  },
  {
    src: "https://framerusercontent.com/images/uUDapmB05qV0SEzBlZfZS4Cbvd8.png",
    alt: "Microsoft",
    width: 106,
    height: 22,
  },
];

const TARGET_LOGO_HEIGHT = 24;

const logos = originalLogos.map(logo => ({
  ...logo,
  width: Math.round(logo.width * (TARGET_LOGO_HEIGHT / logo.height)),
  height: TARGET_LOGO_HEIGHT,
}));

export default function CompanyLogos() {
  return (
    <>
      <style jsx global>{`
        @keyframes scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
      <section className="bg-background py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-x-12 gap-y-8">
            <div className="flex-shrink-0 text-center lg:text-left">
              <p className="text-lg text-text-secondary leading-snug">Built and backed by</p>
              <p className="text-lg text-text-secondary leading-snug">Engineers from</p>
            </div>
            <div
              className="w-full flex-1 overflow-hidden"
              style={{
                maskImage:
                  "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
              }}
            >
              <div className="flex w-max items-center [animation:scroll_40s_linear_infinite] hover:[animation-play-state:paused]">
                {[...logos, ...logos].map((logo, index) => (
                  <div key={`${logo.alt}-${index}`} className="flex-shrink-0 px-8">
                    <Image
                      src={logo.src}
                      alt={logo.alt}
                      width={logo.width}
                      height={logo.height}
                      className="h-6 w-auto" // h-6 is 24px
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
