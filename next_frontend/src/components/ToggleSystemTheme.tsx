"use client";
import { FaSun, FaMoon } from "react-icons/fa";
import { toggleTheme } from "@/store/themeSlice";
import { useAppDispatch, useAppSelector } from "@/store";

/**
 * A reusable one–click theme switcher.
 *
 * Props
 * ─────────
 * - `className?`  : Tailwind / custom classes you want to add.
 * - `size?`       : Icon size in **pixels** (defaults to 16).
 * - `rounded?`    : If `false` the wrapper isn't rounded (defaults `true`).
 */

// const darkMode = useAppSelector((s) => s.theme.dark);

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
      className={`inline-flex items-center justify-center p-2 rounded-full bg-opacity-20 backdrop-blur-md transition-colors duration-300
        ${darkMode ? "bg-gray-800 text-yellow-300" : "bg-gray-200 text-blue-600"}
        ${className}`}
    >
      {darkMode ? <FaSun size={size} /> : <FaMoon size={size} />}
    </button>
  );
};

export default ToggleSystemTheme;
