import type { SpringOptions } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { capitalizeText } from "@/utils/globalconstant";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Star, Users, CheckCircle, Sparkles, Zap, Crown } from "lucide-react";
import Image from "next/image";
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
  agentImageUrl?: string;
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
  containerHeight = "auto",
  containerWidth = "100%",
  cardHeight = "auto",
  cardWidth = "100%",
  scaleOnHover = 1.04,
  rotateAmplitude = 6,
  showMobileWarning = false,
  showTooltip = true,
  darkMode = false,
}: AgentMarketplaceCardProps) {
  const ref = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Motion values
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

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  function handleMouse(e: React.MouseEvent<HTMLElement>) {
    if (!ref.current || isMobile) return;

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
    if (isMobile) return;
    setIsHovering(true);
    scale.set(scaleOnHover);
    opacity.set(1);
    glowOpacity.set(0.6);
  }

  function handleMouseLeave() {
    if (isMobile) return;
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
      className={`relative w-full ${
        isMobile ? "h-auto" : "h-full [perspective:1000px]"
      } flex flex-col items-center justify-center group`}
      style={{
        height: isMobile ? "auto" : containerHeight,
        width: containerWidth,
      }}
      onMouseMove={handleMouse}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className={`relative ${
          isMobile ? "" : "[transform-style:preserve-3d]"
        } rounded-xl sm:rounded-2xl border backdrop-blur-sm overflow-hidden transition-all duration-300 w-full ${
          darkMode
            ? "bg-gray-900/80 border-gray-700/50 shadow-lg sm:shadow-2xl"
            : "bg-white/90 border-gray-200/50 shadow-lg sm:shadow-xl"
        }`}
        style={{
          width: cardWidth,
          height: isMobile ? "auto" : cardHeight,
          rotateX: isMobile ? 0 : rotateX,
          rotateY: isMobile ? 0 : rotateY,
          scale: isMobile ? 1 : scale,
          minHeight: isMobile ? "400px" : "auto",
        }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-50`} />

        <div className="relative z-10 p-4 sm:p-6 h-full flex flex-col">
          {/* Header Section */}
          <motion.div
            className="flex items-start space-x-3 sm:space-x-4 mb-4"
            style={{
              transform: isMobile ? "none" : "translateZ(30px)",
            }}
          >
            <div className="relative flex-shrink-0">
              {agent.agentImageUrl ? (
                <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden">
                  <Image
                    src={agent.agentImageUrl}
                    alt={`${agent.name} avatar`}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="text-3xl sm:text-5xl">{agent.avatar}</div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3
                className={`text-lg sm:text-xl font-bold mb-2 truncate ${
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
                } backdrop-blur-sm flex items-center gap-1 text-xs sm:text-sm px-2 py-1`}
              >
                <CategoryIcon className="h-3 w-3" />
                <span className="hidden sm:inline">{capitalizeText(agent.category)}</span>
                <span className="sm:hidden">{agent.category.split(" ")[0]}</span>
              </Badge>
            </div>

            {/* Status indicator */}
            <motion.div
              className="flex items-center justify-center"
              style={{
                transform: isMobile ? "none" : "translateZ(25px)",
              }}
            >
              {isHired && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 text-green-500"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium hidden sm:inline">Active</span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>

          {/* Description */}
          <motion.div
            className="mb-4 flex-1 min-h-[100px] "
            style={{
              transform: isMobile ? "none" : "translateZ(25px)",
            }}
          >
            <p
              className={`text-sm leading-relaxed line-clamp-3 sm:line-clamp-none ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {agent.description}
            </p>
          </motion.div>

          {/* Features */}
          {agent.features.length > 0 && (
            <motion.div
              className="mb-4 sm:mb-6"
              style={{
                transform: isMobile ? "none" : "translateZ(20px)",
              }}
            >
              <h4
                className={`text-sm font-semibold mb-2 sm:mb-3 flex items-center gap-2 ${
                  darkMode ? "text-gray-200" : "text-gray-700"
                }`}
              >
                <Sparkles className="h-4 w-4 text-yellow-500" />
                Key Features
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {agent.features.slice(0, isMobile ? 2 : 3).map((feature, index) => (
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
                {isMobile && agent.features.length > 2 && (
                  <div
                    className={`text-xs text-center py-1 ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    +{agent.features.length - 2} more features
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <motion.div
            className="mt-auto"
            style={{
              transform: isMobile ? "none" : "translateZ(35px)",
            }}
          >
            {isHired ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1  min-h-[40px] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg text-sm h-9 sm:h-10"
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
                          className={`shadow-lg cursor-not-allowed transition-colors duration-300 text-sm h-9 sm:h-10 sm:flex-none ${
                            darkMode
                              ? "bg-gray-800/80 text-gray-400 border border-gray-700/50 hover:bg-gray-700/80"
                              : "bg-gray-100/80 text-gray-500 border border-gray-300/50 hover:bg-gray-200/80"
                          }`}
                        >
                          Default
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        className={`rounded-lg border px-3 py-2 text-sm shadow-lg ${
                          darkMode
                            ? "bg-gray-800 text-gray-200 border-gray-700"
                            : "bg-white text-gray-700 border-gray-200"
                        }`}
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
                    className={`shadow-lg hover:shadow-xl transition-all duration-300 text-sm h-9 sm:h-10 sm:flex-none ${
                      darkMode
                        ? "bg-red-900/60 text-red-300 border border-red-700/40 hover:bg-red-800/70 hover:text-red-200"
                        : "bg-red-500/60 text-white border border-red-400/30 hover:bg-red-600"
                    } ${loading === `unhire-${agent.id}` ? "opacity-80" : ""}`}
                  >
                    {loading === `unhire-${agent.id}` ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className={`w-4 h-4 border-2 rounded-full ${
                          darkMode
                            ? "border-red-300 border-t-transparent"
                            : "border-white border-t-transparent"
                        }`}
                      />
                    ) : (
                      "Remove"
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold text-sm h-10 sm:h-11"
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
                    <span className="hidden sm:inline">Hiring...</span>
                    <span className="sm:hidden">...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span className="hidden sm:inline">Hire Agent</span>
                    <span className="sm:hidden">Hire</span>
                  </div>
                )}
              </Button>
            )}
          </motion.div>
        </div>

        {/* Shine effect - only on desktop */}
        {!isMobile && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
            initial={{ x: "-100%" }}
            animate={{ x: isHovering ? "100%" : "-100%" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        )}
      </motion.div>

      {/* Tooltip - only show on desktop */}
      {showTooltip && !isMobile && (
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
        </motion.div>
      )}
    </figure>
  );
}
