"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star, Users, CheckCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
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
    features: [],
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

  if (agentsStatus === "loading" || !(templates?.length > 0)) {
    return (
      <div
        className={`min-h-screen transition-colors duration-500 ${
          darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"
        }`}
      >
        <Navigation />

        <div className="container mx-auto px-4 pt-24 pb-16 text-center">
          <Loader2
            className={`mx-auto h-12 w-12 animate-spin ${
              darkMode ? "text-blue-400" : "text-blue-600"
            }`}
          />
          <p className={`mt-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Loading marketplace agents…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"
      }`}
    >
      <Navigation />
      <ToggleSystemTheme className="fixed top-5 right-5 z-30" />

      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="text-center mb-12">
          <h1 className={`text-4xl font-bold mb-4`}>AI Agent Marketplace</h1>
          <p className="text-xl max-w-2xl mx-auto">
            Hire specialized AI agents to help with your business needs
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {marketplaceAgents.map(agent => {
            const hired = isAgentHired(agent.id);
            return (
              <Card
                key={agent.id}
                className={`p-6 border transition-shadow ${
                  darkMode
                    ? "bg-gray-800/60 border-gray-700 hover:shadow-gray-700/40"
                    : "bg-white border-gray-200 hover:shadow-lg"
                }`}
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="text-4xl">{agent.avatar}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{agent.name}</h3>
                    <Badge
                      variant="secondary"
                      className={
                        darkMode
                          ? "bg-blue-900 text-blue-300 border-blue-700"
                          : "bg-blue-100 text-blue-800 border-blue-200"
                      }
                    >
                      {agent.category}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{agent.price}</div>
                    <div className="text-sm text-gray-500">per month</div>
                  </div>
                </div>

                <p className="mb-4">{agent.description}</p>

                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2">Key Features:</h4>
                  <ul className="space-y-1">
                    {agent.features.map(f => (
                      <li key={f} className="text-sm flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="font-medium">{agent.rating}</span>
                    </span>
                    <span className="flex items-center space-x-1 text-sm text-gray-500">
                      <Users className="h-4 w-4" />
                      <span>{agent.users.toLocaleString()} users</span>
                    </span>
                  </div>
                </div>

                {hired ? (
                  <div className="flex gap-2">
                    <Button className="flex-1" variant="outline" disabled>
                      <CheckCircle className="mr-2 h-4 w-4" /> Hired
                    </Button>
                    <Button
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
                    className="w-full bg-red-500 hover:bg-red-600"
                    onClick={() => handleHireAgent(agent.id)}
                    disabled={loading === agent.id}
                  >
                    {loading === agent.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Hiring…
                      </>
                    ) : (
                      "Hire Agent"
                    )}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        {hiredTemplateId.length > 0 && (
          <div
            className={`max-w-4xl mx-auto mt-12 p-6 rounded-lg border ${
              darkMode ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"
            }`}
          >
            <h3 className="text-lg font-semibold mb-2">Hired Agents</h3>
            <p className="mb-4">
              You have hired {hiredTemplateId.length} agent
              {hiredTemplateId.length > 1 ? "s" : ""}. Configure them in the Agents page to
              customise their personality and settings.
            </p>
            <div className="mt-4 flex">
              <Link
                href="/agents"
                className="
          inline-flex items-center rounded-md px-4 py-2 text-sm font-medium

          bg-blue-600 text-white hover:bg-blue-700

          dark:bg-blue-500 dark:hover:bg-blue-600

          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          focus-visible:ring-blue-500 dark:focus-visible:ring-offset-gray-900
        "
              >
                Configure Agents
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default withAuth(Marketplace);
