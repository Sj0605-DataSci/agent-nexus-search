import toast from "react-hot-toast";

interface ShareOptions {
  url: string;
  title?: string;
  text?: string;
}

/**
 * Handles sharing content via Web Share API (mobile) or clipboard (desktop)
 * @param options - Share options including url, title, and text
 * @returns Promise<boolean> - Returns true if successful, false otherwise
 */
export const handleShare = async (options: ShareOptions): Promise<boolean> => {
  try {
    const { url, title, text } = options;

    if (!url) {
      toast.error("No link available to share", {
        duration: 3000,
        position: "top-center",
      });
      return false;
    }

    // Check if Web Share API is available (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "",
          text: text || "",
          url: url,
        });
        toast.success("Shared successfully!", {
          duration: 3000,
          position: "top-center",
          icon: "✓",
        });
        return true;
      } catch (shareError: any) {
        // User cancelled the share, don't show error
        if (shareError.name === "AbortError") {
          return false;
        }
        throw shareError;
      }
    } else {
      // Fallback to clipboard for desktop
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!", {
        duration: 3000,
        position: "top-center",
        icon: "✓",
      });
      return true;
    }
  } catch (error) {
    console.error("Error sharing:", error);
    toast.error("Failed to share. Please try again.", {
      duration: 3000,
      position: "top-center",
    });
    return false;
  }
};

/**
 * Copies text to clipboard with user feedback
 * @param text - Text to copy to clipboard
 * @param successMessage - Optional custom success message
 * @returns Promise<boolean> - Returns true if successful, false otherwise
 */
export const copyToClipboard = async (
  text: string,
  successMessage: string = "Copied to clipboard!"
): Promise<boolean> => {
  try {
    if (!text) {
      toast.error("No content to copy", {
        duration: 3000,
        position: "top-center",
      });
      return false;
    }

    await navigator.clipboard.writeText(text);
    toast.success(successMessage, {
      duration: 3000,
      position: "top-center",
      icon: "✓",
    });
    return true;
  } catch (error) {
    console.error("Error copying to clipboard:", error);
    toast.error("Failed to copy. Please try again.", {
      duration: 3000,
      position: "top-center",
    });
    return false;
  }
};
