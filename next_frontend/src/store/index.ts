import { configureStore } from "@reduxjs/toolkit";

import agentsReducer from "./agentsSlice";
import uiReducer from "./uiSlice";
import profileReducer from "./profileSlice";
import chatThreadsReducer from "./chatThreadsSlice";

export const store = configureStore({
  reducer: {
    agents: agentsReducer,
    ui: uiReducer,
    profile: profileReducer,
    chatThreads: chatThreadsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
