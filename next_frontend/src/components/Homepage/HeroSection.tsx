import React from "react";
import Image from "next/image";
import Link from "next/link";

const HeroSection: React.FC = () => {
  return (
    <>
      <section className="bg-background pt-6 md:pt-0 text-primary relative overflow-hidden min-h-screen flex items-center">
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-20 sm:pt-24 lg:pt-28 pb-12 sm:pb-10 lg:pb-10">
          <div className="text-center mb-12 sm:mb-16 lg:mb-20">
            <h1 className="font-hero-headline text-4xl sm:text-5xl md:text-6xl leading-[1.1] font-bold text-primary tracking-[-0.02em] mb-6">
              Unlock Hidden Opportunities
              <span className="block bg-gradient-to-r from-[#5D9CEC] via-[#4A89DC] to-[#3B7DDD] bg-clip-text text-transparent font-extrabold">
                in Your Network
              </span>
            </h1>

            <p className="text-lg sm:text-xl  text-text-secondary max-w-4xl mx-auto leading-relaxed">
              Stop sending cold emails. DiscoverMinds helps you find warm introductions to
              opportunities in your extended network by connecting your fragmented professional
              circles.
            </p>
          </div>

          <div className="relative w-full max-w-6xl mx-auto">
            <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[1200/675] rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden group shadow-2xl">
              <div className="relative w-full h-full">
                <Image
                  src="/Images/SoneticImage.png"
                  alt="Artistic landscape illustration showcasing AI consciousness concept"
                  fill
                  priority
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, (max-width: 1536px) 80vw, 1200px"
                  className="object-cover "
                />

                <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/20 to-black/60" />

                <div className="absolute inset-0 p-4 pt-8 sm:p-6 md:p-8 lg:p-12 xl:p-16 flex items-start justify-start">
                  <div className="w-full max-w-xl sm:max-w-[70%] md:max-w-[60%] lg:max-w-[50%] text-left">
                    <h2 className="font-hero-headline text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl leading-[1.15] font-bold text-white mb-4 sm:mb-6 [text-shadow:_0_2px_4px_rgba(0,0,0,0.7)]">
                      Your Network, Unlocked.
                    </h2>

                    <div className="space-y-4 sm:space-y-6">
                      <div className="text-sm sm:text-base lg:text-lg xl:text-xl text-white/90 font-medium leading-relaxed [text-shadow:_0_1px_3px_rgba(0,0,0,0.6)]">
                        <span className="font-bold text-white">
                          DiscoverMinds connects your scattered professional circles
                        </span>
                        -LinkedIn, email, contacts into a single, searchable map. Find who you need
                        through people you already trust.
                      </div>

                      {/* <div className="flex flex-wrap  items-center gap-4">
                        <Link href={"/join-waitlist"}>
                          <button className="hidden sm:inline-flex  backdrop-blur-sm px-6 py-2.5 lg:px-8 lg:py-3 bg-[#333333] text-white text-sm font-semibold rounded-full transition-all duration-300 hover:bg-[#000000] hover:scale-105 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(0,0,0,0.7)] transform hover:-translate-y-0.5 border-2 border-white">
                            Join Waitlist
                          </button>
                        </Link>
                      </div> */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center w-full mt-10 sm:hidden items-center gap-4">
            <Link href={"/join-waitlist"}>
              <button className="backdrop-blur-sm px-6 py-2.5 lg:px-8 lg:py-3.5 bg-[#333333] text-white font-semibold rounded-full transition-all duration-300 hover:bg-[#000000] hover:scale-105 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(0,0,0,0.7)] transform hover:-translate-y-0.5 border-2 border-white">
                Join Waitlist
              </button>
            </Link>
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
    </>
  );
};

export default HeroSection;
