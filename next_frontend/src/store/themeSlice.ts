import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ThemeState {
  dark: boolean;
}

const getInitial = (): boolean => {
  if (typeof window === "undefined") return true; // during SSR
  const stored = localStorage.getItem("discover_minds_theme");
  return stored ? stored === "dark" : true; // default dark
};

const initialState: ThemeState = { dark: getInitial() };

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggleTheme(state) {
      state.dark = !state.dark;
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "discover_minds_theme",
          state.dark ? "dark" : "light"
        );
        // put the class on <html> so Tailwind “dark:” utilities work
        document.documentElement.classList.toggle("dark", state.dark);
      }
    },
    setTheme(state, action: PayloadAction<"dark" | "light">) {
      state.dark = action.payload === "dark";
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
