import React from "react";
import {
  AtSign,
  Linkedin,
  Github,
  Twitter,
  Instagram,
  MessageSquare,
  BookOpenText,
  Search,
  Laptop2,
  Apple,
  Package,
  Film,
  Music,
  Code,
  ExternalLink,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

// Domain to icon mapping with colors
const DOMAIN_ICONS: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  "linkedin.com": { icon: Linkedin, color: "#0A66C2", label: "LinkedIn" },
  "github.com": { icon: Github, color: "#181717", label: "GitHub" },
  "twitter.com": { icon: Twitter, color: "#000000", label: "X (Twitter)" },
  "facebook.com": { icon: ExternalLink, color: "#1877F2", label: "Facebook" },
  "youtube.com": { icon: ExternalLink, color: "#FF0000", label: "YouTube" },
  "youtu.be": { icon: ExternalLink, color: "#FF0000", label: "YouTube" },
  "instagram.com": { icon: Instagram, color: "#E4405F", label: "Instagram" },
  "reddit.com": { icon: MessageSquare, color: "#FF4500", label: "Reddit" },
  "medium.com": { icon: BookOpenText, color: "#000000", label: "Medium" },
  "stackoverflow.com": { icon: ExternalLink, color: "#F48024", label: "Stack Overflow" },
  "google.com": { icon: Search, color: "#4285F4", label: "Google" },
  "microsoft.com": { icon: Laptop2, color: "#00A4EF", label: "Microsoft" },
  "apple.com": { icon: Apple, color: "#000000", label: "Apple" },
  "amazon.com": { icon: Package, color: "#FF9900", label: "Amazon" },
  "netflix.com": { icon: Film, color: "#E50914", label: "Netflix" },
  "spotify.com": { icon: Music, color: "#1DB954", label: "Spotify" },
  "dev.to": { icon: Code, color: "#0A0A0A", label: "Dev.to" },
};

const DEFAULT_ICON = {
  icon: ExternalLink,
  color: "#6B7280",
  label: "Website",
};

interface SocialLink {
  url: string;
  label?: string;
}

interface SocialLinksProps {
  email?: string | null;
  socialLinks?: string | string[] | null;
  maxLinks?: number;
  className?: string;
  iconSize?: string;
  textSize?: string;
  showTooltip?: boolean;
  showLabels?: boolean;
}

const getDomain = (url: string): string => {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
  } catch {
    return "";
  }
};

const getDomainIcon = (url: string) => {
  if (!url) return DEFAULT_ICON;

  try {
    const domain = getDomain(url).toLowerCase();
    if (!domain) return DEFAULT_ICON;

    // Try exact matches first
    for (const [key, value] of Object.entries(DOMAIN_ICONS)) {
      if (domain === key || domain.endsWith(`.${key}`)) {
        return { ...value, label: value.label || key };
      }
    }

    // Try partial matches
    for (const [key, value] of Object.entries(DOMAIN_ICONS)) {
      if (domain.includes(key)) {
        return { ...value, label: value.label || key };
      }
    }

    // Special cases
    if (domain.includes("facebook") || domain.includes("fb.")) {
      return { ...DOMAIN_ICONS["facebook.com"], label: "Facebook" };
    }

    return { ...DEFAULT_ICON, label: domain || "Link" };
  } catch (error) {
    return DEFAULT_ICON;
  }
};

const parseSocialLinks = (socialLinks?: string | string[] | null): SocialLink[] => {
  if (!socialLinks) return [];

  if (Array.isArray(socialLinks)) {
    return socialLinks.filter(Boolean).map(link => ({
      url: link.startsWith("http") ? link : `https://${link}`,
      label: getDomain(link),
    }));
  }

  try {
    // Handle string that looks like an array with single quotes
    const trimmed = socialLinks.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      // Try to parse as JSON first (for valid JSON)
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((link: any) => typeof link === 'string' && link.trim())
            .map((link: string) => ({
              url: link.startsWith("http") ? link : `https://${link}`,
              label: getDomain(link),
            }));
        }
      } catch (e) {
        // If JSON parsing fails, try to parse as string array
        const links = trimmed
          .slice(1, -1) // Remove the square brackets
          .split(",")
          .map(link => link.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
          
        return links.map(link => ({
          url: link.startsWith("http") ? link : `https://${link}`,
          label: getDomain(link),
        }));
      }
    }

    // Handle comma-separated string (fallback)
    return socialLinks
      .split(",")
      .map(link => link.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean)
      .map(link => ({
        url: link.startsWith("http") ? link : `https://${link}`,
        label: getDomain(link),
      }));
  } catch (error) {
    console.error("Error parsing SocialLinks:", error);
    return [];
  }
};

export const SocialLinks: React.FC<SocialLinksProps> = ({
  email,
  socialLinks,
  maxLinks = 5,
  className = "",
  iconSize = "w-4 h-4",
  textSize = "text-xs",
  showTooltip = true,
  showLabels = true,
}) => {
  const parsedEmail = email && email !== "NULL" && email !== "null" ? email : null;
  const links = parseSocialLinks(socialLinks).slice(0, maxLinks);

  const renderLink = (link: SocialLink, index: number) => {
    const { icon: Icon, color, label } = getDomainIcon(link.url);
    const displayLabel = link.label || label || "Link";

    const linkContent = (
      <a
        key={`social-${index}`}
        href={link.url}
        target="_blank"
        className={`flex items-center gap-1 hover:opacity-80 transition-opacity ${textSize}`}
        style={{ color }}
        aria-label={displayLabel}
      >
        <Icon className={`${iconSize} flex-shrink-0`} />
        {showLabels && (
          <span className="truncate max-w-[160px]">
            {displayLabel.length > 30 ? `${displayLabel.substring(0, 27)}...` : displayLabel}
          </span>
        )}
      </a>
    );

    return showTooltip ? (
      <TooltipProvider key={`tooltip-${index}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex">{linkContent}</div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-white rounded-lg shadow-md border border-gray-100 p-0"
          >
            <div className="p-2 max-w-xs">
              <p className="text-sm text-gray-800 break-all">{link.url}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      linkContent
    );
  };

  const renderEmail = () => {
    if (!parsedEmail) return null;

    const emailContent = (
      <a
        href={`mailto:${parsedEmail}`}
        className={`flex items-center gap-1 text-[#666666] hover:opacity-80 transition-opacity ${textSize}`}
        aria-label={`Email ${parsedEmail}`}
      >
        <AtSign className={iconSize} />
        {showLabels && <span className="truncate max-w-[160px]">{parsedEmail}</span>}
      </a>
    );

    return showTooltip ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex">{emailContent}</div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-white rounded-lg shadow-md border border-gray-100 p-0">
            <div className="p-2 max-w-xs">
              <p className="text-sm text-gray-800 break-all">{parsedEmail}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      emailContent
    );
  };

  return (
    <div className={`flex ${showLabels ? 'flex-col' : 'flex-row'} gap-1 ${className}`}>
      {renderEmail()}
      {links.map((link, index) => renderLink(link, index))}
    </div>
  );
};

export default SocialLinks;
