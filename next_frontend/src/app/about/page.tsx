import React from "react";
import Link from "next/link";
import Image from "next/image";
import HomeHeader from "@/components/Homepage/Header";
import Footer from "@/components/Homepage/Footer";

const baseMetadata = {
  title: 'About DiscoverMinds.ai',
  description: 'Learn about our AI-powered people search platform',
};

const productionMetadata = {
  title: 'About DiscoverMinds.ai | AI-Powered People Search Platform',
  description: 'Discover the team and vision behind DiscoverMinds.ai - Revolutionizing how professionals connect through intelligent, AI-powered people search and networking.',
  keywords: [
    "AI people search",
    "professional networking",
    "talent discovery",
    "contact search",
    "business connections",
    "recruitment search",
    "professional search engine",
    "network intelligence",
    "Arya AI search"
  ],
  openGraph: {
    title: "About DiscoverMinds.ai | AI-Powered People Search Platform",
    description: "Meet the team behind Arya AI and learn how we're transforming professional networking with intelligent search technology.",
    url: "https://discoverminds.ai/about",
    siteName: "DiscoverMinds.ai",
    images: [
      {
        url: "/Logo.png",
        width: 512,
        height: 512,
        alt: "DiscoverMinds.ai - Better People Search, Personal Connections"
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About DiscoverMinds.ai | AI-Powered People Search',
    description: 'Transforming how professionals connect through intelligent search technology.',
    images: ['/Logo.png'],
  },
  alternates: {
    canonical: 'https://discoverminds.ai/about',
  },
};

export const metadata = process.env.NODE_ENV === 'production' ? productionMetadata : baseMetadata;

export default function AboutPage() {
  return (
    <>
      <HomeHeader />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl md:text-8xl font-bold text-gray-900 mb-8 leading-tight">
              DiscoverMinds.ai
            </h1>
            <div className="max-w-3xl mx-auto">
              <p className="text-xl md:text-2xl text-gray-600 leading-relaxed mb-8">
                We're building for a world where finding the right people shouldn't feel like searching for a needle in a haystack.
              </p>
              <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                What separates great companies from good ones is how precisely they can connect with the right people at the right time.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-12 text-center">
              Meet Arya.
            </h2>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-6">
                  Arya isn't just another search tool. She's your relentless tracker—sharp, adaptive, and always learning.
                </p>
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-6">
                  Inspired by precision and loyalty, Arya remembers every search, learns from every interaction, and gets better at finding exactly who you need.
                </p>
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                  No filters. No complexity. Just results.
                </p>
              </div>
              <div className="text-center">
                <div className="text-8xl mb-4">⚔️</div>
                <p className="text-lg text-gray-500 italic">
                  "A search agent that evolves with you"
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4 text-center">
              Our Team
            </h2>
            <div className="text-center mb-16">
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                We're a team of builders and dreamers who believe that finding the right people should be as natural as having a conversation. 
                We've worked across AI, search, and people analytics at different companies, and we're passionate about making human connections more meaningful and precise.
              </p>
            </div>

            {/* Team Members */}
            <div className="grid md:grid-cols-2 gap-12 mb-16">
              <div className="text-center">
                <div className="w-32 h-32 rounded-full mx-auto mb-6 overflow-hidden">
                  <Image
                    src="/sanyam-profile.jpg"
                    alt="Sanyam Jain"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Sanyam Jain</h3>
                <p className="text-gray-600 mb-4">Co-Founder</p>
                <p className="text-gray-500 text-sm mb-4">
                  AI/ML + Backend Engineer with experience at YC-backed startups (Writesonic, Unify, Buildspace), Nokia, EY, and Thena AI. Specializes in LLMs, RAG systems, and agentic AI workflows.
                </p>
                <a 
                  href="https://www.linkedin.com/in/sanyamjain2002/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                  </svg>
                  LinkedIn
                </a>
              </div>
              
              <div className="text-center">
                <div className="w-32 h-32 rounded-full mx-auto mb-6 overflow-hidden">
                  <Image
                    src="/ashish-profile.jpg"
                    alt="Ashish Gupta"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ashish Gupta</h3>
                <p className="text-gray-600 mb-4">Co-Founder</p>
                <p className="text-gray-500 text-sm mb-4">
                  Software Engineer & Researcher with expertise in full-stack development, QA automation, and AI research. Published researcher with 3+ papers on AI and emerging technologies.
                </p>
                <a 
                  href="https://www.linkedin.com/in/ashish-gupta-2002/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                  </svg>
                  LinkedIn
                </a>
              </div>
            </div>

            {/* Vision */}
            <div className="text-center bg-gray-50 rounded-2xl p-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-6">Our Vision</h3>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
                We envision a world where every professional interaction starts with the right connection. 
                Where finding talent, partners, or opportunities is as simple as describing what you need.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-8">
              Experience the Future of People Search
            </h2>
            <p className="text-xl text-indigo-100 mb-12 max-w-2xl mx-auto">
              Join professionals who trust DiscoverMinds.ai to find the right connections, faster and smarter.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/user-auth" className="px-8 py-4 bg-white text-indigo-700 font-semibold rounded-full text-lg hover:bg-gray-100 transition-colors">
                Get Started Free
              </Link>
              <Link href="/#features" className="px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-full text-lg hover:bg-white/10 transition-colors">
                Learn More
              </Link>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
