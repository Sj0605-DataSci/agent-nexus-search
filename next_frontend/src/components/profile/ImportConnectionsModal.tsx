"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Download, Linkedin, Upload, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseConfig } from "@/config/supabase";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/integrations/fastapi/client";
import Image from "next/image";

interface ImportConnectionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportConnectionsModal({
  open,
  onOpenChange,
}: ImportConnectionsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"automatic" | "manual">("manual");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [openAccordion, setOpenAccordion] = useState<string | null>("features");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (countdown === 0) {
      setCountdown(null);
      handleUpload();
    }
  }, [countdown]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        setErrorMessage("Please select a CSV file");
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
      setUploadStatus("success");

      // Close modal after successful upload
      setTimeout(() => {
        onOpenChange(false);
        // Reset state after modal closes
        setTimeout(() => {
          setFile(null);
          setUploading(false);
          setUploadStatus("idle");
        }, 300);
      }, 1500);
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
        className="fixed md:h-[580px] left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border border-gray-200 bg-white p-6 shadow-2xl shadow-black/10 duration-200"
        style={{ pointerEvents: "auto" }}
        tabIndex={-1}
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
          <div className="relative h-10 rounded-lg bg-gray-100 p-0.5">
            <div className="relative grid h-full w-full grid-cols-2">
              {/* Sliding background */}
              <div
                className={`absolute top-0.5 bottom-0.5 w-[calc(50%-0.25rem)] rounded-md bg-white shadow-sm transition-all duration-300 ease-out ${
                  activeTab === "automatic" ? "left-0.5" : "left-[calc(50%+0.125rem)]"
                }`}
              />

              <button
                type="button"
                onClick={() => setActiveTab("automatic")}
                className={`relative z-10 flex h-full items-center justify-center rounded-md text-sm font-medium transition-colors ${
                  activeTab === "automatic" ? "text-gray-900" : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Automatic
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("manual")}
                className={`relative z-10 flex h-full items-center justify-center rounded-md text-sm font-medium transition-colors ${
                  activeTab === "manual" ? "text-gray-900" : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          <div className="mt-4 h-full ">
            {activeTab === "manual" ? (
              <div className="rounded-xl bg-white border-2 border-gray-100 shadow-sm">
                <div className="p-6 pt-6">
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

                  <div className="my-4 space-y-4">
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
                          href="https://www.linkedin.com/mynetwork/network-manager/people/"
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
                          <p className="text-sm text-gray-500">Download your data from LinkedIn.</p>
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
                          In your downloaded zip file, find{" "}
                          <code className="rounded-md bg-gray-100 px-2 py-0.5 text-[13px] font-medium text-gray-700">
                            Connections.csv
                          </code>
                          .
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
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-blue-400 border-gray-300 bg-gray-50 hover:bg-gray-50/50"
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
                          <p className="text-sm text-gray-500">CSV files only (max 5MB)</p>
                        </>
                      )}
                    </div>

                    {errorMessage && (
                      <div className="p-3 rounded-lg flex items-center gap-2 bg-red-50 text-red-600 border border-red-100">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <span>{errorMessage}</span>
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
            ) : (
              <div className="rounded-xl p-6 pt-6 bg-white border-2 border-gray-100 shadow-sm">
                {/* Enhanced Chrome Extension Header */}
                <div className="">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 bg-white p-2 rounded-lg shadow-sm flex items-center justify-center">
                        <Image
                          src="/logos/chrome.webp"
                          alt="Chrome logo"
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">Chrome extension</h3>
                        <p className="text-sm text-gray-600">
                          Sync LinkedIn connections automatically
                        </p>
                      </div>
                    </div>
                    <div className="bg-green-100 text-green-700 text-[12px] font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <span>Easy</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-gray-700 text-sm">
                      Install our Chrome extension for seamless LinkedIn connection syncing without
                      manual exports.
                    </p>
                    <Button
                      onClick={() =>
                        window.open(
                          "https://chromewebstore.google.com/detail/hhbehjonajcbddobnncmeodeedjehlcm?utm_source=web-profile-extension",
                          "_blank"
                        )
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-blue-400/20 px-6 py-2 rounded-md w-auto flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Install now
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 mt-4">
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div
                      className="flex cursor-pointer items-center justify-between bg-white px-5 py-4 text-gray-900 border-b border-transparent hover:bg-gray-50 transition-colors duration-150"
                      onClick={() =>
                        setOpenAccordion(openAccordion === "features" ? null : "features")
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-1.5 rounded-full">
                          <svg
                            className="h-4 w-4 text-blue-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                        </div>
                        <span className="font-medium">Features</span>
                      </div>
                      <svg
                        className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${openAccordion === "features" ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${openAccordion === "features" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                    >
                      <div className="overflow-hidden">
                        <div className="bg-white p-5 border-t border-gray-100 space-y-5">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-green-100 flex items-center justify-center mr-3 shadow-sm">
                              <svg
                                className="h-5 w-5 text-green-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">Automatic daily sync</h4>
                              <p className="mt-1 text-sm text-gray-600">
                                Your LinkedIn connections are automatically synced daily without any
                                manual intervention.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center mr-3 shadow-sm">
                              <svg
                                className="h-5 w-5 text-blue-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">Real-time updates</h4>
                              <p className="mt-1 text-sm text-gray-600">
                                No waiting on LinkedIn to process your data export - changes appear
                                instantly.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center mr-3 shadow-sm">
                              <svg
                                className="h-5 w-5 text-purple-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">Secure connection</h4>
                              <p className="mt-1 text-sm text-gray-600">
                                Your data is encrypted and securely transferred with
                                enterprise-grade protection.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div
                      className="flex cursor-pointer items-center justify-between bg-white px-5 py-4 text-gray-900 border-b border-transparent hover:bg-gray-50 transition-colors duration-150"
                      onClick={() =>
                        setOpenAccordion(openAccordion === "instructions" ? null : "instructions")
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-1.5 rounded-full">
                          <svg
                            className="h-4 w-4 text-amber-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                        </div>
                        <span className="font-medium">Instructions</span>
                      </div>
                      <svg
                        className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${openAccordion === "instructions" ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${openAccordion === "instructions" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                    >
                      <div className="overflow-hidden">
                        <div className="bg-white p-5 border-t border-gray-100">
                          <ol className="space-y-4 list-none">
                            <li className="flex items-start">
                              <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm mr-3">
                                1
                              </div>
                              <p className="text-gray-700">
                                Click the <span className="font-medium">Install now</span> button
                                below to go to the Chrome Web Store.
                              </p>
                            </li>
                            <li className="flex items-start">
                              <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm mr-3">
                                2
                              </div>
                              <p className="text-gray-700">
                                Click <span className="font-medium">Add to Chrome</span> on the
                                extension page and confirm installation.
                              </p>
                            </li>
                            <li className="flex items-start">
                              <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm mr-3">
                                3
                              </div>
                              <p className="text-gray-700">
                                Click the extension icon in your browser toolbar and select our
                                extension.
                              </p>
                            </li>
                            <li className="flex items-start">
                              <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm mr-3">
                                4
                              </div>
                              <p className="text-gray-700">
                                Click on <span className="font-medium">LinkedIn</span> and press{" "}
                                <span className="font-medium">Connect this account</span> to start
                                syncing.
                              </p>
                            </li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>

                  <a
                    href="#"
                    className="text-sm font-medium text-blue-400 hover:text-blue-800 hover:underline flex items-center gap-1"
                    onClick={e => {
                      e.preventDefault();
                      window.open("/extension-info", "_blank");
                    }}
                  >
                    <span>Learn more about our extension</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </a>
                </div>

                {/* <div className="flex flex-col items-center mt-8 space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <Button 
                    className="bg-black hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all duration-200 px-8 py-2.5 rounded-md w-auto flex items-center justify-center gap-2 font-medium"
                    onClick={() => window.open('https://chrome.google.com/webstore/category/extensions', '_blank')}
                  >
                    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 9.5C28.5 9.5 32.5 10.5 35.6 12.2C39.1 14.1 41.5 17 41.5 21C41.5 25 39.1 27.9 35.6 29.8C32.5 31.5 28.5 32.5 24 32.5C23.4 32.5 22.7 32.5 22.1 32.4L15.5 39V31.3C12.2 29.9 9.5 28 7.7 25.6C6.6 24.1 6 22.6 6 21C6 17 8.4 14.1 11.9 12.2C15 10.5 19.5 9.5 24 9.5Z" fill="white"/>
                    </svg>
                    Install Chrome Extension
                  </Button>
                
                </div> */}
              </div>
            )}
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
