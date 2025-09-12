export const saveTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("discover_minds_access_token", accessToken);
    localStorage.setItem("discover_minds_refresh_token", refreshToken);
  } catch (error) {
    console.error("Failed to save tokens to localStorage:", error);
  }
};

export const clearTokens = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("discover_minds_access_token");
    localStorage.removeItem("discover_minds_refresh_token");
  } catch (error) {
    console.error("Failed to clear tokens from localStorage:", error);
  }
};

export const getStoredToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("discover_minds_access_token");
};

export const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("discover_minds_refresh_token");
};
