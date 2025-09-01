import React from "react";
import CardSwap, { Card } from "@/components/auth/CardSwap";
import {
  FaNetworkWired,
  FaHandshake,
  FaShieldAlt,
  FaSearch,
  FaChartLine,
  FaUsers,
  FaCrown,
  FaFileExport,
  FaInfinity,
  FaEnvelope,
} from "react-icons/fa";

const AuthBrandingPanel = () => {
  return (
    <div
      className="hidden md:flex flex-col justify-center items-center relative overflow-hidden"
      style={{ backgroundColor: "#085157" }}
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>

      <div style={{ height: "460px", width: "80%", position: "relative" }}>
        <CardSwap cardDistance={50} verticalDistance={60} delay={5000} pauseOnHover={true}>
          <Card customClass="p-6 bg-white/20 backdrop-blur-xl text-white rounded-xl shadow-lg border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center mb-3">
                <div className="bg-teal-600/10 p-2 rounded-lg mr-3">
                  <FaNetworkWired className="text-teal-300 text-xl" />
                </div>
                <h3 className="text-xl font-bold text-teal-200">Network Hub</h3>
              </div>
              <p className="text-gray-200">
                "Finally found a way to see all my connections in one place. Last week I discovered
                a potential investor through someone I met at a conference years ago."
              </p>
            </div>
            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="font-semibold">Michael C.</p>
              <p className="text-sm text-teal-200/70">Startup Founder</p>
            </div>
          </Card>

          <Card customClass="p-6 bg-white/20 backdrop-blur-xl text-white rounded-xl shadow-lg border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center mb-3">
                <div className="bg-teal-600/10 p-2 rounded-lg mr-3">
                  <FaHandshake className="text-teal-300 text-xl" />
                </div>
                <h3 className="text-xl font-bold text-teal-200">Warm Intros</h3>
              </div>
              <p className="text-gray-200">
                "Cold emails were getting me nowhere. Getting introduced by mutual connections has
                completely changed my success rate. Wish I'd had this years ago."
              </p>
            </div>
            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="font-semibold">Priya S.</p>
              <p className="text-sm text-teal-200/70">Business Development</p>
            </div>
          </Card>

          <Card customClass="p-6 bg-white/20 backdrop-blur-xl text-white rounded-xl shadow-lg border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center mb-3">
                <div className="bg-teal-600/10 p-2 rounded-lg mr-3">
                  <FaSearch className="text-teal-300 text-xl" />
                </div>
                <h3 className="text-xl font-bold text-teal-200">Smart Search</h3>
              </div>
              <p className="text-gray-200">
                "Just type what you're looking for and it works. No complicated filters or boolean
                searches. Found exactly who I needed for my project in minutes."
              </p>
            </div>
            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="font-semibold">Sarah J.</p>
              <p className="text-sm text-teal-200/70">Talent Acquisition</p>
            </div>
          </Card>
        </CardSwap>
      </div>

      <div className="relative z-10 mt-8 md:mt-30 grid grid-cols-3 gap-4 w-4/5">
        <div className="text-center px-3 py-3 border border-teal-300/20 rounded-lg bg-teal-900/10 hover:bg-teal-900/20 transition-all hover:scale-105 shadow-sm">
          <div className="flex justify-center mb-1">
            <div className="bg-teal-600/20 p-2 rounded-full">
              <FaChartLine className="text-teal-300 text-lg" />
            </div>
          </div>
          <p className="text-teal-200 font-bold text-xl">30%+</p>
          <p className="text-sm text-teal-200/80 font-medium">Intro Success Rate</p>
          <p className="text-xs text-teal-200/60 mt-1">3x industry average</p>
        </div>

        <div className="text-center px-3 py-3 border border-teal-300/20 rounded-lg bg-teal-900/10 hover:bg-teal-900/20 transition-all hover:scale-105 shadow-sm">
          <div className="flex justify-center mb-1">
            <div className="bg-teal-600/20 p-2 rounded-full">
              <FaSearch className="text-teal-300 text-lg" />
            </div>
          </div>
          <p className="text-teal-200 font-bold text-xl">Easy Finding</p>
          <p className="text-sm text-teal-200/80 font-medium">Access to DiscoverMinds Search</p>
          <p className="text-xs text-teal-200/60 mt-1">Connect with relevant professionals</p>
        </div>

        <div className="text-center px-3 py-3 border border-teal-300/30 rounded-lg bg-teal-900/20 shadow-md hover:shadow-lg transition-all hover:scale-105">
          <div className="flex justify-center mb-1">
            <div className="bg-teal-600/30 p-2 rounded-full">
              <FaCrown className="text-teal-300 text-lg" />
            </div>
          </div>
          <p className="text-teal-300 font-bold text-lg">Pro Plan</p>
          <div className="my-2 h-px bg-teal-300/30 mx-1"></div>
          <div className="flex items-center justify-center gap-1 mb-1">
            <FaInfinity className="text-teal-300 text-xs" />
            <p className="text-teal-100 text-xs">Unlimited Searches</p>
          </div>
          <div className="flex items-center justify-center gap-1 mb-1">
            <FaEnvelope className="text-teal-300 text-xs" />
            <p className="text-teal-100 text-xs">Email forwarding</p>
          </div>
          <div className="flex items-center justify-center gap-1">
            <FaFileExport className="text-teal-300 text-xs" />
            <p className="text-teal-100 text-xs">CSV Export</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AuthBrandingPanel);
