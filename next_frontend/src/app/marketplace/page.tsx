"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Users, CheckCircle, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/fastapi/client";
import { useToast } from "@/hooks/use-toast";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/utils/toastManager";
import { useRouter } from "next/navigation";

const marketplaceAgents = [
  {
    id: "69ce1f3a-7bcf-4c4e-a65d-4a127ea51641", // UUID for HR agent
    name: "HR Agent",
    description:
      "Specialized in human resources, recruitment, employee management, and HR policies",
    category: "Human Resources",
    rating: 4.9,
    users: 8500,
    avatar: "👥",
    price: "$29/month",
    features: [
      "Resume Screening",
      "Interview Scheduling",
      "Policy Questions",
      "Employee Onboarding",
    ],
  },
  {
    id: "a308a21c-981b-48d9-a26a-685371527c30", // UUID for Sales agent
    name: "Sales Agent",
    description:
      "Expert in sales strategies, lead generation, customer relationships, and deal closing",
    category: "Sales & Marketing",
    rating: 4.8,
    users: 12300,
    avatar: "💼",
    price: "$39/month",
    features: [
      "Lead Qualification",
      "Sales Scripts",
      "CRM Management",
      "Deal Analysis",
    ],
  },
];

const Marketplace = () => {
  const [hiredAgents, setHiredAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchHiredAgents();
    } else {
      router.push("/login");
    }
  }, [user]);

  const fetchHiredAgents = async () => {
    if (!user) return;

    try {
      const data = await apiClient.getHiredAgents();
      // Note: Our backend returns template_id instead of agent_id
      setHiredAgents(data?.map((item) => item.template_id) || []);
    } catch (error) {
      console.error("Error fetching hired agents:", error);
    }
  };

  const handleHireAgent = async (agentId: string) => {
    if (!user) {
      showInfoToast("123", "Please sign in to hire agents.");
      return;
    }

    setLoading(agentId);

    const agentToHire = marketplaceAgents.find((agent) => agent.id === agentId);

    if (!agentToHire) {
      showErrorToast("Could not find the selected agent.");
      setLoading(null);
      return;
    }

    try {
      await apiClient.hireAgent({
        template_id: agentId,
        user_id: user.id,
        name: agentToHire.name,
        personality: "helpful",
        tone: "professional",
        response_length: "medium",
        expertise: "general",
      });

      toast({
        title: "Agent hired successfully",
        description: "The agent has been added to your team.",
      });
      fetchHiredAgents();
    } catch (error: any) {
      // Check if it's a duplicate error (unique constraint violation)
      if (
        error.message.includes("already hired") ||
        error.message.includes("unique constraint")
      ) {
        toast({
          title: "Agent already hired",
          description: "You have already hired this agent.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error hiring agent",
          description: error.message,
          variant: "destructive",
        });
      }
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

      toast({
        title: "Agent unhired",
        description: "The agent has been removed from your team.",
      });
      fetchHiredAgents();
    } catch (error: any) {
      toast({
        title: "Error unhiring agent",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const isAgentHired = (agentId: string) => {
    return hiredAgents.includes(agentId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Agent Marketplace
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Hire specialized AI agents to help with your business needs
          </p>
        </div>
        {/* Agent Grid */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {marketplaceAgents.map((agent) => (
            <Card
              key={agent.id}
              className="bg-white border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="text-4xl">{agent.avatar}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {agent.name}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800 border-blue-200"
                  >
                    {agent.category}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {agent.price}
                  </div>
                  <div className="text-sm text-gray-500">per month</div>
                </div>
              </div>

              <p className="text-gray-600 mb-4">{agent.description}</p>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Key Features:
                </h4>
                <ul className="space-y-1">
                  {agent.features.map((feature, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-600 flex items-center"
                    >
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-gray-900 font-medium">
                      {agent.rating}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-gray-500 text-sm">
                    <Users className="h-4 w-4" />
                    <span>{agent.users.toLocaleString()} users</span>
                  </div>
                </div>
              </div>

              {isAgentHired(agent.id) ? (
                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline" disabled={true}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Hired
                  </Button>
                  <Button
                    className=""
                    variant="destructive"
                    onClick={() => handleUnhireAgent(agent.id)}
                    disabled={loading === `unhire-${agent.id}`}
                  >
                    {loading === `unhire-${agent.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Unhire"
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full bg-red-400"
                  onClick={() => handleHireAgent(agent.id)}
                  disabled={loading === agent.id}
                >
                  {loading === agent.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Hiring...
                    </>
                  ) : (
                    "Hire Agent"
                  )}
                </Button>
              )}
            </Card>
          ))}
        </div>

        {hiredAgents.length > 0 && (
          <div className="max-w-4xl mx-auto mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Hired Agents
            </h3>
            <p className="text-blue-700 mb-4">
              You have hired {hiredAgents.length} agent
              {hiredAgents.length > 1 ? "s" : ""}. Configure them in the Agents
              page to customize their personality and settings.
            </p>
            <Button
              onClick={() => (window.location.href = "/agents")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Configure Agents
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
