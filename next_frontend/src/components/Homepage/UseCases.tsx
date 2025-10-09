"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal, Stagger } from "../common/Animations";

const UseCases: React.FC = () => {
  const professionalUseCases = [
    {
      title: "Recruitment & Hiring",
      description:
        "Find senior AI engineers in Europe with public repos — in my network and globally — and generate a verified profile report for HR.",
      icon: "👥",
      aryaQuote:
        "I'll hunt through every corner of the tech world to find your perfect candidates.",
    },
    {
      title: "Sales Prospecting",
      description:
        "List CFOs in US healthcare companies I've emailed before, with company size and recent funding rounds.",
      icon: "💼",
      aryaQuote: "No lead escapes my memory. I remember every contact, every conversation.",
    },
    {
      title: "Investor Discovery",
      description:
        "Discover early-stage climate-tech founders who raised in the past 6 months, with links to their announcements.",
      icon: "💰",
      aryaQuote: "I track the money trails and spot opportunities before they're obvious.",
    },
    {
      title: "Event Planning",
      description:
        "Pull a list of fintech professionals I know in Singapore for an upcoming meetup.",
      icon: "🎯",
      aryaQuote: "Your network is my map. I know exactly who you need, where they are.",
    },
  ];

  const personalUseCases = [
    {
      title: "Background Verification",
      description:
        "Generate a verified background report on a potential match — education, work history, social presence, mutual references.",
      icon: "🔍",
      aryaQuote: "Trust, but verify. I'll uncover the truth behind any profile.",
    },
    {
      title: "Safety Checks",
      description:
        "Verify someone's identity, check online presence, and flag inconsistencies before meeting in person.",
      icon: "🛡️",
      aryaQuote: "Your safety is my priority. I see what others miss.",
    },
    {
      title: "Mutual Connections",
      description:
        "I met 'Arjun Mehta' at a party — find verified details from mutual contacts and global sources.",
      icon: "🤝",
      aryaQuote: "Every face has a story. I'll connect the dots for you.",
    },
    {
      title: "Service Provider Vetting",
      description:
        "Background check on a wedding photographer — confirm credentials, reviews, and portfolio.",
      icon: "📸",
      aryaQuote: "No detail too small. I ensure you're working with the best.",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
      },
    },
  };

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <Reveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600">
              Arya at Work
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              From professional hunting to personal protection — see how Arya adapts to your needs
            </p>
          </div>
        </Reveal>

        <div className="mb-20">
          <Reveal delay={0.2}>
            <div className="flex items-center justify-center mb-12">
              <div className="inline-block px-6 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                Professional Hunting
              </div>
            </div>
          </Reveal>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid gap-8 md:grid-cols-2 lg:grid-cols-2"
          >
            {professionalUseCases.map((useCase, index) => (
              <motion.div key={index} variants={itemVariants} className="group relative">
                <div className="h-full p-0.5 rounded-2xl bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200">
                  <div className="h-full p-8 bg-white rounded-[14px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-2xl">
                        {useCase.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2 text-gray-900">{useCase.title}</h3>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-4 leading-relaxed">"{useCase.description}"</p>

                    <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border-l-4 border-blue-400">
                      <p className="text-sm text-gray-700 italic font-medium">
                        💭 Arya: "{useCase.aryaQuote}"
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div>
          <Reveal delay={0.4}>
            <div className="flex items-center justify-center mb-12">
              <div className="inline-block px-6 py-2 rounded-full bg-purple-100 text-purple-800 text-sm font-semibold">
                Personal Protection
              </div>
            </div>
          </Reveal>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid gap-8 md:grid-cols-2 lg:grid-cols-2"
          >
            {personalUseCases.map((useCase, index) => (
              <motion.div key={index} variants={itemVariants} className="group relative">
                <div className="h-full p-0.5 rounded-2xl bg-gradient-to-br from-purple-200 via-pink-200 to-red-200">
                  <div className="h-full p-8 bg-white rounded-[14px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center text-2xl">
                        {useCase.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2 text-gray-900">{useCase.title}</h3>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-4 leading-relaxed">"{useCase.description}"</p>

                    <div className="p-4 bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg border-l-4 border-purple-400">
                      <p className="text-sm text-gray-700 italic font-medium">
                        💭 Arya: "{useCase.aryaQuote}"
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <Reveal delay={0.6}>
          <div className="text-center mt-20">
            <div className="inline-block p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl text-white">
              <h3 className="text-2xl font-bold mb-4">Ready to discover your network?</h3>
              <p className="text-gray-300 mb-6 max-w-md">
                Get started today and unlock hidden opportunities through warm introductions.
              </p>
              <Link href="/user-auth" prefetch={false}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 bg-white text-gray-900 font-semibold rounded-full hover:bg-gray-100 transition-colors"
                >
                  Get Started
                </motion.button>
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default UseCases;
