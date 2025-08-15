"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Reveal } from "../common/Animations";

const SearchModes: React.FC = () => {
  const [activeMode, setActiveMode] = useState(0);

  const searchModes = [
    {
      title: "Name-Based Hunt",
      subtitle: "When you know exactly who you're tracking",
      description: "Arya excels at finding specific individuals with precision and speed.",
      example: '"Search for Dr. Aisha Rahman in fintech and pull latest verified info."',
      aryaResponse:
        "Found her. Dr. Rahman just joined Goldman Sachs as Head of Digital Assets. Here's her verified contact info and recent LinkedIn activity.",
      features: [
        "Quick profile & contact info",
        "Comprehensive background reports",
        "Real-time verification",
      ],
      icon: "🎯",
      color: "from-blue-500 to-indigo-600",
    },
    {
      title: "Intent-Based Tracking",
      subtitle: "When you know the type of person you need",
      description: "Arya understands natural language and finds people based on your intent.",
      example: '"Find fintech investors I\'ve emailed before who are based in Singapore."',
      aryaResponse:
        "I've identified 12 fintech investors from your email history in Singapore. Here are the top 5 with recent funding activity.",
      features: [
        "Natural language understanding",
        "Context-aware filtering",
        "Learns from feedback",
      ],
      icon: "🧠",
      color: "from-purple-500 to-pink-600",
    },
    {
      title: "Global & Personal Scope",
      subtitle: "Search everywhere or stay close to home",
      description: "Arya can hunt across the global web or focus on your personal networks.",
      example: '"Search my LinkedIn, Gmail, and Slack for active healthtech professionals."',
      aryaResponse:
        "Scanning your networks... Found 47 healthtech professionals across your platforms. 8 are highly active this month.",
      features: ["Global verified profiles", "Personal network search", "Hybrid mode available"],
      icon: "🌍",
      color: "from-green-500 to-teal-600",
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <Reveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600">
              How Arya Hunts
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Three ways Arya adapts to find exactly who you need
            </p>
          </div>
        </Reveal>

        {/* Mode Selector */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-gray-100 rounded-full p-1">
            {searchModes.map((mode, index) => (
              <button
                key={index}
                onClick={() => setActiveMode(index)}
                className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeMode === index
                    ? "bg-white text-gray-900 shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {mode.icon} {mode.title}
              </button>
            ))}
          </div>
        </div>

        {/* Active Mode Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-6xl mx-auto"
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Side - Content */}
              <div>
                <div className="mb-6">
                  <div
                    className={`inline-block p-3 rounded-2xl bg-gradient-to-r ${searchModes[activeMode].color} text-white text-3xl mb-4`}
                  >
                    {searchModes[activeMode].icon}
                  </div>
                  <h3 className="text-3xl font-bold mb-2 text-gray-900">
                    {searchModes[activeMode].title}
                  </h3>
                  <p className="text-lg text-gray-600 mb-4">{searchModes[activeMode].subtitle}</p>
                  <p className="text-gray-700 leading-relaxed">
                    {searchModes[activeMode].description}
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  {searchModes[activeMode].features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div
                        className={`w-2 h-2 rounded-full bg-gradient-to-r ${searchModes[activeMode].color}`}
                      />
                      <span className="text-gray-700">{feature}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right Side - Example */}
              <div className="space-y-6">
                {/* User Query */}
                <div className="bg-gray-50 rounded-2xl p-6 border-l-4 border-gray-300">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-bold">
                      You
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium">{searchModes[activeMode].example}</p>
                    </div>
                  </div>
                </div>

                {/* Arya Response */}
                <div
                  className={`bg-gradient-to-r ${searchModes[activeMode].color} rounded-2xl p-6 text-white`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                      ⚔️
                    </div>
                    <div className="flex-1">
                      <p className="font-medium mb-2">Arya responds:</p>
                      <p className="text-white/90">{searchModes[activeMode].aryaResponse}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-2xl font-bold text-gray-900">&lt; 2 min</div>
                    <div className="text-sm text-gray-600">Average Hunt Time</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-2xl font-bold text-gray-900">95%</div>
                    <div className="text-sm text-gray-600">Accuracy Rate</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-2xl font-bold text-gray-900">∞</div>
                    <div className="text-sm text-gray-600">Learning Curve</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* How It Works Section */}
        <Reveal delay={0.4}>
          <div className="mt-24 text-center">
            <h3 className="text-3xl font-bold mb-8 text-gray-900">The Arya Process</h3>
            <div className="grid md:grid-cols-6 gap-4 max-w-4xl mx-auto">
              {[
                { step: "1", action: "Type Query", desc: "Natural language" },
                { step: "2", action: "Arya Interprets", desc: "Understands intent" },
                { step: "3", action: "Select Scope", desc: "Global or personal" },
                { step: "4", action: "Choose Depth", desc: "Basic or deep report" },
                { step: "5", action: "Get Results", desc: "Verified insights" },
                { step: "6", action: "Give Feedback", desc: "Arya learns" },
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-800 to-gray-600 text-white rounded-full flex items-center justify-center font-bold mb-3 mx-auto">
                    {item.step}
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">{item.action}</h4>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default SearchModes;
