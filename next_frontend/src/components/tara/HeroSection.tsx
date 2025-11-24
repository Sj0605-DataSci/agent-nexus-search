import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Shield,
  CheckCircle,
  Zap,
  TrendingUp,
  FileText,
  PieChart,
  MessageCircle,
} from "lucide-react";

// Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: "READY" | "COMING";
  statusColor: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  status,
  statusColor,
}) => (
  <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-300">
    <div className="flex items-center gap-3 flex-1">
      <div
        className={`w-10 h-10 ${statusColor} rounded-lg flex items-center justify-center flex-shrink-0 text-sm`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-xs text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 flex-shrink-0 ${
        status === "READY" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {status}
    </span>
  </div>
);

const FloatingIcon = ({ icon, className }: { icon: React.ReactNode; className: string }) => (
  <div
    className={`absolute ${className} w-16 h-16 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/50`}
  >
    {icon}
  </div>
);

const HeroSection = () => {
  const icons = [
    {
      icon: <TrendingUp className="w-8 h-8 text-blue-500" />,
      className: "top-[15%] left-[10%] animate-float",
    },
    {
      icon: <FileText className="w-8 h-8 text-green-500" />,
      className: "top-[30%] right-[12%] animate-float-delay-1",
    },
    {
      icon: <PieChart className="w-8 h-8 text-indigo-500" />,
      className: "bottom-[20%] left-[18%] animate-float-delay-2",
    },
    {
      icon: <MessageCircle className="w-8 h-8 text-purple-500" />,
      className: "bottom-[15%] right-[8%] animate-float-delay-3",
    },
  ];

  return (
    <section id="hero" className="bg-white text-gray-800 py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,113,220,0.15),transparent_60%)]" />

      {/* Floating Icons */}
      <div className="hidden lg:block">
        {icons.map((item, index) => (
          <FloatingIcon key={index} icon={item.icon} className={item.className} />
        ))}
      </div>

      <div className="mx-auto max-w-7xl  pt-22  px-4 sm:px-6 lg:px-8 relative">
        <div className="items-center">
          {/* Left Content */}
          <div className="text-center flex flex-col items-center max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
              Always-On Finance Copilot
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
              <span className="text-gray-900">Your Conversational </span>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Accounting Copilot
              </span>
              <span className="text-gray-900 pl-2">for TallyPrime</span>
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-lg">
              Connect to Tally, sync your data, and access business insights 24/7 via WhatsApp. Just
              as the star guides travelers, Tara guides your business.
            </p>

            <Link href="/contact">
              <button className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 inline-flex items-center gap-2">
                Get Started for Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>

            <div className="mt-10 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">
                Trusted by accountants, SMEs, and enterprises
              </p>
              <div className="flex flex-wrap gap-6 justify-center">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700">Multi-Company</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-700">Enterprise Ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-700">24/7 WhatsApp</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Features Card */}
          {/* <div className="flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-md">
              <div className="bg-gradient-to-b from-blue-50/50 to-white rounded-2xl shadow-xl border border-blue-100/50 overflow-hidden backdrop-blur-sm">
                <div className="px-6 py-4">
                  <h3 className="text-lg font-bold text-gray-900">What Tara Can Do</h3>
                </div>

                <div className="px-6 pb-6 space-y-2.5">
                  <FeatureCard
                    icon={<MessageSquare className="w-5 h-5 text-green-500" />}
                    title="WhatsApp Chat"
                    description="Ask prices • Check stock • Get help"
                    status="READY"
                    statusColor="bg-green-50"
                  />

                  <FeatureCard
                    icon={<span className="text-lg">📄</span>}
                    title="Photo to Invoice"
                    description="Take photo • Auto-fill • Save to Tally"
                    status="COMING"
                    statusColor="bg-blue-50"
                  />

                  <FeatureCard
                    icon={<span className="text-base font-bold text-purple-500">T</span>}
                    title="Connect to Tally"
                    description="Live data • No manual work"
                    status="COMING"
                    statusColor="bg-purple-50"
                  />

                  <FeatureCard
                    icon={<CheckCircle className="w-5 h-5 text-orange-500" />}
                    title="Smart Reports"
                    description="Daily sales • Due payments • Stock alerts"
                    status="COMING"
                    statusColor="bg-orange-50"
                  />
                </div>

                <div className="mx-6 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                <div className="px-6 py-6">
                  <h4 className="text-base font-bold text-gray-900 mb-4">
                    Why Business Owners Love Tara
                  </h4>

                  <div className="mb-5">
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-4xl font-bold text-gray-900">80%</span>
                      <span className="text-xs text-gray-500 font-medium">Time Saved</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-1000"
                        style={{ width: "80%" }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Less Typing</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Quick Answers</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Easy Reports</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
