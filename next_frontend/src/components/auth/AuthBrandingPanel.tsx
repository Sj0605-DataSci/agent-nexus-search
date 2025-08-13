import React from "react";
import CardSwap, { Card } from "@/components/auth/CardSwap";

const AuthBrandingPanel = () => {
  return (
    <div className="hidden md:flex flex-col justify-center items-center relative overflow-hidden bg-gray-900">
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div style={{ height: "500px", width: "80%", position: "relative" }}>
        <CardSwap cardDistance={50} verticalDistance={60} delay={5000} pauseOnHover={true}>
          <Card customClass="p-6 bg-gray-800 text-white rounded-lg shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-3 text-indigo-400">
                ⚔️ Arya's Precision Hunting
              </h3>
              <p className="text-gray-300">
                "Arya found the exact investor I needed in minutes, not months. She tracked down 
                contacts I didn't even know existed in my network."
              </p>
            </div>
            <div className="mt-4">
              <p className="font-semibold">Sarah Martinez</p>
              <p className="text-sm text-gray-400">Founder at ClimaTech Ventures</p>
            </div>
          </Card>
          <Card customClass="p-6 bg-gray-800 text-white rounded-lg shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-3 text-indigo-400">
                🧠 Learns Your Patterns
              </h3>
              <p className="text-gray-300">
                "Every search gets better. Arya remembers my preferences and adapts to how I work. 
                It's like having a personal tracker who never forgets."
              </p>
            </div>
            <div className="mt-4">
              <p className="font-semibold">David Kim</p>
              <p className="text-sm text-gray-400">Head of Talent at TechFlow</p>
            </div>
          </Card>
          <Card customClass="p-6 bg-gray-800 text-white rounded-lg shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-3 text-indigo-400">🎯 No Lead Escapes</h3>
              <p className="text-gray-300">
                "Arya verified a potential business partner's background across multiple platforms. 
                Sharp instincts and verified results—exactly what I needed."
              </p>
            </div>
            <div className="mt-4">
              <p className="font-semibold">Rachel Thompson</p>
              <p className="text-sm text-gray-400">CEO at Digital Dynamics</p>
            </div>
          </Card>
        </CardSwap>
      </div>
    </div>
  );
};

export default React.memo(AuthBrandingPanel);
