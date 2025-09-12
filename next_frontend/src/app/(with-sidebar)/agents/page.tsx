"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/fastapi/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import Image from "next/image";
import { loadAgents, selectAgentsStatus, selectHired, selectTemplates } from "@/store/agentsSlice";
import { getAgentAvatar } from "@/constant/getAgentAvatar";

import React, { Suspense } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const Agents = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [agentConfigs, setAgentConfigs] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const dispatch = useAppDispatch();
  const agentsStatus = useAppSelector(selectAgentsStatus);
  const hiredRaw = useAppSelector(selectHired);
  const hiredIds = hiredRaw.map(h => h.template_id);
  const darkMode = false;

  useEffect(() => {
    if (agentsStatus === "idle" && user) {
      dispatch(loadAgents());
    }
  }, [user, agentsStatus, dispatch]);

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

  const templates = useAppSelector(selectTemplates || []);

  const agentTemplates = Object.fromEntries(
    templates?.length > 0
      ? templates?.map(t => [
          t.id,
          {
            id: t.id,
            name: t.name || "Arya",
            avatar: getAgentAvatar(t?.category),
            agentImageUrl: t.image_urls,
            defaultPersonality: "helpful",
            defaultTone: "professional",
            skills: ["Deep Research"],
          },
        ])
      : []
  ) as Record<
    string,
    {
      id: string;
      name: string;
      avatar: string;
      agentImageUrl?: string;
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
      const hiredAgent = hiredRaw.find(agent => agent.template_id === selectedAgent);

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

      dispatch(loadAgents());

      toast.success("Your agent configuration has been updated.");

      setAgentConfigs(prev => ({
        ...prev,
        [selectedAgent]: { ...currentConfig },
      }));
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto  pt-12 pb-12 sm:pb-16 md:pb-20 relative z-10">
      <div className="text-center mb-8 sm:mb-12 relative px-2 sm:px-0">
        <div className="relative mb-3 inline-block max-w-full">
          <div className="flex flex-col items-center">
            <h1
              className={`text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600
              bg-clip-text text-transparent leading-tight px-2 text-center`}
            >
              Customise the search
            </h1>
            <div
              className={`absolute -inset-2 bg-gradient-to-r ${
                darkMode ? "from-blue-500/15 to-purple-500/15" : "from-blue-400/10 to-purple-400/10"
              } rounded-3xl blur-xl opacity-50`}
            />
          </div>

          <div className="mt-4 max-w-3xl mx-auto">
            <p
              className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
                darkMode ? "text-gray-200" : "text-gray-600"
              } px-2 sm:px-0 text-center`}
            >
              Customize intelligent agents that adapt to your search patterns and find the right
              people across global and personal networks.
            </p>
          </div>
        </div>

        {agentsStatus === "loading" && (
          <div className="text-center py-10">
            <div className="relative inline-block">
              <div
                className={`animate-spin rounded-full h-16 w-16 border-4 border-transparent ${
                  darkMode
                    ? "border-t-blue-300 border-r-purple-300"
                    : "border-t-blue-600 border-r-purple-600"
                } mx-auto`}
              />
              <div
                className={`absolute inset-2 animate-spin rounded-full border-4 border-transparent ${
                  darkMode
                    ? "border-b-cyan-300 border-l-pink-300"
                    : "border-b-cyan-600 border-l-pink-600"
                } animate-reverse-spin`}
              />
            </div>
            <p className={`mt-6 text-lg ${darkMode ? "text-gray-200" : "text-gray-600"}`}>
              Initializing your AI agents...
            </p>
            <div className="flex justify-center mt-4 space-x-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full animate-bounce ${
                    darkMode ? "bg-blue-300" : "bg-blue-600"
                  }`}
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {!!hiredIds && hiredIds.length > 0 && (
          <div className="max-w-6xl mx-auto">
            {currentAgent && currentConfig && (
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                <div className="lg:w-1/3">
                  <div
                    className={`sticky top-24 p-4 sm:p-6 md:p-8 rounded-2xl border backdrop-blur-sm ${
                      darkMode
                        ? "bg-gradient-to-br from-gray-800/60 via-gray-800/40 to-gray-800/60 border-gray-700/50"
                        : "bg-gradient-to-br from-white/80 via-white/60 to-white/80 border-gray-200/50"
                    }`}
                  >
                    <div className="text-center mb-6">
                      {currentAgent.agentImageUrl ? (
                        <div className="relative w-24 h-24 rounded-full overflow-hidden mb-4">
                          <Image
                            src={currentAgent.agentImageUrl}
                            alt={`${currentAgent.name} avatar`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="text-6xl mb-4 animate">{currentAgent.avatar}</div>
                      )}
                      <h3
                        className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-800"}`}
                      >
                        {currentConfig.name || currentAgent.name}
                      </h3>
                      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                        {currentAgent.name}
                      </p>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-700"}`}>
                          Status
                        </span>
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-2 h-2 rounded-full ${darkMode ? "bg-green-400" : "bg-green-500"} animate-pulse`}
                          />
                          <span
                            className={`text-sm ${darkMode ? "text-green-300" : "text-green-600"}`}
                          >
                            Active
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-700"}`}>
                          Response Time
                        </span>
                        <span className={`text-sm ${darkMode ? "text-blue-300" : "text-blue-500"}`}>
                          &lt; 1s
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-700"}`}>
                          Availability
                        </span>
                        <span
                          className={`text-sm ${darkMode ? "text-purple-300" : "text-purple-500"}`}
                        >
                          24/7
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4
                        className={`font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-800"}`}
                      >
                        Core Capabilities
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {currentAgent.skills.map(skill => (
                          <span
                            key={skill}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              darkMode
                                ? "bg-blue-600/20 text-blue-300"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* {selectedAgent && (
                      <DocumentUploader
                        agentId={hiredRaw.find(a => a.template_id === selectedAgent)?.id || ""}
                        darkMode={darkMode}
                      />
                    )} */}
                  </div>
                </div>

                <div className="lg:w-2/3">
                  <div
                    className={`p-4 sm:p-6 md:p-8 rounded-2xl border backdrop-blur-sm ${
                      darkMode
                        ? "bg-gradient-to-br from-gray-800/60 via-gray-800/40 to-gray-800/60 border-gray-700/50"
                        : "bg-gradient-to-br from-white/80 via-white/60 to-white/80 border-gray-200/50"
                    }`}
                  >
                    <div className="flex items-center mb-8">
                      <div
                        className={`p-3 rounded-full mr-4 ${
                          darkMode ? "bg-purple-600/20" : "bg-purple-100"
                        }`}
                      >
                        <svg
                          className={`w-6 h-6 ${darkMode ? "text-purple-400" : "text-purple-600"}`}
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
                      </div>
                      <div>
                        <h3
                          className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}
                        >
                          Configuration Panel
                        </h3>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          Customize behavior and personality traits
                        </p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Label
                            className={`text-base font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}
                          >
                            Agent Name
                          </Label>
                          <div
                            className={`px-2 py-1 rounded text-xs ${
                              darkMode
                                ? "bg-blue-600/20 text-blue-300"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            Display Name
                          </div>
                        </div>
                        <Input
                          value={currentConfig.name}
                          onChange={e => updateAgentConfig("name", e.target.value)}
                          placeholder="Give your agent a unique name"
                          className={`text-lg py-3 ${
                            darkMode
                              ? "bg-gray-700/30 border-gray-600/50 text-gray-200 placeholder:text-gray-400 focus:border-blue-500"
                              : "bg-white/50 border-gray-300/50 text-gray-800 placeholder:text-gray-500 focus:border-blue-500"
                          }`}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Label
                            className={`text-base font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}
                          >
                            Personality Profile
                          </Label>
                          <div
                            className={`px-2 py-1 rounded text-xs ${
                              darkMode
                                ? "bg-green-600/20 text-green-300"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            Core Traits
                          </div>
                        </div>
                        <div
                          className={`p-4 rounded-xl border ${
                            darkMode
                              ? "bg-gray-700/20 border-gray-500/30"
                              : "bg-gray-50/50 border-gray-200/50"
                          }`}
                        >
                          <p
                            className={`text-sm leading-relaxed ${darkMode ? "text-gray-100" : "text-gray-700"}`}
                          >
                            {currentConfig?.personality}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-3">
                          <Label
                            className={`text-base font-semibold flex items-center ${darkMode ? "text-gray-200" : "text-gray-800"}`}
                          >
                            <svg
                              className="w-4 h-4 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                              />
                            </svg>
                            Communication Tone
                          </Label>
                          <Select
                            value={currentConfig.tone}
                            onValueChange={v => updateAgentConfig("tone", v)}
                          >
                            <SelectTrigger
                              className={`text-base py-3 ${
                                darkMode
                                  ? "bg-gray-700/30 border-gray-600/50"
                                  : "bg-white/50 border-gray-300/50"
                              }`}
                            >
                              <SelectValue
                                placeholder="Select tone"
                                className={darkMode ? "text-gray-200" : "text-gray-800"}
                              />
                            </SelectTrigger>
                            <SelectContent
                              className={`${darkMode ? "bg-gray-800 text-gray-200" : "bg-white text-gray-800"}`}
                            >
                              <SelectItem
                                value="professional"
                                className={`${darkMode ? "hover:bg-gray-700 focus:bg-gray-700" : "hover:bg-gray-100 focus:bg-gray-100"}`}
                              >
                                🎯 Professional
                              </SelectItem>
                              <SelectItem
                                value="friendly"
                                className={`${darkMode ? "hover:bg-gray-700 focus:bg-gray-700" : "hover:bg-gray-100 focus:bg-gray-100"}`}
                              >
                                😊 Friendly
                              </SelectItem>
                              <SelectItem
                                value="enthusiastic"
                                className={`${darkMode ? "hover:bg-gray-700 focus:bg-gray-700" : "hover:bg-gray-100 focus:bg-gray-100"}`}
                              >
                                🚀 Enthusiastic
                              </SelectItem>
                              <SelectItem
                                value="casual"
                                className={`${darkMode ? "hover:bg-gray-700 focus:bg-gray-700" : "hover:bg-gray-100 focus:bg-gray-100"}`}
                              >
                                😎 Casual
                              </SelectItem>
                              <SelectItem
                                value="formal"
                                className={`${darkMode ? "hover:bg-gray-700 focus:bg-gray-700" : "hover:bg-gray-100 focus:bg-gray-100"}`}
                              >
                                🎩 Formal
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label
                            className={`text-base font-semibold flex items-center ${darkMode ? "text-gray-200" : "text-gray-800"}`}
                          >
                            <svg
                              className="w-4 h-4 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            Response Length
                          </Label>
                          <Select
                            value={currentConfig.response_length}
                            onValueChange={v => updateAgentConfig("response_length", v)}
                          >
                            <SelectTrigger
                              className={`text-base py-3 ${
                                darkMode
                                  ? "bg-gray-700/30 border-gray-600/50"
                                  : "bg-white/50 border-gray-300/50"
                              }`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                              className={`${darkMode ? "bg-gray-800 text-gray-200" : "bg-white text-gray-800"}`}
                            >
                              <SelectItem
                                value="short"
                                className={`${darkMode ? "hover:bg-gray-700 focus:bg-gray-700" : "hover:bg-gray-100 focus:bg-gray-100"}`}
                              >
                                ⚡ Short & Concise
                              </SelectItem>
                              <SelectItem
                                value="medium"
                                className={`${darkMode ? "hover:bg-gray-700 focus:bg-gray-700" : "hover:bg-gray-100 focus:bg-gray-100"}`}
                              >
                                📝 Medium Detail
                              </SelectItem>
                              <SelectItem
                                value="long"
                                className={`${darkMode ? "hover:bg-gray-700 focus:bg-gray-700" : "hover:bg-gray-100 focus:bg-gray-100"}`}
                              >
                                📚 Detailed & Comprehensive
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3 col-span-1 md:col-span-2">
                          <Label
                            className={`text-base font-semibold flex items-center ${darkMode ? "text-gray-200" : "text-gray-800"}`}
                          >
                            <svg
                              className="w-4 h-4 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                              />
                            </svg>
                            Expertise Level
                          </Label>
                          <Select
                            value={currentConfig.expertise}
                            onValueChange={v => updateAgentConfig("expertise", v)}
                          >
                            <SelectTrigger
                              className={`text-base py-3 ${
                                darkMode
                                  ? "bg-gray-700/30 border-gray-600/50"
                                  : "bg-white/50 border-gray-300/50"
                              }`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                              className={`${darkMode ? "bg-gray-800 text-gray-200" : "bg-white text-gray-800"}`}
                            >
                              <SelectItem
                                value="beginner"
                                className={`${darkMode ? "hover:bg-gray-700 focus:bg-gray-700" : "hover:bg-gray-100 focus:bg-gray-100"}`}
                              >
                                🌱 Beginner-friendly
                              </SelectItem>
                              <SelectItem
                                value="general"
                                className={`${darkMode ? "hover:bg-gray-700 focus:bg-gray-700" : "hover:bg-gray-100 focus:bg-gray-100"}`}
                              >
                                🎯 General Knowledge
                              </SelectItem>
                              <SelectItem
                                value="expert"
                                className={`${darkMode ? "hover:bg-gray-700 focus:bg-gray-700" : "hover:bg-gray-100 focus:bg-gray-100"}`}
                              >
                                🎓 Expert Level
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div
                        className={`pt-6 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}
                      >
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div
                            className={`text-sm text-center sm:text-left ${darkMode ? "text-gray-300" : "text-gray-600"}`}
                          >
                            Changes are saved automatically to your agent profile
                          </div>
                          <Button
                            onClick={saveConfiguration}
                            disabled={saving}
                            className={`w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-xl ${
                              saving
                                ? "opacity-50 cursor-not-allowed"
                                : darkMode
                                  ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 sm:transform sm:hover:scale-105"
                                  : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 sm:transform sm:hover:scale-105"
                            }`}
                          >
                            {saving ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent mr-2" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                Save Configuration
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AgentsPage = () => {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Agents />
    </Suspense>
  );
};

export default AgentsPage;
