import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./index";

interface UIState {
  sidebarCollapsed: boolean;
}

const initialState: UIState = {
  sidebarCollapsed: false,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarCollapsed } = uiSlice.actions;

export const selectSidebarCollapsed = (state: RootState) => state.ui.sidebarCollapsed;

export default uiSlice.reducer;
