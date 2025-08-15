import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { UserProfile, ApiResponse, AuthResponse } from "@/integrations/fastapi/types";
import { apiClient } from "@/integrations/fastapi/client";

// Using the imported UserProfile type from types.ts
interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: ProfileState = {
  profile: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

export const fetchProfile = createAsyncThunk(
  "profile/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.fetchProfile();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch profile");
    }
  }
);

export const loginUser = createAsyncThunk(
  "profile/loginUser",
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.handleLoginWithStorage(email, password);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || "Login failed");
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  "profile/updateProfile",
  async (data: { email_subscription: boolean }, { rejectWithValue }) => {
    try {
      const response = await apiClient.updateProfile(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    clearProfile: state => {
      state.profile = null;
      state.error = null;
      state.isAuthenticated = false;
      if (typeof window !== "undefined") {
        localStorage.removeItem("discover_minds_access_token");
        localStorage.removeItem("discover_minds_refresh_token");
      }
    },
    setProfileData: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload;
      state.loading = false;
      state.error = null;
      state.isAuthenticated = true;
    },
    setProfileFromAPI: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload;
      state.isAuthenticated = true;
    },
    updateSubscriptionOptimistic: (state, action: PayloadAction<boolean>) => {
      if (state.profile) {
        state.profile.email_subscription = action.payload;
      }
    },
    setLoadingState: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchProfile.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.success && action.payload.status_code === 200) {
          state.profile = action.payload.data;
          state.isAuthenticated = true;
        } else {
          state.error = action.payload.message || "Failed to fetch profile";
        }
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateUserProfile.fulfilled, state => {
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        if (state.profile) {
          // Revert the optimistic update
          state.profile.email_subscription = !state.profile.email_subscription;
        }
        state.error = (action.payload as string) || "Failed to update profile";
      })
      .addCase(loginUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.success && action.payload.status_code === 200) {
          state.isAuthenticated = true;
        } else {
          state.error = action.payload.message || "Login failed";
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Login failed";
      });
  },
});

export const { clearProfile, setProfileData, setLoadingState } = profileSlice.actions;
export default profileSlice.reducer;
