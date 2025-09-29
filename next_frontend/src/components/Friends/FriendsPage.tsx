"use client";

import React, { useState, useCallback } from "react";
import { FiLink } from "react-icons/fi";
import toast from "react-hot-toast";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store";
import ComingSoonOverlay from "@/components/ComingSoonOverlay";
import { showDevFeatureToast } from "@/utils/toast";
import { isValidEmail } from "@/utils/formUtils";
import { apiClient } from "@/integrations/fastapi/client";
import { Friendship, FriendshipStatus } from "@/integrations/fastapi/types";
import { respondToFriendRequest, revokeFriendRequest } from "@/store/friendshipsSlice";
import FriendCardSkeleton from "./FriendCardSkeleton";

const FriendListSection: React.FC<{
  title: string;
  count: number;
  friends: Friendship[];
  status: FriendshipStatus | "accepted";
  loading: boolean;
  dispatch: ReturnType<typeof useAppDispatch>;
  currentUserId: string | undefined;
}> = ({ title, count, friends, status, loading, dispatch, currentUserId }) => {
  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">
          {title} ({count})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <FriendCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        {title} ({count})
      </h2>
      {friends.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {friends.map(friend => (
            <div
              key={friend.id}
              className="bg-white rounded-lg shadow-md p-4 transition-transform transform hover:scale-105 overflow-hidden"
            >
              <div className="flex items-center space-x-4">
                {/* <img
                  src={friend.linkedin_profile_photo || "/default-avatar.png"}
                  alt={friend.full_name}
                  className="w-16 h-16 rounded-full border-2 border-gray-200"
                /> */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg truncate">{friend.full_name}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {friend.headline || friend.email}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                {status === "pending" && friend.user_id !== currentUserId && (
                  <>
                    <Button
                      variant="decline"
                      size="sm"
                      onClick={() =>
                        dispatch(
                          respondToFriendRequest({
                            friendshipId: friend.friendship_id,
                            status: "rejected",
                          })
                        )
                      }
                    >
                      Decline
                    </Button>
                    <Button
                      variant="accept"
                      size="sm"
                      onClick={() =>
                        dispatch(
                          respondToFriendRequest({
                            friendshipId: friend.friendship_id,
                            status: "accepted",
                          })
                        )
                      }
                    >
                      Accept
                    </Button>
                  </>
                )}
                {status === "sent" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => dispatch(revokeFriendRequest(friend.friendship_id))}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-gray-100 border-dashed rounded-lg">
          <img src="/search/NoDataFound.svg" alt="No Data Found" className="w-10 h-10 mb-4" />
          <p className="text-muted-foreground">No {title.toLowerCase()} found.</p>
        </div>
      )}
    </div>
  );
};

export default function FriendsPage() {
  const dispatch = useAppDispatch();
  // const [searchQuery, setSearchQuery] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { profile, loading: profileLoading } = useAppSelector(state => state.profile);
  const {
    data: friendshipsData,
    status: friendshipsStatus,
    error: friendshipsError,
  } = useAppSelector(state => state.friendships);
  const isAuthenticated = !!profile?.id;

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const addEmail = useCallback(
    (email: string) => {
      let processedEmail = email.trim();

      const emailMatch = processedEmail.match(/<([^>]+)>/);
      if (emailMatch) {
        processedEmail = emailMatch[1];
      }

      const trimmedEmail = processedEmail.replace(/^['"<]|['">,;]$/g, "").trim();
      if (
        trimmedEmail &&
        isValidEmail(trimmedEmail) &&
        !emails.includes(trimmedEmail) &&
        emails.length < 3
      ) {
        setEmails(prevEmails => [...prevEmails, trimmedEmail]);
        setInputValue("");
        return true;
      } else if (trimmedEmail && !isValidEmail(trimmedEmail)) {
        toast.error("Please enter a valid email address.");
      } else if (emails.length >= 3) {
        toast.error("You can add up to 3 emails only.");
        setInputValue("");
      }
      return false;
    },
    [emails, isValidEmail]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addEmail(inputValue);
      }
    },
    [inputValue, addEmail]
  );

  const removeEmail = useCallback(
    (indexToRemove: number) => {
      setEmails(emails.filter((_, index) => index !== indexToRemove));
    },
    [emails]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const paste = e.clipboardData.getData("text");
      const pastedEmails = paste.split(/[,\s]+/).filter(Boolean);
      pastedEmails.forEach(email => addEmail(email));
    },
    [addEmail]
  );

  const handleBlur = useCallback(() => {
    if (inputValue) {
      addEmail(inputValue);
    }
  }, [inputValue, addEmail]);

  const handleSend = useCallback(async () => {
    let finalEmails = [...emails];
    if (inputValue) {
      if (addEmail(inputValue)) {
        finalEmails.push(inputValue.trim());
      } else {
        return; // Stop if the last email is invalid
      }
    }

    if (finalEmails.length === 0) {
      toast.error("Please add at least one email.");
      return;
    }

    setIsSending(true);
    try {
      const response = await apiClient.inviteFriends(finalEmails);

      if (response.success) {
        const { invited, existing_friends, errors } = response.data;

        if (invited.length > 0) {
          toast.success(`Successfully sent ${invited.length} invitation(s).`);
        }
        if (existing_friends.length > 0) {
          toast.success(`${existing_friends.length} user(s) are already your friend.`);
        }
        if (errors.length > 0) {
          errors.forEach((error: any) =>
            toast.error(`Error inviting ${error.email}: ${error.error}`)
          );
        }

        setEmails([]);
        setInputValue("");
      } else {
        toast.error(response.message || "An unexpected error occurred.");
      }
    } catch (error) {
      console.error("Failed to send invitations:", error);
      toast.error("Failed to send invitations. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [emails, inputValue, addEmail]);

  return (
    <div className="relative">
      {!isAuthenticated && !profileLoading && <ComingSoonOverlay />}

      <div
        className={`container mx-auto px-4 ${!isAuthenticated && !profileLoading ? "opacity-30 pointer-events-none" : ""}`}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Friends</h1>
          <p className="text-muted-foreground">Friends can search each other's connections.</p>
        </div>

        {/* <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search all users..."
            className="flex h-10 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1.5 pl-10 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div> */}

        <div className="rounded-lg border bg-card text-card-foreground border-[#5D9CEC50] bg-[#5D9CEC10]/50">
          <div className="flex flex-col space-y-1 p-3 md:p-6">
            <h3 className="font-semibold tracking-tight flex items-center gap-2 text-lg md:text-xl">
              Invite friends
            </h3>
            <p className="text-sm text-[#71717a] text-muted-foreground">
              Type or paste in emails below, separated by commas.
            </p>
          </div>
          <div className="p-2 md:px-6 pt-0 mt-2">
            <div className="space-y-6">
              <form className="flex flex-col gap-4" onSubmit={e => e.preventDefault()}>
                <div className="space-y-2 flex-1">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="text-sm font-medium">Email addresses</div>
                    </div>
                    <div className="min-h-[2.25rem] w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors relative flex flex-wrap items-start gap-1">
                      <span
                        className={`pointer-events-none absolute left-3 text-gray-400 top-2 text-sm text-muted-foreground ${emails ? "hidden" : ""}`}
                      >
                        john@gmail.com, jane@outlook.com, etc.
                      </span>
                      <div className="flex w-full flex-wrap items-center gap-1">
                        {emails.map((email, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-blue-100 border border-blue-200 rounded-full px-3 py-0.5 text-sm text-blue-800"
                          >
                            <span>{email}</span>
                            <button
                              onClick={() => removeEmail(index)}
                              className="text-blue-500 hover:text-blue-700 transition-colors duration-200"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <input
                          className="flex-1 bg-transparent h-[26px] p-0 outline-none placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          value={inputValue}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          onPaste={handlePaste}
                          onBlur={handleBlur}
                          placeholder={
                            emails.length > 0 ? "" : "john@gmail.com, jane@outlook.com, etc."
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleSend}
                    className="bg-[#5D9CEC] hover:bg-green-700 text-white h-9 px-4 py-2 gap-2"
                    type="button"
                    disabled={isSending}
                  >
                    Send
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="space-y-12 mt-8">
          <FriendListSection
            title="Your Friends"
            count={friendshipsData.total_friends}
            friends={friendshipsData.accepted}
            status="accepted"
            loading={friendshipsStatus === "loading"}
            dispatch={dispatch}
            currentUserId={profile?.id}
          />
          {friendshipsData.total_pending > 0 && (
            <FriendListSection
              title="Pending Invitations"
              count={friendshipsData.total_pending}
              friends={friendshipsData.pending}
              status="pending"
              loading={friendshipsStatus === "loading"}
              dispatch={dispatch}
              currentUserId={profile?.id}
            />
          )}
          <FriendListSection
            title="Sent Requests"
            count={friendshipsData.total_sent}
            friends={friendshipsData.sent}
            status="sent"
            loading={friendshipsStatus === "loading"}
            dispatch={dispatch}
            currentUserId={profile?.id}
          />
        </div>
      </div>
    </div>
  );
}
