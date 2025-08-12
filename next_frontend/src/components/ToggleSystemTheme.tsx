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
  return null;
};

export default ToggleSystemTheme;
