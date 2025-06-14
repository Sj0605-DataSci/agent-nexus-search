
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, X } from "lucide-react";

interface ChatDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
}

const chatThreads = [
  { id: "1", title: "Research on AI trends", lastMessage: "What are the latest AI developments?", timestamp: "2m ago", agent: "🔬" },
  { id: "2", title: "Creative writing help", lastMessage: "Can you help me write a story?", timestamp: "1h ago", agent: "✍️" },
  { id: "3", title: "Code debugging", lastMessage: "Fix this React component", timestamp: "3h ago", agent: "💻" },
  { id: "4", title: "General questions", lastMessage: "How does photosynthesis work?", timestamp: "1d ago", agent: "🤖" },
  { id: "5", title: "Travel planning", lastMessage: "Plan a trip to Japan", timestamp: "2d ago", agent: "🗺️" },
];

const ChatDrawer = ({ isOpen, onToggle }: ChatDrawerProps) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Drawer */}
      <div className={`fixed left-0 top-20 bottom-0 w-80 bg-black/40 backdrop-blur-md border-r border-white/20 z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Chat Threads
            </h2>
            <Button
              onClick={onToggle}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {chatThreads.map((thread) => (
              <div
                key={thread.id}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors border border-white/10"
              >
                <div className="flex items-start space-x-3">
                  <div className="text-lg">{thread.agent}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-sm truncate mb-1">
                      {thread.title}
                    </h3>
                    <p className="text-slate-400 text-xs truncate mb-2">
                      {thread.lastMessage}
                    </p>
                    <div className="text-slate-500 text-xs">
                      {thread.timestamp}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default ChatDrawer;
