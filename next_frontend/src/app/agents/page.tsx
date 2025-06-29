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
import { useAppDispatch, useAppSelector } from "@/store";
import { loadAgents, selectAgentsStatus, selectHired } from "@/store/agentsSlice";
import { selectTemplates } from "@/store/agentsSlice";
import withAuth from "@/hoc/withAuth";
import Link from "next/link";
import { getAgentAvatar } from "@/constant/getAgentAvatar";

const Agents = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [agentConfigs, setAgentConfigs] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const dispatch = useAppDispatch();
  const agentsStatus = useAppSelector(selectAgentsStatus); // "idle" | "loading" | …
  const hiredRaw = useAppSelector(selectHired); // HiredAgent[]
  const hiredIds = hiredRaw.map(h => h.template_id);

  const darkMode = useAppSelector(s => s.theme.dark);

  useEffect(() => {
    if (agentsStatus === "idle") dispatch(loadAgents());
  }, [user, agentsStatus, dispatch, router]);

  useEffect(() => {
    if (agentsStatus !== "succeeded") return;

    const cfg: Record<string, any> = {};
    hiredRaw.forEach(a => {
      cfg[a.template_id] = {
        name: a.name ?? "",
        personality: a.personality ?? "helpful",
        tone: a.tone ?? "professional",
        response_length: a.response_length ?? "medium",
        expertise: a.expertise ?? "general",
      };
    });
    setAgentConfigs(cfg);

    if (hiredIds.length) setSelectedAgent(hiredIds[0]);
  }, [agentsStatus, hiredRaw]);

  const templates = useAppSelector(selectTemplates);

  const agentTemplates = Object.fromEntries(
    templates.map(t => [
      t.id,
      {
        id: t.id,
        name: t.name,
        avatar: getAgentAvatar(t.category),
        defaultPersonality: "helpful",
        defaultTone: "professional",
        skills: ["Deep Research"],
      },
    ])
  ) as Record<
    string,
    {
      id: string;
      name: string;
      avatar: string;
      defaultPersonality: string;
      defaultTone: string;
      skills: string[];
    }
  >;

  const currentAgent = agentTemplates[selectedAgent as keyof typeof agentTemplates];
  const currentConfig = agentConfigs[selectedAgent];

  const updateAgentConfig = (field: string, value: string) => {
    setAgentConfigs(prev => ({
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
      const hiredAgents = await apiClient.getHiredAgents();
      const hiredAgent = hiredAgents.find(agent => agent.template_id === selectedAgent);

      if (!hiredAgent) {
        throw new Error("Could not find the hired agent to update");
      }

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

      setAgentConfigs(prev => ({
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

  if (agentsStatus === "loading") {
    return (
      <div
        className={`min-h-screen transition-colors duration-500 ${
          darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"
        }`}
      >
        <Navigation />

        <div className="container mx-auto px-4 pt-24 pb-16 text-center">
          <div
            className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
              darkMode ? "border-blue-400" : "border-blue-600"
            } mx-auto`}
          ></div>
          <p className={`mt-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            Loading your agents…
          </p>
        </div>
      </div>
    );
  }
  if (hiredIds.length === 0) {
    return (
      <div
        className={`min-h-screen transition-colors duration-500 ${
          darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"
        }`}
      >
        <Navigation />

        <div className="container mx-auto px-4 pt-24 pb-16 text-center">
          <h1 className="text-4xl font-bold mb-4">Configure Your Agents</h1>
          <p className={`text-xl mb-8 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            You haven’t hired any agents yet.
          </p>

          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center rounded-md px-4 py-2
             bg-blue-600 hover:bg-blue-700 text-white
             dark:bg-blue-500 dark:hover:bg-blue-600
             transition-colors duration-300"
          >
            Go to Marketplace
          </Link>
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

      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Configure Your Agents</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Customize your hired agent's personality, tone, and behavior
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="mb-8 items-center justify-center border-b border-gray-200 py-4 flex flex-wrap  gap-4">
            {hiredRaw.map(agentId => {
              return (
                <Button
                  key={agentId.template_id}
                  onClick={() => setSelectedAgent(agentId.template_id)}
                  variant={selectedAgent != agentId.template_id ? "default" : "outline"}
                  className="flex items-center space-x-2"
                >
                  <span className="text-lg">{getAgentAvatar(agentId.expertise)}</span>
                  <span>{agentId.name}</span>
                </Button>
              );
            })}
          </div>

          {currentAgent && currentConfig && (
            <Card
              className={`mx-auto max-w-2xl p-8 border
      ${
        darkMode
          ? "bg-gray-800/60 border-gray-700 shadow-gray-700/30"
          : "bg-white border-gray-200 shadow-sm"
      }`}
            >
              <div className="flex items-start gap-3 mb-8">
                <div className="text-3xl">{currentAgent.avatar}</div>
                <div>
                  <h2 className="text-2xl font-bold">{currentAgent.name}</h2>
                  <p className="text-gray-500">Configure agent settings&nbsp;and personality</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-[150px_1fr]">
                <Label className="self-center">Agent Name</Label>
                <Input
                  value={currentConfig.name}
                  onChange={e => updateAgentConfig("name", e.target.value)}
                  placeholder="Give your agent a nickname"
                />

                <Label className="self-start pt-2">Personality & Behavior</Label>
                {/* <Textarea
                  value={currentConfig.personality}
                  onChange={e => updateAgentConfig("personality", e.target.value)}
                  rows={4}
                  placeholder="Describe how your agent should behave and interact…"
                /> */}
                <p>{currentConfig?.personality}</p>
                <Label className="self-center">Communication Tone</Label>
                <Select
                  value={currentConfig.tone}
                  onValueChange={v => updateAgentConfig("tone", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>

                <Label className="self-center">Response Length</Label>
                <Select
                  value={currentConfig.response_length}
                  onValueChange={v => updateAgentConfig("response_length", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="short">Short & Concise</SelectItem>
                    <SelectItem value="medium">Medium Detail</SelectItem>
                    <SelectItem value="long">Detailed & Comprehensive</SelectItem>
                  </SelectContent>
                </Select>

                <Label className="self-center">Expertise Level</Label>
                <Select
                  value={currentConfig.expertise}
                  onValueChange={v => updateAgentConfig("expertise", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="beginner">Beginner-friendly</SelectItem>
                    <SelectItem value="general">General Knowledge</SelectItem>
                    <SelectItem value="expert">Expert Level</SelectItem>
                  </SelectContent>
                </Select>

                <Label className="self-start pt-2">Core Skills</Label>
                <div className="flex flex-wrap gap-2">
                  {currentAgent.skills.map(skill => (
                    <span
                      key={skill}
                      className={`px-3 py-1 rounded-full text-sm
              ${darkMode ? "bg-blue-900/40 text-blue-200" : "bg-blue-100 text-blue-800"}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-8 text-right">
                <Button onClick={saveConfiguration} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving…" : "Save Configuration"}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default withAuth(Agents);
