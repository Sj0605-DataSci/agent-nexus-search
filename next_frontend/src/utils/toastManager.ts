import { toast, ToastOptions, Id } from "react-toastify";

const defaultOptions: ToastOptions = {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "light",
};

export const showSuccessToast = (message: string): Id => {
  return toast.success(message, {
    ...defaultOptions,
    toastId: `success-${Date.now()}`,
  });
};

export const showErrorToast = (message: string): Id => {
  return toast.error(message, {
    ...defaultOptions,
    autoClose: 8000,
    toastId: `error-${Date.now()}`,
  });
};

export const dismissToast = (toastId: Id): void => {
  toast.dismiss(toastId);
};

export const dismissAllToasts = (): void => {
  toast.dismiss();
};
