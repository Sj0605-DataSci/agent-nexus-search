import React from "react";

interface ShimmerLoaderProps {
  count?: number;
  collapsed: boolean;
  darkMode: boolean;
}

const ShimmerLoader: React.FC<ShimmerLoaderProps> = ({ count = 4, collapsed, darkMode }) => {
  return (
    <ul className="space-y-1 py-1 px-1">
      {[...Array(count)].map((_, index) => (
        <li key={`shimmer-${index}`} className="animate-pulse h-[34px]">
          <div
            className={`flex items-center py-2 rounded-md ${
              collapsed ? "justify-center" : "gap-2 px-2"
            } ${darkMode ? "bg-gray-800/30" : "bg-gray-100/70"}`}
          >
            <div
              className={`flex-shrink-0 ${
                darkMode ? "bg-gray-700" : "bg-gray-300"
              } rounded-full h-4 w-4`}
            ></div>

            {!collapsed && (
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <div
                    className={`h-4 ${
                      darkMode ? "bg-gray-700" : "bg-gray-300"
                    } rounded ${index % 2 === 0 ? "w-3/4" : "w-2/3"}`}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default ShimmerLoader;
