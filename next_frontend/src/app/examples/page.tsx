import React from "react";
import Link from "next/link";
import HomeHeader from "@/components/Homepage/Header";
import Footer from "@/components/Footer/Footer";
import NewFooter from "@/components/Footer/NewFooter";

export const metadata = {
  title: "Examples | DiscoverMinds.ai",
  description: "See how Arya finds the right people with precision and speed",
};

export default function ExamplesPage() {
  return (
    <>
      <HomeHeader />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl md:text-8xl font-bold text-gray-900 mb-8 leading-tight">
              Arya in Action.
            </h1>
            <div className="max-w-3xl mx-auto">
              <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                See how professionals use Arya to find exactly who they need, when they need them.
              </p>
            </div>
          </div>
        </section>

        {/* Search Examples */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-16 text-center">
              Real Searches.
            </h2>

            <div className="space-y-16">
              {/* Example 1 */}
              <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="text-sm text-gray-500 mb-2">RECRUITMENT</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      "Find senior React developers in San Francisco who've worked at startups"
                    </h3>
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <p className="text-gray-600 italic">
                        "Found 23 senior React developers in SF with startup experience. Here are
                        the top 5 matches based on recent activity and skill relevance..."
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">⚡ Results in 1.2 minutes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-6xl mb-4">👨‍💻</div>
                    <div className="text-lg font-semibold text-gray-700">23 matches found</div>
                    <div className="text-sm text-gray-500">5 highly relevant</div>
                  </div>
                </div>
              </div>

              {/* Example 2 */}
              <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="order-2 md:order-1 text-center">
                    <div className="text-6xl mb-4">🤝</div>
                    <div className="text-lg font-semibold text-gray-700">
                      12 investors identified
                    </div>
                    <div className="text-sm text-gray-500">3 warm introductions</div>
                  </div>
                  <div className="order-1 md:order-2">
                    <div className="text-sm text-gray-500 mb-2">FUNDRAISING</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      "Connect me with VCs who invest in AI/ML startups, Series A stage"
                    </h3>
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <p className="text-gray-600 italic">
                        "I've identified 12 VCs specializing in AI/ML Series A. 3 have mutual
                        connections in your network for warm introductions..."
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">⚡ Results in 0.8 minutes</div>
                  </div>
                </div>
              </div>

              {/* Example 3 */}
              <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="text-sm text-gray-500 mb-2">BUSINESS DEVELOPMENT</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      "Who are the decision makers at Fortune 500 companies using Salesforce?"
                    </h3>
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <p className="text-gray-600 italic">
                        "Located 47 C-level and VP-level decision makers at Fortune 500 companies
                        currently using Salesforce. Here's their contact hierarchy..."
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">⚡ Results in 1.5 minutes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎯</div>
                    <div className="text-lg font-semibold text-gray-700">47 decision makers</div>
                    <div className="text-sm text-gray-500">Fortune 500 companies</div>
                  </div>
                </div>
              </div>

              {/* Example 4 */}
              <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="order-2 md:order-1 text-center">
                    <div className="text-6xl mb-4">🌟</div>
                    <div className="text-lg font-semibold text-gray-700">8 thought leaders</div>
                    <div className="text-sm text-gray-500">Available for speaking</div>
                  </div>
                  <div className="order-1 md:order-2">
                    <div className="text-sm text-gray-500 mb-2">EVENT PLANNING</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      "Find cybersecurity experts who speak at conferences and are available for our
                      event"
                    </h3>
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <p className="text-gray-600 italic">
                        "Found 8 cybersecurity thought leaders with speaking experience. I've
                        checked their availability and speaking fees..."
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">⚡ Results in 2.1 minutes</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 px-4 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold mb-16 text-center">
              Arya's Track Record.
            </h2>

            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-5xl font-bold mb-4">2.3M+</div>
                <div className="text-xl text-gray-300">People Tracked</div>
              </div>

              <div>
                <div className="text-5xl font-bold mb-4">&lt; 2 min</div>
                <div className="text-xl text-gray-300">Average Hunt Time</div>
              </div>

              <div>
                <div className="text-5xl font-bold mb-4">94%</div>
                <div className="text-xl text-gray-300">Accuracy Rate</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-8">
              Your turn to hunt.
            </h2>
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Join thousands of professionals who trust Arya to find the right people with precision
              and speed.
            </p>
            <Link href="/user-auth">
              <button className="px-8 py-4 bg-gray-900 text-white font-semibold rounded-full text-lg hover:bg-gray-800 transition-colors">
                ⚔️ Start Hunting
              </button>
            </Link>
          </div>
        </section>
      </div>
      <NewFooter />
    </>
  );
}
