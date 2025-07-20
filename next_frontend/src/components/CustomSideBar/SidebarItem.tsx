import Link from "next/link";

interface SidebarItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  collapsed: boolean;
  darkMode: boolean;
}

const SidebarItem = ({ href, label, icon, active, collapsed, darkMode }: SidebarItemProps) => {
  return (
    <li>
      <Link
        href={href}
        prefetch={true}
        className={`group flex items-center rounded-lg py-2 text-sm font-medium transition-colors
          ${collapsed ? "justify-center" : "gap-3 pl-2 pr-4"}
          ${
            active
              ? darkMode
                ? "bg-indigo-600/20 text-indigo-300"
                : "bg-indigo-100 text-indigo-700"
              : darkMode
                ? "text-gray-400 hover:text-white hover:bg-gray-800/60"
                : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
          }
        `}
      >
        <span className="relative group">
          <span className="text-lg">{icon}</span>
          {/* Info: Will cater later */}
          {/* {collapsed && (
            <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-xs text-white bg-black rounded shadow-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 transition-opacity">
              {label}
            </span>
          )} */}
        </span>
        {!collapsed && <span>{label}</span>}
      </Link>
    </li>
  );
};

export default SidebarItem;
