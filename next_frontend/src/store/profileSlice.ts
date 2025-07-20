import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { UserProfile } from "@/integrations/fastapi/types";

// Using the imported UserProfile type from types.ts
interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

interface LoginResponse {
  profile: {
    created_at: any;
    email: string;
    full_name: string;
    id: string;
    has_connections: boolean;
  };
  token: {
    access_token: string;
    refresh_token: string;
  };
}

const initialState: ProfileState = {
  profile: null,
  loading: false,
  error: null,
};



const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    clearProfile: state => {
      state.profile = null;
      state.error = null;
    },
    setProfileFromLogin: (state, action: PayloadAction<LoginResponse>) => {
      state.profile = {
        id: action.payload.profile.id,
        email: action.payload.profile.email,
        full_name: action.payload.profile.full_name,
        has_connections: action.payload.profile.has_connections,
        created_at: action.payload.profile.created_at,
      };
      state.loading = false;
      state.error = null;
    },
    setProfileFromAPI: (state, action: PayloadAction<UserProfile>) => {
      state.profile = {
        id: action.payload.id,
        email: action.payload.email,
        full_name: action.payload.full_name,
        has_connections: action.payload.has_connections,
        created_at: action.payload.created_at,
      };
      state.loading = false;
      state.error = null;
    },
  },

});

export const { clearProfile, setProfileFromLogin, setProfileFromAPI } = profileSlice.actions;
export default profileSlice.reducer;
