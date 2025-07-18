import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  email: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at: string | null;
  updated_at: string | null;
  has_connections: boolean;
}

interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  profile: null,
  loading: false,
  error: null,
};

export const fetchUserProfile = createAsyncThunk(
  "profile/fetchUserProfile",
  async (userId: string, { rejectWithValue }) => {
    try {
      // Fetch profile data from Supabase
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      // Check if user has connections
      let hasConnections = false;
      try {
        const { count } = await supabase
          .from("connections" as any)
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        hasConnections = count ? count > 0 : false;
      } catch (connError) {
        console.error("Error checking connections:", connError);
        // Continue with hasConnections = false
      }

      if (data) {
        return {
          ...data,
          has_connections: hasConnections,
        } as UserProfile;
      }
      
      return rejectWithValue("No profile data found");
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      return rejectWithValue(error.message || "Failed to fetch profile");
    }
  }
);

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    clearProfile: (state) => {
      state.profile = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action: PayloadAction<UserProfile>) => {
        state.profile = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearProfile } = profileSlice.actions;
export default profileSlice.reducer;
