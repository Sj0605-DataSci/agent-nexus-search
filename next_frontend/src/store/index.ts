import { configureStore } from "@reduxjs/toolkit";
import themeReducer from "./themeSlice";
import agentsReducer from "./agentsSlice";

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    agents: agentsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
