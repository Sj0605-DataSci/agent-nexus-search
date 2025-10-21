import toast from "react-hot-toast";

/**
 * Shows a development feature notification toast
 * @param message The message to display in the toast
 * @param duration Duration in milliseconds for the toast to be visible
 */
export const showDevFeatureToast = (
  message: string = "This feature is under development",
  duration: number = 4000
) => {
  return toast.success(message, {
    duration,
    position: "top-center",
    icon: "🚧",
  });
};
