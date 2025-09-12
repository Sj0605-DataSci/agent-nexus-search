"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Homepage/Navbar";
import Footer from "@/components/Footer/Footer";
import SearchModes from "@/components/Homepage/SearchModes";
import UseCases from "@/components/Homepage/UseCases";
import dynamic from "next/dynamic";
import { ParallaxProvider } from "react-scroll-parallax";
import NewFooter from "@/components/Footer/NewFooter";

interface VideoPlayerProps {
  url: string;
  className?: string;
}

const VideoPlayer = dynamic<VideoPlayerProps>(() => import("@/components/Homepage/VideoPlayer"), {
  ssr: false,
});

export default function AryaPage() {
  return (
    <>
      <Navbar />
      <ParallaxProvider>
        <div className="min-h-screen bg-white">
          {/* Hero Section */}
          <section className="pt-32 pb-20 px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="text-8xl mb-8">⚔️</div>
              <h1 className="text-6xl md:text-8xl font-bold text-gray-900 mb-8 leading-tight">
                Meet Arya.
              </h1>
              <div className="max-w-3xl mx-auto">
                <p className="text-xl md:text-2xl text-gray-600 leading-relaxed mb-8">
                  Your relentless tracker for finding people.
                </p>
                <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                  Sharp, adaptive, and precise. No filters. No fluff. Just Arya, your personal
                  tracker who's always two steps ahead.
                </p>
              </div>
            </div>
          </section>

          {/* What Makes Arya Different */}
          <section className="py-20 px-4 bg-gray-50">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-16 text-center">
                Arya's Arsenal.
              </h2>

              <div className="space-y-16">
                <div className="text-center">
                  <div className="text-6xl mb-6">🎯</div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Knows Your Intent</h3>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Understands your query like I know the faces in Winterfell—no filters needed,
                    just tell me what you need.
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-6xl mb-6">🧠</div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Learns Every Time</h3>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Query once, I remember—sharpens with your feedback and evolves with every
                    search.
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-6xl mb-6">🌍</div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Travels Everywhere</h3>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    From your inbox to the globe—no lead is safe from me. Global reach meets
                    personal networks.
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-6xl mb-6">⚔️</div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Delivers the Truth</h3>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Verified results. No guesswork. Just the facts you need to act on.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Video Demo
          <section className="py-20 px-4 bg-gray-50">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-8">
                See Arya in Action.
              </h2>
              <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
                Watch how Arya transforms complex searches into simple conversations.
              </p>
              <VideoPlayer
                url="https://www.youtube.com/watch?v=_ZWwTcxK0FI"
                className="w-full max-w-4xl mx-auto"
              />
            </div>
          </section> */}

          {/* Search Modes */}
          <SearchModes />

          {/* Use Cases */}
          <UseCases />

          {/* How Arya Works */}
          <section className="py-20 px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-16 text-center">
                How Arya Hunts.
              </h2>

              <div className="grid md:grid-cols-3 gap-8 mb-16">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-xl mb-4 mx-auto">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Type Query</h3>
                  <p className="text-gray-600">Natural language, no complexity</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-xl mb-4 mx-auto">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Arya Interprets</h3>
                  <p className="text-gray-600">Understands your intent perfectly</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-xl mb-4 mx-auto">
                    3
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Get Results</h3>
                  <p className="text-gray-600">Verified insights, ready to act</p>
                </div>
              </div>

              <div className="text-center bg-gray-50 rounded-2xl p-12">
                <h3 className="text-3xl font-bold text-gray-900 mb-6">Average Hunt Time</h3>
                <div className="text-6xl font-bold text-gray-900 mb-4">&lt; 2 min</div>
                <p className="text-lg text-gray-600">
                  Arya never keeps you waiting. Sharp instincts, instant results.
                </p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 px-4 bg-gray-900 text-white">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-6xl font-bold mb-8">Ready to unleash Arya?</h2>
              <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
                Join professionals who trust Arya's precision hunting to find the right people,
                fast.
              </p>
              <Link href="/user-auth">
                <button className="px-8 py-4 bg-white text-gray-900 font-semibold rounded-full text-lg hover:bg-gray-100 transition-colors">
                  ⚔️ Unleash Arya
                </button>
              </Link>
            </div>
          </section>
        </div>
      </ParallaxProvider>
      <NewFooter />
    </>
  );
}
