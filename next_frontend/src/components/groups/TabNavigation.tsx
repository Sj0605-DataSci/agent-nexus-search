import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, List, Puzzle, Settings } from "lucide-react";
import { useMemo } from "react";

type Tab = {
  href: string;
  icon: React.ReactNode;
  label: string;
};

export function TabNavigation({ groupId }: { groupId: string }) {
  const pathname = usePathname();

  const tabs = useMemo(
    () => [
      { href: `/groups/${groupId}`, icon: <Users className="size-4" />, label: "Group" },
      { href: `/groups/${groupId}/members`, icon: <List className="size-4" />, label: "Members" },
      {
        href: `/groups/${groupId}/integrations`,
        icon: <Puzzle className="size-4" />,
        label: "Integrations",
      },
      {
        href: `/groups/${groupId}/settings`,
        icon: <Settings className="size-4" />,
        label: "Settings",
      },
    ],
    [groupId]
  );

  // More precise active tab detection
  const isActive = useMemo(() => {
    // Handle null pathname
    if (!pathname) {
      return (href: string) => false;
    }

    // Exact match for root group page
    if (pathname === `/groups/${groupId}`) {
      return (href: string) => href === `/groups/${groupId}`;
    }

    // For other pages, match the specific path
    return (href: string) => {
      if (href === `/groups/${groupId}`) {
        return false; // Root path is only active when exact match
      }
      return pathname.startsWith(href);
    };
  }, [pathname, groupId]);

  return (
    <div className="mt-4 flex flex-col">
      <div className="relative flex flex-row gap-2 overflow-x-auto pb-2 scrollbar-hide md:overflow-x-visible md:pb-0">
        {tabs.map(tab => {
          const active = isActive(tab.href);
          return (
            <Link key={tab.href} className="relative" href={tab.href} prefetch>
              <button
                className={`justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 py-2 flex h-8 shrink-0 items-center gap-2 px-2 transition-colors ${active ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </button>
              {active && <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary" />}
            </Link>
          );
        })}
      </div>
      <div
        data-orientation="horizontal"
        role="none"
        className="shrink-0 bg-border h-[1px] w-full mb-4 mt-0 md:mt-2"
      />
    </div>
  );
}
