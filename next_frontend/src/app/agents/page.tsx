"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/fastapi/client";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const agentTemplates = {
  "69ce1f3a-7bcf-4c4e-a65d-4a127ea51641": {
    id: "69ce1f3a-7bcf-4c4e-a65d-4a127ea51641",
    name: "HR Agent",
    avatar: "👥",
    defaultPersonality:
      "Professional, empathetic, and knowledgeable about HR best practices. I help with recruitment, employee relations, and policy guidance.",
    defaultTone: "professional",
    skills: [
      "Resume Screening",
      "Interview Scheduling",
      "Policy Questions",
      "Employee Onboarding",
    ],
  },
  "a308a21c-981b-48d9-a26a-685371527c30": {
    id: "a308a21c-981b-48d9-a26a-685371527c30",
    name: "Sales Agent",
    avatar: "💼",
    defaultPersonality:
      "Persuasive, relationship-focused, and results-driven. I excel at qualifying leads, building rapport, and closing deals.",
    defaultTone: "enthusiastic",
    skills: [
      "Lead Qualification",
      "Sales Scripts",
      "CRM Management",
      "Deal Analysis",
    ],
  },
};

const Agents = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>(
    "69ce1f3a-7bcf-4c4e-a65d-4a127ea51641"
  );
  const [agentConfigs, setAgentConfigs] = useState<Record<string, any>>({});
  const [hiredAgents, setHiredAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchHiredAgentsAndConfigs();
    } else {
      router.push("/login");
    }
  }, [user]);

  const fetchHiredAgentsAndConfigs = async () => {
    if (!user) return;

    try {
      // Fetch hired agents with their configurations
      const hiredAgents = await apiClient.getHiredAgents();

      // Extract template_ids (equivalent to agent_id in the frontend)
      const hired = hiredAgents?.map((agent) => agent.template_id) || [];
      setHiredAgents(hired);

      // Transform hired agents data into the expected format for configurations
      const configs: Record<string, any> = {};
      hiredAgents?.forEach((agent) => {
        configs[agent.template_id] = {
          name: agent.name || "",
          personality: agent.personality || "helpful",
          tone: agent.tone || "professional",
          response_length: agent.response_length || "medium",
          expertise: agent.expertise || "general",
        };
      });

      setAgentConfigs(configs);

      // Set first hired agent as selected if available
      if (hired.length > 0) {
        setSelectedAgent(hired[0]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentAgent =
    agentTemplates[selectedAgent as keyof typeof agentTemplates];
  const currentConfig = agentConfigs[selectedAgent];

  const updateAgentConfig = (field: string, value: string) => {
    setAgentConfigs((prev) => ({
      ...prev,
      [selectedAgent]: {
        ...prev[selectedAgent],
        [field]: value,
      },
    }));
  };

  const saveConfiguration = async () => {
    if (!user || !currentConfig || !selectedAgent) return;

    setSaving(true);

    try {
      // Find the hired agent ID for the selected template/agent
      const hiredAgents = await apiClient.getHiredAgents();
      const hiredAgent = hiredAgents.find(
        (agent) => agent.template_id === selectedAgent
      );

      if (!hiredAgent) {
        throw new Error("Could not find the hired agent to update");
      }

      // Update the hired agent with the new configuration
      await apiClient.updateHiredAgent(hiredAgent.id, {
        name: currentConfig.name,
        personality: currentConfig.personality,
        tone: currentConfig.tone,
        response_length: currentConfig.response_length,
        expertise: currentConfig.expertise,
      });

      toast({
        title: "Configuration saved",
        description: "Your agent configuration has been updated.",
      });

      // Update local state
      setAgentConfigs((prev) => ({
        ...prev,
        [selectedAgent]: { ...currentConfig },
      }));
    } catch (error: any) {
      toast({
        title: "Error saving configuration",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your agents...</p>
        </div>
      </div>
    );
  }

  if (hiredAgents.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Configure Your Agents
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            You haven't hired any agents yet.
          </p>
          <Button
            onClick={() => (window.location.href = "/marketplace")}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Go to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Configure Your Agents
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Customize your hired agents' personality, tone, and behavior
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Agent Selector */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-4">
              {hiredAgents.map((agentId) => {
                const agent =
                  agentTemplates[agentId as keyof typeof agentTemplates];
                if (!agent) return null;

                return (
                  <Button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    variant={selectedAgent === agent.id ? "default" : "outline"}
                    className="flex items-center space-x-2"
                  >
                    <span className="text-lg">{agent.avatar}</span>
                    <span>{agent.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Configuration Form */}
          {currentAgent && currentConfig && (
            <Card className="bg-white border border-gray-200 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="text-3xl">{currentAgent.avatar}</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentAgent.name}
                  </h2>
                  <p className="text-gray-600">
                    Configure agent settings and personality
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Agent Name */}
                <div>
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-gray-700"
                  >
                    Agent Name
                  </Label>
                  <Input
                    id="name"
                    value={currentConfig.name || ""}
                    onChange={(e) => updateAgentConfig("name", e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Personality */}
                <div>
                  <Label
                    htmlFor="personality"
                    className="text-sm font-medium text-gray-700"
                  >
                    Personality & Behavior
                  </Label>
                  <Textarea
                    id="personality"
                    value={currentConfig.personality || ""}
                    onChange={(e) =>
                      updateAgentConfig("personality", e.target.value)
                    }
                    rows={4}
                    className="mt-1"
                    placeholder="Describe how your agent should behave and interact..."
                  />
                </div>

                {/* Tone */}
                <div>
                  <Label
                    htmlFor="tone"
                    className="text-sm font-medium text-gray-700"
                  >
                    Communication Tone
                  </Label>
                  <Select
                    value={currentConfig.tone || "professional"}
                    onValueChange={(value) => updateAgentConfig("tone", value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Response Length */}
                <div>
                  <Label
                    htmlFor="response_length"
                    className="text-sm font-medium text-gray-700"
                  >
                    Response Length
                  </Label>
                  <Select
                    value={currentConfig.response_length || "medium"}
                    onValueChange={(value) =>
                      updateAgentConfig("response_length", value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short & Concise</SelectItem>
                      <SelectItem value="medium">Medium Detail</SelectItem>
                      <SelectItem value="long">
                        Detailed & Comprehensive
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Expertise Level */}
                <div>
                  <Label
                    htmlFor="expertise"
                    className="text-sm font-medium text-gray-700"
                  >
                    Expertise Level
                  </Label>
                  <Select
                    value={currentConfig.expertise || "general"}
                    onValueChange={(value) =>
                      updateAgentConfig("expertise", value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">
                        Beginner-friendly
                      </SelectItem>
                      <SelectItem value="general">General Knowledge</SelectItem>
                      <SelectItem value="expert">Expert Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Skills */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Core Skills
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {currentAgent.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <Button
                    onClick={saveConfiguration}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Agents;
