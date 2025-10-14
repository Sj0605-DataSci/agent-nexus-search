"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Download, Linkedin, Upload, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseConfig } from "@/config/supabase";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/integrations/fastapi/client";
import { useAppDispatch } from "@/store";
import { fetchProfile, updateConnectionsStatus } from "@/store/profileSlice";
import toast from "react-hot-toast";

interface ImportConnectionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportConnectionsModal({
  open,
  onOpenChange,
}: ImportConnectionsModalProps) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (countdown === 0) {
      setCountdown(null);
      handleUpload();
    }
  }, [countdown]);

  const validateAndSetFile = (selectedFile: File) => {

      // Check if it's a zip file
      if (selectedFile.type === "application/zip" || selectedFile.name.endsWith(".zip")) {
        setErrorMessage(
          "Please unzip the file first! You need to extract and upload only the connections.csv file from the zip archive."
        );
        setFile(null);
        return;
      }

      // Check if it's not a CSV file
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        setErrorMessage("Please select a CSV file");
        setFile(null);
        return;
      }

      // Check if the file name is exactly connections.csv (case insensitive)
      if (selectedFile.name.toLowerCase() !== "connections.csv") {
        setErrorMessage("Please upload the connections.csv file from your LinkedIn data export");
        setFile(null);
        return;
      }

    setFile(selectedFile);
    setErrorMessage("");
    setUploadStatus("idle");
    setCountdown(3);

    // Start countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          return 0; // Return 0 instead of null to trigger the useEffect
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading && countdown === null) {
      setIsDragging(true);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading && countdown === null) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragging to false if we're leaving the modal container
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploading || countdown !== null) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles[0]) {
      validateAndSetFile(droppedFiles[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    try {
      setUploading(true);
      setErrorMessage("");

      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const token = localStorage.getItem("discover_minds_access_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const formData = new FormData();
      formData.append("cacheControl", "3600");
      formData.append("", file);

      const { supabaseUrl, supabaseKey } = getSupabaseConfig();

      const uploadResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/connection-files/${fileName}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: supabaseKey,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`File upload failed: ${uploadResponse.status} ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      const { data: urlData } = await supabase.storage
        .from("connection-files")
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error("Failed to get file URL");
      }

      const { data: insertData, error: dbError } = await supabase
        .from("connection_files" as any)
        .insert({
          user_id: user.id,
          file_url: urlData.publicUrl,
          file_name: file.name,
          status: "pending",
        })
        .select();

      if (dbError) throw new Error(`Database entry failed: ${dbError.message}`);

      const fileId = (insertData as any)?.[0]?.id;
      if (!fileId) throw new Error("Could not get file ID from database response");

      await apiClient.processConnectionFile(fileId);

      dispatch(updateConnectionsStatus("syncing"));
      toast.success("Upload successful! Processing your connections...");

      setUploadStatus("success");
      setUploading(false);

      setTimeout(() => {
        onOpenChange(false);
        setTimeout(() => {
          setFile(null);
          setUploading(false);
          setUploadStatus("idle");
        }, 300);
      }, 100);
    } catch (error) {
      console.error("Upload error:", error);
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred");
      setUploadStatus("error");
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm">
      <div
        className={`fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border bg-white p-6 shadow-2xl shadow-black/10 duration-200 transition-all ${
          isDragging ? "border-blue-400 border-2 ring-4 ring-blue-100" : "border-gray-200"
        }`}
        style={{ pointerEvents: "auto" }}
        tabIndex={-1}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col h-[30px]  space-y-1.5 text-left">
          <h2 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-3">
            <div className="rounded-lg text-[#0A66C2]">
              <Linkedin className="size-6" />
            </div>
            Connect LinkedIn
          </h2>
        </div>

        <div className="w-full h-full mt-3 md:max-h-[480px] overflow-y-auto">
          <div className="mt-4 h-full ">
            <div className="rounded-xl bg-white border-2 border-gray-100 shadow-sm">
              <div className="p-3 pt-3">
                <div className="flex items-center space-x-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-file-spreadsheet h-6 w-6"
                    aria-hidden="true"
                  >
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                    <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                    <path d="M8 13h2"></path>
                    <path d="M14 13h2"></path>
                    <path d="M8 17h2"></path>
                    <path d="M14 17h2"></path>
                  </svg>
                  <h3 className="text-lg font-semibold">File upload</h3>
                </div>

                <div className="my-3 space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 rounded-full bg-primary/10 p-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M12 13v8l-4-4"></path>
                        <path d="m12 21 4-4"></path>
                        <path d="M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284"></path>
                      </svg>
                    </div>
                    <div>
                      <a
                        href="https://www.linkedin.com/mypreferences/d/download-my-data"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-start group"
                      >
                        <p className="flex items-center text-sm font-medium text-blue-600 hover:underline hover:underline-offset-4">
                          Export your data
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="ml-0.5 h-4 w-4"
                            aria-hidden="true"
                          >
                            <path d="M7 7h10v10"></path>
                            <path d="M7 17 17 7"></path>
                          </svg>
                        </p>
                        <p className="text-sm text-gray-500">
                          Download your data from LinkedIn(Download larger data archive).
                        </p>
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="mt-1 rounded-full bg-primary/10 p-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                        <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                        <path d="M8 13h2"></path>
                        <path d="M14 13h2"></path>
                        <path d="M8 17h2"></path>
                        <path d="M14 17h2"></path>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Locate the file</p>
                      <p className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
                        In your downloaded zip file, find and extract{" "}
                        <code className="rounded-md bg-gray-100 px-2 py-0.5 text-[13px] font-medium text-gray-700">
                          Connections.csv
                        </code>
                      </p>
                      <p className="text-sm text-gray-500 mt-1 font-medium text-blue-600">
                        Important: You must unzip the file and upload only the connections.csv file
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv"
                    className="hidden"
                    disabled={uploading || countdown !== null}
                  />

                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-gray-50/50"
                    }`}
                    onClick={() =>
                      !uploading && countdown === null && fileInputRef.current?.click()
                    }
                  >
                    {file ? (
                      <p className="font-medium text-blue-600">
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </p>
                    ) : (
                      <>
                        <p className="font-medium text-gray-700">
                          Click to select or drag and drop
                        </p>
                        <p className="text-sm text-gray-500">connections.csv file only (max 5MB)</p>
                      </>
                    )}
                  </div>

                  {errorMessage && (
                    <div className="p-4 rounded-lg flex items-center gap-3 bg-red-50 text-red-600 border border-red-200 shadow-sm">
                      <AlertCircle className="h-6 w-6 flex-shrink-0" />
                      <div>
                        <p className="font-medium">
                          {errorMessage.includes("zip") ? "ZIP file detected!" : "Error"}
                        </p>
                        <p className="text-sm">{errorMessage}</p>
                      </div>
                    </div>
                  )}

                  {uploadStatus === "success" && (
                    <div className="p-3 rounded-lg flex items-center gap-2 bg-green-50 text-green-600 border border-green-100">
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                      <span>Upload successful! Processing your connections...</span>
                    </div>
                  )}

                  <div className="flex justify-center">
                    <Button
                      onClick={() => countdown === null && handleUpload()}
                      disabled={!file || uploading || countdown !== null}
                      className={`relative overflow-hidden transition-all duration-300 px-8 py-2.5 rounded-lg font-medium text-sm ${
                        !file || uploading || countdown !== null
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transform transition-all"
                      }`}
                    >
                      {countdown !== null ? (
                        <div className="flex items-center h-6">
                          <div className="relative w-5 h-5 mr-2.5 flex-shrink-0">
                            <svg className="w-full h-full" viewBox="0 0 24 24">
                              <circle
                                className="text-blue-100"
                                strokeWidth="2"
                                stroke="currentColor"
                                fill="transparent"
                                r="10"
                                cx="12"
                                cy="12"
                              />
                              <circle
                                className="text-blue-500"
                                strokeWidth="2"
                                strokeDasharray="63"
                                strokeDashoffset={63 - (countdown / 3) * 63}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r="10"
                                cx="12"
                                cy="12"
                              />
                            </svg>
                          </div>
                          <span className="text-sm">Uploading in {countdown}s...</span>
                        </div>
                      ) : uploading ? (
                        <div className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Upload className="w-5 h-5 mr-2" />
                          <span>Upload Connections</span>
                        </div>
                      )}
                      {!file && (
                        <span className="absolute -bottom-6 left-0 right-0 text-xs text-gray-500 text-center transition-opacity duration-200">
                          Please select a file first
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-full p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
}
