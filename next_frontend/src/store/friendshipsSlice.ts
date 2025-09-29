import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiClient } from "@/integrations/fastapi/client";
import { FriendshipsData, FriendshipStatus } from "@/integrations/fastapi/types";

interface FriendshipsState {
  data: FriendshipsData;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: FriendshipsState = {
  data: {
    accepted: [],
    pending: [],
    sent: [],
    total_friends: 0,
    total_pending: 0,
    total_sent: 0,
  },
  status: "idle",
  error: null,
};

export const fetchFriendships = createAsyncThunk(
  "friendships/fetchFriendships",
  async (type: FriendshipStatus | "all" = "all", { rejectWithValue }) => {
    try {
      const response = await apiClient.fetchFriendships(type);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const respondToFriendRequest = createAsyncThunk(
  "friendships/respondToFriendRequest",
  async (
    { friendshipId, status }: { friendshipId: string; status: "accepted" | "rejected" },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.respondToFriendRequest(friendshipId, status);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const revokeFriendRequest = createAsyncThunk(
  "friendships/revokeFriendRequest",
  async (friendshipId: string, { rejectWithValue }) => {
    try {
      // We can reuse the 'rejected' status for revoking a sent request.
      const response = await apiClient.respondToFriendRequest(friendshipId, "rejected");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const friendshipsSlice = createSlice({
  name: "friendships",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchFriendships.pending, state => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchFriendships.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload;
      })
      .addCase(fetchFriendships.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(respondToFriendRequest.fulfilled, (state, action) => {
        const { friendship_id, status } = action.payload;
        const friendIndex = state.data.pending.findIndex(f => f.friendship_id === friendship_id);
        if (friendIndex !== -1) {
          const [friend] = state.data.pending.splice(friendIndex, 1);
          if (status === "accepted") {
            friend.status = "accepted";
            state.data.accepted.push(friend);
            state.data.total_friends += 1;
          }
          state.data.total_pending -= 1;
        }
      })
      .addCase(
        revokeFriendRequest.fulfilled,
        (state, action: PayloadAction<{ friendship_id: string }>) => {
          const { friendship_id } = action.payload;
          const friendIndex = state.data.sent.findIndex(f => f.friendship_id === friendship_id);
          if (friendIndex !== -1) {
            state.data.sent.splice(friendIndex, 1);
            state.data.total_sent -= 1;
          }
        }
      );
  },
});

export default friendshipsSlice.reducer;
