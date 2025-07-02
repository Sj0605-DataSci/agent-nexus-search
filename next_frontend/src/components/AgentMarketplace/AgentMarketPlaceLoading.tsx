"use client";

import { useAppSelector } from "@/store";

function AgentMarketPlaceLoading() {
  const darkMode = useAppSelector(s => s.theme.dark);

  return (
    <div
      className={`min-h-screen transition-colors duration-500 relative overflow-hidden ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"
      }`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl animate-pulse ${
            darkMode ? "bg-blue-600" : "bg-blue-400"
          }`}
        />
        <div
          className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 blur-3xl animate-pulse ${
            darkMode ? "bg-purple-600" : "bg-purple-400"
          }`}
          style={{ animationDelay: "1s" }}
        />
        <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse ${
            darkMode ? "bg-cyan-600" : "bg-cyan-400"
          }`}
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="container mx-auto px-4 pt-24 pb-16 text-center relative z-10">
        <div className="max-w-2xl mx-auto">
          <div className="mb-12">
            <h1
              className={`text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r ${
                darkMode
                  ? "from-blue-400 via-purple-400 to-cyan-400"
                  : "from-blue-600 via-purple-600 to-cyan-600"
              } bg-clip-text text-transparent`}
            >
              AI Agent Marketplace
            </h1>
            <p className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Preparing your personalized agent selection
            </p>
          </div>

          <div
            className={`relative p-8 rounded-2xl backdrop-blur-sm border ${
              darkMode ? "bg-gray-800/30 border-gray-700/50" : "bg-white/30 border-gray-300/50"
            }`}
          >
            <div className="relative mb-8">
              <div
                className={`w-24 h-24 mx-auto rounded-full border-4 ${
                  darkMode ? "border-gray-700" : "border-gray-300"
                } border-t-transparent animate-spin`}
              />

              <div
                className={`absolute top-2 left-1/2 transform -translate-x-1/2 w-20 h-20 rounded-full border-4 ${
                  darkMode ? "border-gray-600" : "border-gray-400"
                } border-b-transparent animate-spin`}
                style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
              />

              <div
                className={`absolute top-4 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-r ${
                  darkMode ? "from-blue-500 to-purple-500" : "from-blue-600 to-purple-600"
                } animate-pulse flex items-center justify-center`}
              >
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Loading Marketplace</h3>
              <p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Discovering the perfect AI agents for you...
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                { text: "Fetching available agents", delay: "0s" },
                { text: "Analyzing your preferences", delay: "1s" },
                { text: "Preparing recommendations", delay: "2s" },
              ].map((step, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-center space-x-3 opacity-0 animate-pulse`}
                  style={{ animationDelay: step.delay }}
                >
                  <div
                    className={`w-2 h-2 rounded-full bg-gradient-to-r ${
                      darkMode ? "from-blue-400 to-purple-400" : "from-blue-500 to-purple-500"
                    }`}
                  />
                  <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "AI Agents", value: "50+" },
                { label: "Categories", value: "6" },
                { label: "Success Rate", value: "99%" },
              ].map((stat, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg backdrop-blur-sm ${
                    darkMode ? "bg-gray-700/30" : "bg-white/30"
                  }`}
                  style={{
                    animation: `fadeInUp 0.6s ease-out ${index * 0.2}s both`,
                  }}
                >
                  <div
                    className={`text-lg font-bold bg-gradient-to-r ${
                      darkMode ? "from-blue-400 to-purple-400" : "from-blue-600 to-purple-600"
                    } bg-clip-text text-transparent`}
                  >
                    {stat.value}
                  </div>
                  <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map(index => (
                <div
                  key={index}
                  className={`p-4 rounded-lg backdrop-blur-sm border ${
                    darkMode
                      ? "bg-gray-700/20 border-gray-600/30"
                      : "bg-white/20 border-gray-300/30"
                  } animate-pulse`}
                  style={{ animationDelay: `${index * 0.3}s` }}
                >
                  <div
                    className={`w-12 h-12 rounded-full mb-3 ${
                      darkMode ? "bg-gray-600" : "bg-gray-300"
                    }`}
                  />

                  <div className={`h-4 rounded mb-2 ${darkMode ? "bg-gray-600" : "bg-gray-300"}`} />

                  <div className={`h-3 rounded mb-2 ${darkMode ? "bg-gray-700" : "bg-gray-200"}`} />
                  <div
                    className={`h-3 rounded w-3/4 ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <div
              className={`inline-flex items-center px-4 py-2 rounded-full backdrop-blur-sm border ${
                darkMode
                  ? "bg-blue-900/20 border-blue-800/50 text-blue-200"
                  : "bg-blue-50/80 border-blue-200/50 text-blue-700"
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">
                💡 Tip: Each agent specializes in different tasks to maximize efficiency
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default AgentMarketPlaceLoading;
