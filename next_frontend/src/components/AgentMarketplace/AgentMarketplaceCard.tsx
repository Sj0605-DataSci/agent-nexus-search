import type { SpringOptions } from "framer-motion";
import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Star, Users, CheckCircle, Sparkles, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Category =
  | "Data Analysis"
  | "Content Creation"
  | "Customer Support"
  | "Marketing"
  | "Sales"
  | "Development";

interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  category: Category;
  avatar: string;
  price: string;
  rating: number;
  users: number;
  features: string[];
}

interface AgentMarketplaceCardProps {
  agent: MarketplaceAgent;
  isHired?: boolean;
  onHireAgent?: (agentId: string) => void;
  onUnhireAgent?: (agentId: string) => void;
  loading?: string | null;
  containerHeight?: React.CSSProperties["height"];
  containerWidth?: React.CSSProperties["width"];
  cardHeight?: React.CSSProperties["height"];
  cardWidth?: React.CSSProperties["width"];
  scaleOnHover?: number;
  rotateAmplitude?: number;
  showMobileWarning?: boolean;
  showTooltip?: boolean;
  darkMode?: boolean;
}

const springValues: SpringOptions = {
  damping: 25,
  stiffness: 120,
  mass: 1.5,
};

const getCategoryGradient = (category: Category, darkMode: boolean) => {
  const gradients = {
    light: {
      "Data Analysis": "from-blue-500/20 via-cyan-500/20 to-teal-500/20",
      "Content Creation": "from-purple-500/20 via-pink-500/20 to-rose-500/20",
      "Customer Support": "from-green-500/20 via-emerald-500/20 to-lime-500/20",
      Marketing: "from-orange-500/20 via-amber-500/20 to-yellow-500/20",
      Sales: "from-red-500/20 via-pink-500/20 to-purple-500/20",
      Development: "from-indigo-500/20 via-blue-500/20 to-cyan-500/20",
      default: "from-gray-500/20 via-slate-500/20 to-zinc-500/20",
    },
    dark: {
      "Data Analysis": "from-blue-600/30 via-cyan-600/30 to-teal-600/30",
      "Content Creation": "from-purple-600/30 via-pink-600/30 to-rose-600/30",
      "Customer Support": "from-green-600/30 via-emerald-600/30 to-lime-600/30",
      Marketing: "from-orange-600/30 via-amber-600/30 to-yellow-600/30",
      Sales: "from-red-600/30 via-pink-600/30 to-purple-600/30",
      Development: "from-indigo-600/30 via-blue-600/30 to-cyan-600/30",
      default: "from-gray-600/30 via-slate-600/30 to-zinc-600/30",
    },
  };

  const mode = darkMode ? "dark" : "light";
  return gradients[mode][category] || gradients[mode].default;
};

const getCategoryIcon = (category: Category) => {
  const icons = {
    "Data Analysis": Zap,
    "Content Creation": Sparkles,
    "Customer Support": Users,
    Marketing: Crown,
    Sales: Star,
    Development: Zap,
  };
  return icons[category] || Sparkles;
};

export default function AgentMarketplaceCard({
  agent,
  isHired = false,
  onHireAgent,
  onUnhireAgent,
  loading = null,
  containerHeight = "450px",
  containerWidth = "380px",
  cardHeight = "420px",
  cardWidth = "360px",
  scaleOnHover = 1.04,
  rotateAmplitude = 6,
  showMobileWarning = true,
  showTooltip = true,
  darkMode = false,
}: AgentMarketplaceCardProps) {
  const ref = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);
  const opacity = useSpring(0);
  const glowOpacity = useSpring(0, springValues);
  const rotateFigcaption = useSpring(0, {
    stiffness: 400,
    damping: 30,
    mass: 0.8,
  });
  const [lastY, setLastY] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const CategoryIcon = getCategoryIcon(agent.category);
  const gradientClass = getCategoryGradient(agent.category, darkMode);

  function handleMouse(e: React.MouseEvent<HTMLElement>) {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
    const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude;

    rotateX.set(rotationX);
    rotateY.set(rotationY);

    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);

    const velocityY = offsetY - lastY;
    rotateFigcaption.set(-velocityY * 0.4);
    setLastY(offsetY);
  }

  function handleMouseEnter() {
    setIsHovering(true);
    scale.set(scaleOnHover);
    opacity.set(1);
    glowOpacity.set(0.6);
  }

  function handleMouseLeave() {
    setIsHovering(false);
    opacity.set(0);
    glowOpacity.set(0);
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
    rotateFigcaption.set(0);
  }

  const handleHire = () => {
    if (onHireAgent) {
      onHireAgent(agent.id);
    }
  };

  const handleUnhire = () => {
    if (onUnhireAgent) {
      onUnhireAgent(agent.id);
    }
  };

  const isGeneralAgent = agent.name.toLowerCase().includes("general");

  return (
    <figure
      ref={ref}
      className="relative w-full h-full [perspective:1000px] flex flex-col items-center justify-center group"
      style={{
        height: containerHeight,
        width: containerWidth,
      }}
      onMouseMove={handleMouse}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showMobileWarning && (
        <div className="absolute top-4 text-center text-sm block sm:hidden z-50">
          <div className="bg-black/80 text-white px-3 py-1 rounded-full text-xs">
            Best viewed on desktop
          </div>
        </div>
      )}

      <motion.div
        className={`absolute inset-0 rounded-[20px] bg-gradient-to-br ${gradientClass} blur-xl opacity-0`}
        style={{
          width: cardWidth,
          height: cardHeight,
          opacity: glowOpacity,
        }}
      />

      <motion.div
        className={`relative [transform-style:preserve-3d] rounded-[20px] border backdrop-blur-sm overflow-hidden transition-all duration-300 ${
          darkMode
            ? "bg-gray-900/80 border-gray-700/50 shadow-2xl"
            : "bg-white/90 border-gray-200/50 shadow-xl"
        }`}
        style={{
          width: cardWidth,
          height: cardHeight,
          rotateX,
          rotateY,
          scale,
        }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-50`} />

        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
          <motion.div
            className="absolute inset-0 bg-[linear-gradient(45deg,transparent_48%,rgba(255,255,255,0.1)_49%,rgba(255,255,255,0.1)_51%,transparent_52%)]"
            animate={{
              backgroundPosition: isHovering ? ["0% 0%", "100% 100%"] : "0% 0%",
            }}
            transition={{
              duration: 2,
              repeat: isHovering ? Infinity : 0,
              ease: "linear",
            }}
          />
        </div>

        <div className="relative z-10 p-6 h-full flex flex-col">
          <motion.div
            className="flex items-start space-x-4 mb-4"
            style={{
              transform: "translateZ(30px)",
            }}
          >
            <div className="relative">
              <div className="text-5xl mb-2">{agent.avatar}</div>
              <motion.div
                className="absolute -inset-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-sm"
                animate={{
                  scale: isHovering ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: 2,
                  repeat: isHovering ? Infinity : 0,
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className={`text-xl font-bold mb-2 truncate ${
                  darkMode ? "text-gray-100" : "text-gray-800"
                }`}
              >
                {agent.name}
              </h3>
              <Badge
                variant="secondary"
                className={`${
                  darkMode
                    ? "bg-gray-800/80 text-gray-200 border-gray-600/50"
                    : "bg-gray-100/80 text-gray-700 border-gray-300/50"
                } backdrop-blur-sm flex items-center max-w-14 gap-1`}
              >
                <CategoryIcon className="h-3 w-3" />
                {agent.category}
              </Badge>
            </div>
            {/* <div className="text-right">
              <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {agent.price}
              </div>
              <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>per month</div>
            </div> */}
          </motion.div>

          <motion.div
            className="mb-4 flex-1"
            style={{
              transform: "translateZ(25px)",
            }}
          >
            <p
              className={`text-sm leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-600"}`}
            >
              {agent.description}
            </p>
          </motion.div>

          {agent.features.length > 0 && (
            <motion.div
              className="mb-4"
              style={{
                transform: "translateZ(20px)",
              }}
            >
              <h4
                className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
                  darkMode ? "text-gray-200" : "text-gray-700"
                }`}
              >
                <Sparkles className="h-4 w-4 text-yellow-500" />
                Key Features
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {agent.features.slice(0, 3).map((feature, index) => (
                  <motion.div
                    key={index}
                    className={`text-xs flex items-center gap-2 p-2 rounded-lg ${
                      darkMode ? "bg-gray-800/50" : "bg-white/50"
                    } backdrop-blur-sm border border-white/10`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex-shrink-0" />
                    <span className={`truncate ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
                      {feature}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            className="flex items-center justify-between mb-6"
            style={{
              transform: "translateZ(25px)",
            }}
          >
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span
                  className={`font-semibold text-sm ${
                    darkMode ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {agent.rating}
                </span>
              </div>
              <div
                className={`flex items-center space-x-1 text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                <Users className="h-3 w-3" />
                <span>{agent.users.toLocaleString()}</span>
              </div>
            </div>
            {isHired && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 text-green-500"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Active</span>
              </motion.div>
            )}
          </motion.div>

          <motion.div
            className="mt-auto"
            style={{
              transform: "translateZ(35px)",
            }}
          >
            {isHired ? (
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg"
                  variant="outline"
                  disabled
                  size="sm"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Hired
                </Button>
                {isGeneralAgent ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled
                          className="shadow-lg cursor-not-allowed"
                        >
                          Default
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        className={`rounded-lg border px-3 py-2 text-sm shadow-lg ${darkMode ? "bg-gray-800 text-gray-200 border-gray-700" : "bg-white text-gray-700 border-gray-200"}`}
                      >
                        <p>This is a core agent and cannot be removed.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleUnhire}
                    disabled={loading === `unhire-${agent.id}`}
                    className={`shadow-lg hover:shadow-xl transition-all ${darkMode ? "bg-red-900/50 text-red-400/40 border border-red-500/30 hover:bg-red-900/80 hover:text-red-300" : "bg-red-400/70 text-white hover:bg-red-600"}`}
                  >
                    {loading === `unhire-${agent.id}` ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      "Remove"
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                onClick={handleHire}
                disabled={loading === agent.id}
                size="sm"
              >
                {loading === agent.id ? (
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    Hiring...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Hire Agent
                  </div>
                )}
              </Button>
            )}
          </motion.div>
        </div>

        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
          initial={{ x: "-100%" }}
          animate={{ x: isHovering ? "100%" : "-100%" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      </motion.div>

      {showTooltip && (
        <motion.div
          className="pointer-events-none absolute left-0 top-0 rounded-lg bg-black/90 backdrop-blur-sm text-white px-3 py-2 text-xs opacity-0 z-50 border border-white/10"
          style={{
            x,
            y,
            opacity,
            rotate: rotateFigcaption,
          }}
        >
          <div className="font-semibold">{agent.name}</div>
          <div className="opacity-70">
            {agent.category} • {agent.rating}★
          </div>
        </motion.div>
      )}
    </figure>
  );
}
