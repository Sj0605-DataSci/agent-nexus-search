import { AxiosError } from "axios";

export function handleAxiosError(error: AxiosError): string {
  if (error.response) {
    return (
      (error.response.data as any)?.message ||
      `Server error: ${error.response.status}`
    );
  } else if (error.request) {
    return "No response received from server";
  } else {
    return error.message || "Unknown error";
  }
}
