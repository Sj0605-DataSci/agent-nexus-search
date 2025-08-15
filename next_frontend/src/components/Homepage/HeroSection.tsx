"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import AOS from "aos";
// import "aos/dist/aos.css";
import { Parallax, ParallaxProvider } from "react-scroll-parallax";
import Link from "next/link";
import dynamic from "next/dynamic";

interface VideoPlayerProps {
  url: string;
  className?: string;
}

const VideoPlayer = dynamic<VideoPlayerProps>(() => import("./VideoPlayer"), { ssr: false });

const HeroSection: React.FC = () => {
  useEffect(() => {
    AOS.init({
      duration: 600,
      easing: "linear",
      once: true,
      offset: 20,
      delay: 0,
      mirror: false,
      anchorPlacement: "top-bottom",
      disable: "mobile",
    });
  }, []);
  const features = [
    {
      title: "Knows Your Intent",
      desc: "Understands your query like I know the faces in Winterfell—no filters needed, just tell me what you need",
      icon: "🎯",
    },
    {
      title: "Learns Every Time",
      desc: "Query once, I remember—sharpens with your feedback and evolves with every search",
      icon: "🧠",
    },
    {
      title: "Travels Everywhere",
      desc: "From your inbox to the globe—no lead is safe from me. Global reach meets personal networks",
      icon: "🌍",
    },
    {
      title: "Delivers the Truth",
      desc: "Verified results. No guesswork. Just the facts you need to act on",
      icon: "⚔️",
    },
  ];

  return (
    <>
      <ParallaxProvider>
        <section className="bg-background text-primary relative overflow-hidden min-h-screen flex items-center">
          <div className="absolute inset-0 opacity-10">
            <Parallax speed={-20}>
              <div className="absolute top-20 left-10 w-32 h-32 bg-accent-orange/20 rounded-full blur-3xl" />
            </Parallax>
            <Parallax speed={-15}>
              <div className="absolute bottom-40 right-20 w-48 h-48 bg-[#80A9F9]/20 rounded-full blur-3xl" />
            </Parallax>
            <Parallax speed={-10}>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-accent-orange/10 to-[#80A9F9]/10 rounded-full blur-3xl" />
            </Parallax>
          </div>

          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-20 sm:pt-24 lg:pt-28 pb-12 sm:pb-10 lg:pb-10">
            <div className="text-center mb-12 sm:mb-16 lg:mb-20">
              <Parallax speed={-5}>
                <h1
                  data-aos="fade-up"
                  data-aos-duration="600"
                  data-aos-delay="100"
                  className="font-hero-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[80px] leading-[1.1] font-bold text-primary tracking-[-0.02em] mb-6"
                >
                  Find the right people,{" "}
                  <span className="bg-gradient-to-r from-[#5D9CEC] via-[#4A89DC] to-[#3B7DDD] bg-clip-text text-transparent font-extrabold">
                    fast
                  </span>
                </h1>
              </Parallax>

              <Parallax speed={-3}>
                <p
                  data-aos="fade-up"
                  data-aos-delay="150"
                  data-aos-duration="600"
                  className="text-lg sm:text-xl lg:text-2xl text-text-secondary max-w-4xl mx-auto leading-relaxed"
                >
                  AI-powered people search that understands your intent. Connect with the right
                  professionals, investors, and decision makers with precision and speed.
                </p>
              </Parallax>
            </div>

            <div className="relative w-full max-w-6xl mx-auto">
              <Parallax
                speed={-2}
                className="relative w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[1200/675] rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden group shadow-2xl"
                translateY={[0, 10]}
                shouldAlwaysCompleteAnimation
              >
                <div className="relative w-full h-full">
                  <Image
                    src="/Images/SoneticImage.png"
                    alt="Artistic landscape illustration showcasing AI consciousness concept"
                    fill
                    priority
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, (max-width: 1536px) 80vw, 1200px"
                    className="object-cover transition-all duration-700 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/20 to-black/60" />

                  <div className="absolute inset-0 p-4 pt-8 sm:p-6 md:p-8 lg:p-12 xl:p-16 flex items-start justify-start">
                    <div className="w-full max-w-xl sm:max-w-[70%] md:max-w-[60%] lg:max-w-[50%] text-left">
                      <h2 className="font-hero-headline text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl leading-[1.15] font-bold text-white mb-4 sm:mb-6 [text-shadow:_0_2px_4px_rgba(0,0,0,0.7)]">
                        <Parallax translateY={[5, -5]} speed={-2} className="block">
                          Arya never forgets
                        </Parallax>
                        <Parallax translateY={[10, -5]} speed={-1} className="block">
                          a face or a lead
                        </Parallax>
                      </h2>

                      <div className="space-y-4 sm:space-y-6">
                        <Parallax
                          translateY={[15, -5]}
                          speed={-0.5}
                          className="text-sm sm:text-base lg:text-lg xl:text-xl text-white/90 font-medium leading-relaxed [text-shadow:_0_1px_3px_rgba(0,0,0,0.6)]"
                        >
                          <span className="font-bold text-white">Sharp, loyal, and relentless</span>{" "}
                          — Arya learns your patterns, remembers your preferences, and gets better
                          with every hunt. No databases, no guesswork. Just precision.
                        </Parallax>

                        <div className="flex flex-wrap  items-center gap-4">
                          <Parallax translateY={[25, -5]} speed={-0.2}>
                            <Link href={"/join-waitlist"}>
                              <button className="hidden sm:inline-flex  backdrop-blur-sm px-6 py-2.5 lg:px-8 lg:py-3 bg-[#333333] text-white text-sm font-semibold rounded-full transition-all duration-300 hover:bg-[#000000] hover:scale-105 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(0,0,0,0.7)] transform hover:-translate-y-0.5 border-2 border-white">
                                Join Waitlist
                              </button>
                            </Link>
                          </Parallax>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Parallax
                    translateY={[0, 20]}
                    speed={2}
                    className="absolute top-4 right-4 sm:top-8 sm:right-8 w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
                  >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-accent-orange rounded-full animate-pulse" />
                  </Parallax>

                  <Parallax
                    translateY={[0, 15]}
                    speed={1.5}
                    className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 w-8 h-8 sm:w-12 sm:h-12 bg-[#80A9F9]/30 backdrop-blur-sm rounded-full"
                  />
                </div>
              </Parallax>
            </div>
            <div className="flex flex-wrap justify-center w-full mt-10 sm:hidden items-center gap-4">
              <Parallax translateY={[25, -5]} speed={-0.2}>
                <Link href={"/join-waitlist"}>
                  <button className="backdrop-blur-sm px-6 py-2.5 lg:px-8 lg:py-3.5 bg-[#333333] text-white font-semibold rounded-full transition-all duration-300 hover:bg-[#000000] hover:scale-105 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(0,0,0,0.7)] transform hover:-translate-y-0.5 border-2 border-white">
                    Join Waitlist
                  </button>
                </Link>
              </Parallax>
            </div>
            <div className="mt-10 mb-12 sm:mt-18 sm:mb-18 text-center">
              <p className="text-sm text-text-secondary mb-3 font-medium">
                AI-Powered • Intelligent Search • Verified Results
              </p>
              <div className="flex justify-center gap-8 mt-8">
                <Link href="/arya">
                  <button className="px-8 py-3 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 transition-colors duration-200">
                    Meet Arya
                  </button>
                </Link>
                <Link href="/user-auth">
                  <button className="px-8 py-3 border-2 border-gray-900 text-gray-900 font-semibold rounded-full hover:bg-gray-900 hover:text-white transition-colors duration-200">
                    Get Started
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </ParallaxProvider>
    </>
  );
};

export default HeroSection;
