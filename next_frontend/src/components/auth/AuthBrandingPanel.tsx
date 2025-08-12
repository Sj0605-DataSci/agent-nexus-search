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
                Intelligent Career Matching
              </h3>
              <p className="text-gray-300">
                "DiscoverMinds connected me with a role that perfectly matched my skills and
                ambitions. The AI-powered recommendations were spot-on!"
              </p>
            </div>
            <div className="mt-4">
              <p className="font-semibold">Alex Johnson</p>
              <p className="text-sm text-gray-400">Senior Data Scientist at Innovate Inc.</p>
            </div>
          </Card>
          <Card customClass="p-6 bg-gray-800 text-white rounded-lg shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-3 text-indigo-400">
                Seamless Application Process
              </h3>
              <p className="text-gray-300">
                "The platform made it incredibly easy to apply for multiple jobs and track my
                progress. A huge time-saver for any serious job seeker."
              </p>
            </div>
            <div className="mt-4">
              <p className="font-semibold">Samantha Lee</p>
              <p className="text-sm text-gray-400">Product Manager at TechCorp</p>
            </div>
          </Card>
          <Card customClass="p-6 bg-gray-800 text-white rounded-lg shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-3 text-indigo-400">Unlock Your Potential</h3>
              <p className="text-gray-300">
                "From resume tips to interview prep, the resources available helped me land my dream
                job faster than I ever thought possible."
              </p>
            </div>
            <div className="mt-4">
              <p className="font-semibold">Michael Chen</p>
              <p className="text-sm text-gray-400">Software Engineer at NextGen Solutions</p>
            </div>
          </Card>
        </CardSwap>
      </div>
    </div>
  );
};

export default React.memo(AuthBrandingPanel);
