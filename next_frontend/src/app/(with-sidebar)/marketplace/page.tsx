"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/fastapi/client";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/utils/toastManager";
import { useAppDispatch, useAppSelector } from "@/store";
import Link from "next/link";
import { getAgentAvatar } from "@/constant/getAgentAvatar";
import { loadAgents, selectHired } from "@/store/agentsSlice";
import AgentMarketplaceCard from "@/components/AgentMarketplace/AgentMarketplaceCard";
import AgentMarketPlaceLoading from "@/components/AgentMarketplace/AgentMarketPlaceLoading";
import { useQuery } from "@tanstack/react-query";
import { AgentTemplate } from "@/integrations/fastapi/types";

interface MarketplaceAgent {
  id: string;
  name: string;
  agentImageUrl: string[];
  description: string;
  category: string;
  avatar: string;
  price: string;
  rating: number;
  users: number;
  features: string[];
}

const Marketplace = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const dispatch = useAppDispatch();
  const hiredAgentsRaw = useAppSelector(selectHired);
  const hiredTemplateId = hiredAgentsRaw.map(h => h.template_id);

  // Use React Query to fetch agent templates with 3s stale time
  const { 
    data: templates = [], 
    isLoading, 
    error 
  } = useQuery<AgentTemplate[]>({
    queryKey: apiClient.queryKeys.agentTemplates,
    queryFn: apiClient.fetchAgentTemplates,
    staleTime: 3000 // 3 seconds
  });

  // Show loading state if templates are loading
  if (isLoading) {
    return <AgentMarketPlaceLoading />;
  }

  // Show error state if there was an error
  if (error) {
    showErrorToast("Failed to load agents", "Please try again later.");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-500">Failed to load agents</h2>
          <p className="text-gray-600 mt-2">Please try again later or contact support.</p>
        </div>
      </div>
    );
  }
  const getAgentDetails = (category: string) => {
    switch (category.toLowerCase()) {
      case "hr":
        return {
          features: [
            "Talent sourcing & candidate matching",
            "Resume screening & analysis",
            "Interview scheduling & coordination",
            "Employee onboarding assistance",
          ],
          description:
            "Streamline recruitment with our HR Agent. Source candidates, analyze resumes, coordinate interviews, and manage onboarding while maintaining personalized communication.",
        };
      case "sales":
        return {
          features: [
            "Lead qualification & prioritization",
            "Personalized outreach campaigns",
            "Meeting scheduling & follow-ups",
            "Sales pipeline management",
          ],
          description:
            "Supercharge sales with our Sales Agent. Identify prospects, create personalized outreach, automate follow-ups, and provide insights to close deals faster.",
        };
      default: // General agent
        return {
          features: [
            "Multi-source people search",
            "Contact information verification",
            "Professional background analysis",
            "Network visualization & mapping",
          ],
          description:
            "Discover the right people with our General Agent. Search data sources, verify contacts, analyze backgrounds, and visualize networks efficiently.",
        };
    }
  };

  const marketplaceAgents: MarketplaceAgent[] = templates.map((t: AgentTemplate) => {
    const details = getAgentDetails(t.category);
    // Ensure agentImageUrl is always an array of strings
    const imageUrls = Array.isArray(t.image_urls) 
      ? t.image_urls 
      : (typeof t.image_urls === 'string' ? [t.image_urls] : []);
      
    return {
      id: t.id,
      name: t.name,
      agentImageUrl: imageUrls,
      description: t.description ?? details.description,
      category: t.category,
      avatar: getAgentAvatar(t.category),
      price: "$29/month",
      rating: 4.8,
      users: 1_200,
      features: details.features,
    };
  });

  const { user } = useAuth();
  const router = useRouter();

  // Load hired agents when component mounts
  useEffect(() => {
    dispatch(loadAgents());
  }, [dispatch]);

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
      showSuccessToast("Agent hired", "The agent has been added to your team.");

      dispatch(loadAgents());
    } catch (err: any) {
      const msg = err.message ?? "Unknown error";
      showErrorToast(msg.includes("already") ? "Agent already hired" : "Error hiring agent", msg);
    } finally {
      setLoading(null);
    }
  };

  const handleUnhireAgent = async (agentId: string) => {
    if (!user) {
      showInfoToast("Authentication required", "Please sign in to manage agents.");
      return;
    }
    setLoading(`unhire-${agentId}`);
    try {
      await apiClient.unhireAgentByTemplateId(agentId);
      showSuccessToast("Agent removed", "The agent has been removed from your team.");
      dispatch(loadAgents());
    } catch (err: any) {
      showErrorToast("Error unhiring agent", err.message);
    } finally {
      setLoading(null);
    }
  };

  if (marketplaceAgents.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">No agents available</h2>
          <p className="text-gray-500 mt-2">Check back later for new agents.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto px-4 pt-8 mt-10 md:mt-0 pb-8 ">
        <div className="text-center relative  ">
          <div className="relative inline-block">
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold 
                         h-auto sm:h-[80px] lg:h-[100px] bg-gradient-to-r from-blue-600 via-purple-600 
                         to-cyan-600 bg-clip-text text-transparent leading-tight"
            >
              AI Agent Marketplace
            </h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-2">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 text-gray-900">
              Choose Your Perfect AI Assistant
            </h2>
            <div className="w-16 sm:w-20 lg:w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 justify-items-center relative">
            <div className="absolute inset-0 opacity-5 pointer-events-none hidden lg:block">
              <div className="grid grid-cols-3 gap-8 h-full">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border rounded-lg border-gray-300" />
                ))}
              </div>
            </div>

            {marketplaceAgents.map((agent, index) => (
              <div
                key={agent.id}
                className="relative w-full max-w-sm"
                style={{
                  animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                }}
              >
                <div
                  className={`absolute -inset-2 sm:-inset-4 bg-gradient-to-r ${
                    isAgentHired(agent.id)
                      ? "from-green-500/20 to-emerald-500/20"
                      : "from-blue-500/10 to-purple-500/10"
                  } rounded-2xl sm:rounded-3xl blur-xl opacity-0 group-hover:opacity-100 
                    transition-opacity duration-500 hidden sm:block`}
                />

                <AgentMarketplaceCard
                  // @ts-ignore
                  agent={agent}
                  isHired={isAgentHired(agent.id)}
                  onHireAgent={handleHireAgent}
                  onUnhireAgent={handleUnhireAgent}
                  loading={loading}
                  darkMode={false}
                  showMobileWarning={false}
                  showTooltip={true}
                  scaleOnHover={window.innerWidth >= 768 ? 1.05 : 1.0} // Disable scaling on mobile
                  rotateAmplitude={window.innerWidth >= 768 ? 8 : 0} // Disable rotation on mobile
                  containerHeight="auto" // Let it be responsive
                  containerWidth="100%" // Full width on mobile
                  cardHeight="auto" // Responsive height
                  cardWidth="100%" // Full width
                />
              </div>
            ))}
          </div>

          {/* Empty State */}
          {marketplaceAgents.length === 0 && (
            <div className="text-center py-12 sm:py-16">
              <div className="text-4xl sm:text-6xl mb-4 opacity-50">🤖</div>
              <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-gray-700">
                No agents available
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Check back later for new AI agents
              </p>
            </div>
          )}
        </div>

        {/* Hired Agents Section */}
        {hiredTemplateId.length > 0 && (
          <div className="max-w-5xl mx-auto mt-12 sm:mt-16">
            <div
              className="relative p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border backdrop-blur-sm 
                          overflow-hidden bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-blue-50/80 
                          border-blue-200/50"
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(59,130,246,0.5),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(147,51,234,0.5),transparent_50%)]" />
              </div>

              <div className="relative z-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="p-2 sm:p-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex-shrink-0">
                      <svg
                        className="w-4 h-4 sm:w-6 sm:h-6 text-white"
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
                      <h3 className="text-xl sm:text-2xl font-bold mb-1 text-gray-900">
                        Your AI Team
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600">Managing your hired agents</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 sm:space-x-6">
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-green-500">
                        {hiredTemplateId.length}
                      </div>
                      <div className="text-xs text-gray-500">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-blue-500">24/7</div>
                      <div className="text-xs text-gray-500">Available</div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="mb-4 sm:mb-6 text-sm sm:text-base lg:text-lg leading-relaxed text-gray-700">
                  You have successfully hired {hiredTemplateId.length} AI agent
                  {hiredTemplateId.length > 1 ? "s" : ""}. Configure their personalities, settings,
                  and workflows to maximize their effectiveness for your specific needs.
                </p>

                {/* Action Button */}
                <div className="flex flex-wrap gap-4 mb-6 sm:mb-8">
                  <Link
                    href="/agents"
                    className="inline-flex items-center px-6 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl 
                             font-semibold text-white text-sm sm:text-base
                             bg-gradient-to-r from-blue-600 to-purple-600 
                             hover:from-blue-700 hover:to-purple-700 
                             transform hover:scale-105 transition-all duration-300 
                             shadow-lg hover:shadow-xl focus:outline-none 
                             focus-visible:ring-2 focus-visible:ring-offset-2 
                             focus-visible:ring-blue-500 w-full sm:w-auto justify-center"
                  >
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
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

                {/* Stats Grid */}
                <div
                  className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-4 sm:pt-6 
                              border-t border-gray-200"
                >
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-semibold text-green-500">100%</div>
                    <div className="text-xs text-gray-500">Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-semibold text-blue-500">5/10</div>
                    <div className="text-xs text-gray-500">Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-semibold text-purple-500">&lt;1s</div>
                    <div className="text-xs text-gray-500">Response</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-semibold text-cyan-500">24/7</div>
                    <div className="text-xs text-gray-500">Support</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact CTA */}
        <div className="text-center mt-12 sm:mt-16 lg:mt-20 pb-4 sm:pb-8">
          <div
            className="inline-flex flex-col sm:flex-row items-center px-4 sm:px-6 py-3 
                        rounded-full backdrop-blur-sm border bg-white/30 border-gray-300/50 
                        text-gray-700 space-y-2 sm:space-y-0 sm:space-x-2"
          >
            <span className="text-sm">Need a custom agent?</span>
            <button className="text-blue-500 hover:text-blue-600 font-medium underline text-sm">
              Contact us
            </button>
          </div>
        </div>
      </div>

      {/* Add custom CSS for animations */}
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

        /* Ensure proper touch targets on mobile */
        @media (max-width: 768px) {
          button,
          a {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
    </div>
  );
};

const MarketplacePage = () => <Marketplace />;

export default MarketplacePage;
