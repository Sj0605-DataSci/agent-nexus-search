import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ThemeState {
  dark: boolean;
}

const getInitial = (): boolean => {
  if (typeof window === "undefined") return true; // SSR default
  const stored = localStorage.getItem("discover_minds_theme");
  const isDark = stored ? stored === "dark" : true;
  document.documentElement.classList.toggle("dark", isDark);
  return isDark;
};

const initialState: ThemeState = { dark: getInitial() };

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggleTheme(state) {
      state.dark = !state.dark;
      if (typeof window !== "undefined") {
        const mode = state.dark ? "dark" : "light";
        localStorage.setItem("discover_minds_theme", mode);
        document.documentElement.classList.toggle("dark", state.dark);
      }
    },
    setTheme(state, action: PayloadAction<"dark" | "light">) {
      const dark = false;
      state.dark = dark;
      if (typeof window !== "undefined") {
        localStorage.setItem("discover_minds_theme", "light");
        document.documentElement.classList.toggle("dark", dark);
      }
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
