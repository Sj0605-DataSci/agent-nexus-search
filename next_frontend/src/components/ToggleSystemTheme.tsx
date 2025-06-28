"use client";

import { FaSun, FaMoon } from "react-icons/fa";
import { toggleTheme } from "@/store/themeSlice";
import { useAppDispatch, useAppSelector } from "@/store";

type ToggleSystemThemeProps = {
  className?: string;
  size?: number;
  rounded?: boolean;
};

const ToggleSystemTheme = ({
  className = "",
  size = 16,
  rounded = true,
}: ToggleSystemThemeProps) => {
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector(s => s.theme.dark);

  return (
    <button
      aria-label="Toggle dark / light theme"
      onClick={() => dispatch(toggleTheme())}
      className={`inline-flex items-center rounded-full justify-center p-2 bg-opacity-20 backdrop-blur-md transition-colors duration-300
        ${darkMode ? "bg-gray-800 text-yellow-300" : "bg-gray-200 text-blue-600"}
        ${className}`}
    >
      {darkMode ? <FaSun size={size} /> : <FaMoon size={size} />}
    </button>
  );
};

export default ToggleSystemTheme;
