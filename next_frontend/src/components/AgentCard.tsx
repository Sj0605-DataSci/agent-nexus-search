import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Users } from "lucide-react";
import Image from "next/image";

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  users: number;
  avatar: string;
  agentImageUrl?: string;
}

interface AgentCardProps {
  agent: Agent;
  onSelect?: (agent: Agent) => void;
}

const AgentCard = ({ agent, onSelect }: AgentCardProps) => {
  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20 p-6 hover:bg-white/15 transition-all duration-200 hover:scale-105">
      <div className="flex items-center space-x-4 mb-4">
        {agent.agentImageUrl ? (
          <div className="relative w-12 h-12 rounded-full overflow-hidden">
            <Image
              src={agent.agentImageUrl}
              alt={`${agent.name} avatar`}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="text-3xl">{agent.avatar}</div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{agent.name}</h3>
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            {agent.category}
          </Badge>
        </div>
      </div>

      <p className="text-slate-300 mb-4 text-sm">{agent.description}</p>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-1">
          <Star className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="text-white font-medium">{agent.rating}</span>
        </div>
        <div className="flex items-center space-x-1 text-slate-400 text-sm">
          <Users className="h-4 w-4" />
          <span>{agent.users.toLocaleString()}</span>
        </div>
      </div>

      <Button
        onClick={() => onSelect?.(agent)}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg"
      >
        Use Agent
      </Button>
    </Card>
  );
};

export default AgentCard;
