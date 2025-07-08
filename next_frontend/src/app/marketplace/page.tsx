"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import ToggleSystemTheme from "@/components/ToggleSystemTheme";

import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/fastapi/client";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast, showInfoToast } from "@/utils/toastManager";

import { useAppDispatch, useAppSelector } from "@/store";
import withAuth from "@/hoc/withAuth";
import Link from "next/link";
import { getAgentAvatar } from "@/constant/getAgentAvatar";
import { loadAgents, selectAgentsStatus, selectHired, selectTemplates } from "@/store/agentsSlice";
import AgentMarketplaceCard from "@/components/AgentMarketplace/AgentMarketplaceCard";
import AgentMarketPlaceLoading from "@/components/AgentMarketplace/AgentMarketPlaceLoading";

const Marketplace = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const dispatch = useAppDispatch();
  const agentsStatus = useAppSelector(selectAgentsStatus);
  const hiredAgentsRaw = useAppSelector(selectHired);
  const hiredTemplateId = hiredAgentsRaw.map(h => h.template_id);

  const darkMode = useAppSelector(s => s.theme.dark);
  const templates = useAppSelector(selectTemplates);

  const marketplaceAgents = templates.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description ?? "—",
    category: t.category,
    avatar: getAgentAvatar(t.category),
    price: "$29/month",
    rating: 4.8,
    users: 1_200,
    features: [
      "Advanced AI capabilities",
      "24/7 availability",
      "Custom configuration",
      "Multi-language support",
    ],
  }));

  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (agentsStatus === "idle") dispatch(loadAgents());
  }, [user, agentsStatus, dispatch, router]);

  const isAgentHired = (id: string) => hiredTemplateId.includes(id);

  const handleHireAgent = async (agentId: string) => {
    if (!user) {
      showInfoToast("Auth required", "Please sign in to hire agents.");
      return;
    }

    const agent = marketplaceAgents.find(a => a.id === agentId);
    if (!agent) {
      showErrorToast("Agent not found.");
      return;
    }

    setLoading(agentId);
    try {
      await apiClient.hireAgent({
        template_id: agentId,
        user_id: user.id,
        name: agent.name,
        personality: "helpful",
        tone: "professional",
        response_length: "medium",
        expertise: "general",
      });
      toast({ title: "Agent hired", description: "The agent has been added to your team." });

      dispatch(loadAgents());
    } catch (err: any) {
      const msg = err.message ?? "Unknown error";
      toast({
        title: msg.includes("already") ? "Agent already hired" : "Error hiring agent",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleUnhireAgent = async (agentId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to manage agents.",
        variant: "destructive",
      });
      return;
    }
    setLoading(`unhire-${agentId}`);
    try {
      await apiClient.unhireAgentByTemplateId(agentId);
      toast({ title: "Agent removed", description: "The agent has been removed from your team." });
      dispatch(loadAgents());
    } catch (err: any) {
      toast({ title: "Error unhiring agent", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  if (agentsStatus === "idle" || !(templates?.length > 0) || marketplaceAgents.length === 0) {
    return <AgentMarketPlaceLoading />;
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-500 relative overflow-hidden ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"
      }`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl ${
            darkMode ? "bg-blue-600" : "bg-blue-400"
          }`}
        />
        <div
          className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 blur-3xl ${
            darkMode ? "bg-purple-600" : "bg-purple-400"
          }`}
        />
        <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl ${
            darkMode ? "bg-cyan-600" : "bg-cyan-400"
          }`}
        />
      </div>

      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        <div className="text-center relative">
          <div className="relative inline-block">
            <h1
              className={`text-5xl md:text-6xl font-bold mb-6 h-[100px] md:h-[80px] bg-gradient-to-r ${
                darkMode
                  ? "from-blue-400 via-purple-400 to-cyan-400"
                  : "from-blue-600 via-purple-600 to-cyan-600"
              } bg-clip-text text-transparent`}
            >
              AI Agent Marketplace
            </h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className={`text-3xl font-bold mb-4 ${darkMode ? "text-gray-100" : "text-gray-900"}`}
            >
              Choose Your Perfect AI Assistant
            </h2>
            <div
              className={`w-24 h-1 mx-auto rounded-full bg-gradient-to-r ${
                darkMode ? "from-blue-400 to-purple-400" : "from-blue-500 to-purple-500"
              }`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center relative">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="grid grid-cols-3 gap-8 h-full">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className={`border rounded-lg ${
                      darkMode ? "border-gray-700" : "border-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>

            {marketplaceAgents.map((agent, index) => (
              <div
                key={agent.id}
                className="relative"
                style={{
                  animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                }}
              >
                <div
                  className={`absolute -inset-4 bg-gradient-to-r ${
                    isAgentHired(agent.id)
                      ? "from-green-500/20 to-emerald-500/20"
                      : "from-blue-500/10 to-purple-500/10"
                  } rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />

                <AgentMarketplaceCard
                  // @ts-ignore
                  agent={agent}
                  isHired={isAgentHired(agent.id)}
                  onHireAgent={handleHireAgent}
                  onUnhireAgent={handleUnhireAgent}
                  loading={loading}
                  darkMode={darkMode}
                  showMobileWarning={false}
                  showTooltip={true}
                  scaleOnHover={1.05}
                  rotateAmplitude={8}
                  containerHeight="480px"
                  containerWidth="400px"
                  cardHeight="460px"
                  cardWidth="380px"
                />
              </div>
            ))}
          </div>

          {marketplaceAgents.length === 0 && (
            <div className="text-center py-16">
              <div className={`text-6xl mb-4 opacity-50`}>🤖</div>
              <h3
                className={`text-2xl font-semibold mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                No agents available
              </h3>
              <p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Check back later for new AI agents
              </p>
            </div>
          )}
        </div>
        {hiredTemplateId.length > 0 && (
          <div className="max-w-5xl mx-auto mt-16">
            <div
              className={`relative p-8 rounded-2xl border backdrop-blur-sm overflow-hidden ${
                darkMode
                  ? "bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-blue-900/30 border-blue-800/50"
                  : "bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-blue-50/80 border-blue-200/50"
              }`}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(59,130,246,0.5),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(147,51,234,0.5),transparent_50%)]" />
              </div>

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-3 rounded-full bg-gradient-to-r ${
                        darkMode ? "from-green-600 to-emerald-600" : "from-green-500 to-emerald-500"
                      }`}
                    >
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-1">Your AI Team</h3>
                      <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                        Managing your hired agents
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {hiredTemplateId.length}
                      </div>
                      <div className="text-xs opacity-70">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">24/7</div>
                      <div className="text-xs opacity-70">Available</div>
                    </div>
                  </div>
                </div>

                <p
                  className={`mb-6 text-lg leading-relaxed ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  You have successfully hired {hiredTemplateId.length} AI agent
                  {hiredTemplateId.length > 1 ? "s" : ""}. Configure their personalities, settings,
                  and workflows to maximize their effectiveness for your specific needs.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/agents"
                    className={`inline-flex items-center px-8 py-2 rounded-xl font-semibold text-white 
                    bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 
                    transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 
                    focus-visible:ring-blue-500 ${darkMode ? "focus-visible:ring-offset-gray-900" : ""}`}
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                      />
                    </svg>
                    Configure Agents
                  </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-opacity-20 border-gray-500">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-500">100%</div>
                    <div className="text-xs opacity-70">Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-500">5/10</div>
                    <div className="text-xs opacity-70">Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-500">&lt;1s</div>
                    <div className="text-xs opacity-70">Response</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-cyan-500">24/7</div>
                    <div className="text-xs opacity-70">Support</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-20 pb-8">
          <div
            className={`inline-flex items-center px-6 py-3 rounded-full backdrop-blur-sm border ${
              darkMode
                ? "bg-gray-800/30 border-gray-700/50 text-gray-300"
                : "bg-white/30 border-gray-300/50 text-gray-700"
            }`}
          >
            <span className="text-sm">Need a custom agent?</span>
            <button className="ml-2 text-blue-500 hover:text-blue-600 font-medium underline">
              Contact us
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default withAuth(Marketplace);
