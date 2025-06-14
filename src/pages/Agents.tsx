
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, User } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const agentTemplates = {
  hr: {
    id: "hr",
    name: "HR Agent",
    avatar: "👥",
    defaultPersonality: "Professional, empathetic, and knowledgeable about HR best practices. I help with recruitment, employee relations, and policy guidance.",
    defaultTone: "professional",
    skills: ["Resume Screening", "Interview Scheduling", "Policy Questions", "Employee Onboarding"]
  },
  sales: {
    id: "sales", 
    name: "Sales Agent",
    avatar: "💼",
    defaultPersonality: "Persuasive, relationship-focused, and results-driven. I excel at qualifying leads, building rapport, and closing deals.",
    defaultTone: "enthusiastic",
    skills: ["Lead Qualification", "Sales Scripts", "CRM Management", "Deal Analysis"]
  }
};

const Agents = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>("hr");
  const [agentConfigs, setAgentConfigs] = useState<Record<string, any>>({});
  const [hiredAgents, setHiredAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchHiredAgentsAndConfigs();
    }
  }, [user]);

  const fetchHiredAgentsAndConfigs = async () => {
    if (!user) return;

    try {
      // Fetch hired agents
      const { data: hiredData, error: hiredError } = await supabase
        .from('hired_agents')
        .select('agent_id')
        .eq('user_id', user.id);

      if (hiredError) {
        console.error('Error fetching hired agents:', hiredError);
        return;
      }

      const hired = hiredData?.map(item => item.agent_id) || [];
      setHiredAgents(hired);

      // Fetch agent configurations
      const { data: configData, error: configError } = await supabase
        .from('agent_configurations')
        .select('*')
        .eq('user_id', user.id);

      if (configError) {
        console.error('Error fetching agent configs:', configError);
        return;
      }

      // Transform configs into the expected format
      const configs: Record<string, any> = {};
      configData?.forEach(config => {
        configs[config.agent_id] = {
          name: config.name,
          personality: config.personality,
          tone: config.tone,
          responseLength: config.response_length,
          expertise: config.expertise
        };
      });

      setAgentConfigs(configs);

      // Set first hired agent as selected if available
      if (hired.length > 0) {
        setSelectedAgent(hired[0]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentAgent = agentTemplates[selectedAgent as keyof typeof agentTemplates];
  const currentConfig = agentConfigs[selectedAgent];

  const updateAgentConfig = (field: string, value: string) => {
    setAgentConfigs(prev => ({
      ...prev,
      [selectedAgent]: {
        ...prev[selectedAgent],
        [field]: value
      }
    }));
  };

  const saveConfiguration = async () => {
    if (!user || !currentConfig) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('agent_configurations')
        .update({
          name: currentConfig.name,
          personality: currentConfig.personality,
          tone: currentConfig.tone,
          response_length: currentConfig.responseLength,
          expertise: currentConfig.expertise,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('agent_id', selectedAgent);

      if (error) {
        toast({
          title: "Error saving configuration",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Configuration saved!",
          description: "Your agent configuration has been updated successfully.",
        });
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Configure Your Agents</h1>
          <p className="text-xl text-gray-600 mb-8">You haven't hired any agents yet.</p>
          <Button 
            onClick={() => window.location.href = '/marketplace'}
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Configure Your Agents</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Customize your hired agents' personality, tone, and behavior
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Agent Selector */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-4">
              {hiredAgents.map((agentId) => {
                const agent = agentTemplates[agentId as keyof typeof agentTemplates];
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
                  <h2 className="text-2xl font-bold text-gray-900">{currentAgent.name}</h2>
                  <p className="text-gray-600">Configure agent settings and personality</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Agent Name */}
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">Agent Name</Label>
                  <Input
                    id="name"
                    value={currentConfig.name || ''}
                    onChange={(e) => updateAgentConfig('name', e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Personality */}
                <div>
                  <Label htmlFor="personality" className="text-sm font-medium text-gray-700">Personality & Behavior</Label>
                  <Textarea
                    id="personality"
                    value={currentConfig.personality || ''}
                    onChange={(e) => updateAgentConfig('personality', e.target.value)}
                    rows={4}
                    className="mt-1"
                    placeholder="Describe how your agent should behave and interact..."
                  />
                </div>

                {/* Tone */}
                <div>
                  <Label htmlFor="tone" className="text-sm font-medium text-gray-700">Communication Tone</Label>
                  <Select value={currentConfig.tone || 'professional'} onValueChange={(value) => updateAgentConfig('tone', value)}>
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
                  <Label htmlFor="responseLength" className="text-sm font-medium text-gray-700">Response Length</Label>
                  <Select value={currentConfig.responseLength || 'medium'} onValueChange={(value) => updateAgentConfig('responseLength', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short & Concise</SelectItem>
                      <SelectItem value="medium">Medium Detail</SelectItem>
                      <SelectItem value="long">Detailed & Comprehensive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Expertise Level */}
                <div>
                  <Label htmlFor="expertise" className="text-sm font-medium text-gray-700">Expertise Level</Label>
                  <Select value={currentConfig.expertise || 'general'} onValueChange={(value) => updateAgentConfig('expertise', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner-friendly</SelectItem>
                      <SelectItem value="general">General Knowledge</SelectItem>
                      <SelectItem value="expert">Expert Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Skills */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Core Skills</Label>
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
                    {saving ? 'Saving...' : 'Save Configuration'}
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
