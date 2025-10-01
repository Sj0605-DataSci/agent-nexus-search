"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

const VideoPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const [entry] = entries;
        setIsInView(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
      }
    );

    if (videoContainerRef.current) {
      observer.observe(videoContainerRef.current);
    }

    return () => {
      if (videoContainerRef.current) {
        observer.unobserve(videoContainerRef.current);
      }
    };
  }, []);

  const handlePlayClick = () => {
    setIsPlaying(true);
  };

  return (
    <div className="mx-auto max-w-6xl mt-4 md:mt-12 px-4 sm:px-6 lg:px-8 xl:px-0">
      <h2
        id="offerings-title"
        className="text-3xl font-medium tracking-tight text-[#0E3D15] sm:text-4xl md:text-5xl text-center"
      >
        Here's a Quick Demo
      </h2>

      <div
        ref={videoContainerRef}
        className="relative mt-6 aspect-video overflow-hidden rounded-2xl shadow-xl"
      >
        {isPlaying && isInView ? (
          <iframe
            className="absolute inset-0 w-full h-full rounded-2xl"
            src="https://www.youtube.com/embed/_MD4aM5SyhI?rel=0&modestbranding=1&autoplay=1"
            title="DiscoverMinds Quick Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            style={{ border: "none" }}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 z-10 cursor-pointer group" onClick={handlePlayClick}>
            <Image
              src="/Images/YoutubeTumbnailImage.jpg"
              alt="Video thumbnail"
              fill
              priority={true}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover rounded-2xl"
            />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-[#FF0000] hover:bg-[#CC0000] rounded-xl sm:rounded-2xl px-4 py-3 sm:px-6 sm:py-4 shadow-2xl transform group-hover:scale-105 transition-all duration-200">
                <Play
                  className="w-10 h-10 sm:w-16 sm:h-16 text-white ml-0.5 sm:ml-1"
                  fill="currentColor"
                  strokeWidth={0}
                />
              </div>
            </div>

            <div className="absolute bottom-4 right-4">
              <div className="bg-black bg-opacity-70 px-3 py-1 rounded text-white text-sm font-medium">
                Watch Demo
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default memo(VideoPlayer);
