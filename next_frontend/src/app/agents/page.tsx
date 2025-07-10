"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/fastapi/client";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/utils/toastManager";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import withAuth from "@/hoc/withAuth";
import Link from "next/link";
import { loadAgents, selectAgentsStatus, selectHired, selectTemplates } from "@/store/agentsSlice";
import { getAgentAvatar } from "@/constant/getAgentAvatar";

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

      showSuccessToast("Configuration saved", "Your agent configuration has been updated.");

      setAgentConfigs(prev => ({
        ...prev,
        [selectedAgent]: { ...currentConfig },
      }));
    } catch (error: any) {
      showErrorToast(
        "Error saving configuration",
        error.message || "An unexpected error occurred."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-500 relative overflow-hidden ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"
      }`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl animate-pulse ${
            darkMode ? "bg-blue-600" : "bg-blue-400"
          }`}
        />
        <div
          className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 blur-3xl animate-pulse delay-1000 ${
            darkMode ? "bg-purple-600" : "bg-purple-400"
          }`}
        />
        {/* <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse delay-500 ${
            darkMode ? "bg-cyan-600" : "bg-cyan-400"
          }`}
        /> */}
      </div>

      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        <div className="text-center mb-16 relative">
          <div className="relative inline-block">
            <h1
              className={`text-5xl md:text-6xl font-bold mb-6 h-[100px] md:h-[80px] bg-gradient-to-r ${
                darkMode
                  ? "from-blue-400 via-purple-400 to-cyan-400"
                  : "from-blue-600 via-purple-600 to-cyan-600"
              } bg-clip-text text-transparent`}
            >
              AI Agent Command Center
            </h1>
            <div
              className={`absolute -inset-4 bg-gradient-to-r ${
                darkMode ? "from-blue-500/10 to-purple-500/10" : "from-blue-400/10 to-purple-400/10"
              } rounded-3xl blur-xl opacity-50`}
            />
          </div>
          <p
            className={`text-xl max-w-3xl mx-auto leading-relaxed ${
              darkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Fine-tune your AI agents to perfection. Customize personalities, behaviors, and
            communication styles to create the perfect digital workforce for your needs.
          </p>
          <div
            className={`w-32 h-1 mx-auto mt-6 rounded-full bg-gradient-to-r ${
              darkMode ? "from-blue-400 to-purple-400" : "from-blue-500 to-purple-500"
            }`}
          />
        </div>

        {agentsStatus === "loading" && (
          <div className="text-center py-20">
            <div className="relative inline-block">
              <div
                className={`animate-spin rounded-full h-16 w-16 border-4 border-transparent ${
                  darkMode
                    ? "border-t-blue-400 border-r-purple-400"
                    : "border-t-blue-600 border-r-purple-600"
                } mx-auto`}
              />
              <div
                className={`absolute inset-2 animate-spin rounded-full border-4 border-transparent ${
                  darkMode
                    ? "border-b-cyan-400 border-l-pink-400"
                    : "border-b-cyan-600 border-l-pink-600"
                } animate-reverse-spin`}
              />
            </div>
            <p className={`mt-6 text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Initializing your AI agents...
            </p>
            <div className="flex justify-center mt-4 space-x-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full animate-bounce ${
                    darkMode ? "bg-blue-400" : "bg-blue-600"
                  }`}
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {hiredIds.length === 0 && agentsStatus !== "loading" && (
          <div className="text-center py-20 z-100">
            <div className="relative inline-block mb-8">
              <div
                className={`text-8xl opacity-50 ${darkMode ? "text-gray-600" : "text-gray-400"}`}
              >
                🤖
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4">Your Agent Fleet Awaits</h2>
            <p
              className={`text-xl mb-8 max-w-2xl mx-auto ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Ready to build your dream team? Explore our marketplace and hire AI agents that match
              your vision.
            </p>
            <Link
              href="/marketplace"
              className={`inline-flex items-center px-8 py-4 rounded-xl font-semibold text-white 
            bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 
            transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 
            focus-visible:ring-blue-500 ${darkMode ? "focus-visible:ring-offset-gray-900" : ""}`}
            >
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Explore Marketplace
            </Link>
          </div>
        )}

        {hiredIds.length > 0 && agentsStatus !== "loading" && (
          <div className="max-w-7xl mx-auto">
            <div className="mb-12">
              <div
                className={`p-6 rounded-2xl backdrop-blur-sm border ${
                  darkMode ? "bg-gray-800/40 border-gray-700/50" : "bg-white/60 border-gray-200/50"
                }`}
              >
                <div className="flex items-center mb-6">
                  <div
                    className={`p-3 rounded-full mr-4 ${
                      darkMode ? "bg-blue-600/20" : "bg-blue-100"
                    }`}
                  >
                    <svg
                      className={`w-6 h-6 ${darkMode ? "text-blue-400" : "text-blue-600"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Your Agent Team</h2>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Select an agent to customize
                    </p>
                  </div>
                  <div className="ml-auto flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">{hiredIds.length}</div>
                      <div className="text-xs opacity-70">Active</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  {hiredRaw.map((agentData, index) => (
                    <button
                      key={agentData.template_id}
                      onClick={() => setSelectedAgent(agentData.template_id)}
                      className={`group relative p-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                        selectedAgent === agentData.template_id
                          ? darkMode
                            ? "bg-gradient-to-r from-blue-600/30 to-purple-600/30 border-2 border-blue-500/50"
                            : "bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-400/50"
                          : darkMode
                            ? "bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/30"
                            : "bg-white/40 hover:bg-white/60 border border-gray-300/30"
                      }`}
                      style={{
                        animation: `fadeSlideIn 0.6s ease-out ${index * 0.1}s both`,
                      }}
                    >
                      {selectedAgent === agentData.template_id && (
                        <div
                          className={`absolute -inset-1 bg-gradient-to-r ${
                            darkMode
                              ? "from-blue-500/20 to-purple-500/20"
                              : "from-blue-400/20 to-purple-400/20"
                          } rounded-xl blur-lg`}
                        />
                      )}
                      <div className="relative flex items-center space-x-3">
                        <div className="text-2xl">{getAgentAvatar(agentData.expertise)}</div>
                        <div className="text-left">
                          <div className="font-semibold">{agentData.name}</div>
                          <div
                            className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                          >
                            {agentData.expertise}
                          </div>
                        </div>
                        {selectedAgent === agentData.template_id && (
                          <div className="ml-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                darkMode ? "bg-blue-400" : "bg-blue-600"
                              } animate-pulse`}
                            />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {currentAgent && currentConfig && (
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <div
                    className={`sticky top-24 p-8 rounded-2xl border backdrop-blur-sm ${
                      darkMode
                        ? "bg-gradient-to-br from-gray-800/60 via-gray-800/40 to-gray-800/60 border-gray-700/50"
                        : "bg-gradient-to-br from-white/80 via-white/60 to-white/80 border-gray-200/50"
                    }`}
                  >
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-4 animate">{currentAgent.avatar}</div>
                      <h3 className="text-2xl font-bold mb-2">
                        {currentConfig.name || currentAgent.name}
                      </h3>
                      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                        {currentAgent.name}
                      </p>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Status</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-sm text-green-500">Active</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Response Time</span>
                        <span className="text-sm text-blue-500">&lt; 1s</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Availability</span>
                        <span className="text-sm text-purple-500">24/7</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Core Capabilities</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentAgent.skills.map(skill => (
                          <span
                            key={skill}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              darkMode
                                ? "bg-blue-900/40 text-blue-200"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div
                    className={`p-8 rounded-2xl border backdrop-blur-sm ${
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
                        <h3 className="text-2xl font-bold">Configuration Panel</h3>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          Customize behavior and personality traits
                        </p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Label className="text-base font-semibold">Agent Name</Label>
                          <div
                            className={`px-2 py-1 rounded text-xs ${
                              darkMode
                                ? "bg-blue-900/30 text-blue-300"
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
                              ? "bg-gray-700/30 border-gray-600/50 focus:border-blue-500"
                              : "bg-white/50 border-gray-300/50 focus:border-blue-500"
                          }`}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Label className="text-base font-semibold">Personality Profile</Label>
                          <div
                            className={`px-2 py-1 rounded text-xs ${
                              darkMode
                                ? "bg-green-900/30 text-green-300"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            Core Traits
                          </div>
                        </div>
                        <div
                          className={`p-4 rounded-xl border ${
                            darkMode
                              ? "bg-gray-700/20 border-gray-600/30"
                              : "bg-gray-50/50 border-gray-200/50"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{currentConfig?.personality}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="text-base font-semibold flex items-center">
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
                              <SelectValue placeholder="Select tone" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              <SelectItem value="professional">🎯 Professional</SelectItem>
                              <SelectItem value="friendly">😊 Friendly</SelectItem>
                              <SelectItem value="enthusiastic">🚀 Enthusiastic</SelectItem>
                              <SelectItem value="casual">😎 Casual</SelectItem>
                              <SelectItem value="formal">🎩 Formal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-base font-semibold flex items-center">
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
                            <SelectContent className="bg-white">
                              <SelectItem value="short">⚡ Short & Concise</SelectItem>
                              <SelectItem value="medium">📝 Medium Detail</SelectItem>
                              <SelectItem value="long">📚 Detailed & Comprehensive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3 md:col-span-2">
                          <Label className="text-base font-semibold flex items-center">
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
                            <SelectContent className="bg-white">
                              <SelectItem value="beginner">🌱 Beginner-friendly</SelectItem>
                              <SelectItem value="general">🎯 General Knowledge</SelectItem>
                              <SelectItem value="expert">🎓 Expert Level</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-opacity-20 border-gray-500">
                        <div className="flex items-center justify-between">
                          <div
                            className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                          >
                            Changes are saved automatically to your agent profile
                          </div>
                          <Button
                            onClick={saveConfiguration}
                            disabled={saving}
                            className={`px-8 py-3 text-base font-semibold ${
                              saving
                                ? "opacity-50 cursor-not-allowed"
                                : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transform hover:scale-105"
                            } transition-all duration-300 shadow-lg hover:shadow-xl`}
                          >
                            {saving ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-5 w-5 mr-2" />
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

      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes reverse-spin {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        .animate-reverse-spin {
          animation: reverse-spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default withAuth(Agents);
