import React from "react";
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

// Helper function to render title and message
const ToastWithTitle = ({
  title,
  message,
}: {
  title: string;
  message?: string;
}) => {
  if (!message) {
    return React.createElement(
      "div",
      null,
      React.createElement("div", { style: { marginTop: "4px" } }, title)
    );
  } else {
    return React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        { style: { fontWeight: "bold", fontSize: "1.1em" } },
        title
      ),
      React.createElement("div", { style: { marginTop: "4px" } }, message),
    );
  }
};

export const showSuccessToast = (title: string, message?: string): Id => {
  return toast.success(ToastWithTitle({ title, message }), {
    ...defaultOptions,
    toastId: `success-${Date.now()}`,
  });
};

export const showInfoToast = (title: string, message?: string): Id => {
  return toast.info(ToastWithTitle({ title, message }), {
    ...defaultOptions,
    toastId: `info-${Date.now()}`,
  });
};

export const showErrorToast = (title: string, message?: string): Id => {
  return toast.error(ToastWithTitle({ title, message }), {
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
