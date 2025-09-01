"use client";

import { useState, useRef, Suspense } from "react";
import { getSupabaseConfig } from "@/config/supabase";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle, CheckCircle, ArrowLeft, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/integrations/fastapi/client";

function UploadConnectionsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const darkMode = false;

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error" | string>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);

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
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto upload after 3 seconds
      setTimeout(() => {
        clearInterval(timer);
        if (file) {
          handleUpload();
        }
      }, 3000);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    try {
      setUploading(true);
      setErrorMessage("");

      const fileName = `${user.id}/${Date.now()}_${file.name}`;

      // Get JWT token from localStorage (same as your working curl)
      const token = localStorage.getItem("discover_minds_access_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Use direct fetch API with proper authentication (like your working curl)
      const formData = new FormData();
      formData.append("cacheControl", "3600");
      formData.append("", file); // Empty name field like in your curl

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
        console.error("Storage upload error:", errorText);
        throw new Error(`File upload failed: ${uploadResponse.status} ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log("Upload successful:", uploadResult);

      // Get public URL
      const { data: urlData } = await supabase.storage
        .from("connection-files")
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        console.error("Failed to get public URL", urlData);
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

      if (dbError) {
        console.error("Database insert error:", dbError);
        throw new Error(`Database entry failed: ${dbError.message}`);
      }

      try {
        const fileId = (insertData as any)?.[0]?.id;

        if (!fileId) {
          console.error("Could not get file ID from database response");
          throw new Error("Could not get file ID from database response");
        }

        try {
          await apiClient.processConnectionFile(fileId);
          setUploadStatus("success");
        } catch (error) {
          console.error("Processing trigger error:", error);
          throw new Error(
            `Processing error: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      } catch (processingError) {
        console.error("Processing trigger error:", processingError);
        setErrorMessage(
          `Upload successful, but there was an issue triggering background processing: ${processingError instanceof Error ? processingError.message : "Unknown error"}`
        );
        setUploadStatus("success"); // Still mark as success since the file was uploaded
      }

      // Success!
      setTimeout(() => {
        router.push("/profile");
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred");
      setUploadStatus("error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
    >
      <div className="container mx-auto px-4 pt-8 pb-16 max-w-2xl">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className={`mb-6 bg-gray-100 flex items-center gap-2 ${darkMode ? "text-white hover:text-gray-300" : "text-gray-900 hover:text-gray-700"}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <h1 className={`text-3xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
          Upload LinkedIn Connections
        </h1>
        <p className={`mb-8 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
          Upload your LinkedIn connections CSV file to import your network.
        </p>

        <div
          className={`rounded-xl shadow-md p-6 border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
        >
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${darkMode ? "border-gray-600 hover:border-indigo-400" : "border-gray-300 hover:border-indigo-500"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />

            <Upload
              className={`mx-auto h-12 w-12 mb-4 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
            />

            {file ? (
              <p className={`font-medium ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            ) : (
              <>
                <p className={`font-medium mb-1 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                  Click to select or drag and drop
                </p>
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  CSV files only (max 5MB)
                </p>
              </>
            )}
          </div>

          {errorMessage && (
            <div
              className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${darkMode ? "bg-red-900/20 text-red-400" : "bg-red-50 text-red-700"}`}
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {uploadStatus === "success" && (
            <div
              className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${darkMode ? "bg-green-900/20 text-green-400" : "bg-green-50 text-green-700"}`}
            >
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>Upload successful! Redirecting...</span>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`relative overflow-hidden transition-all duration-300 px-8 py-2.5 rounded-lg font-medium text-sm ${
                !file || uploading
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transform transition-all'
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
                    {/* <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold leading-none">
                      {countdown}
                    </span> */}
                  </div>
                  <span className="text-sm">Uploading in {countdown}s...</span>
                </div>
              ) : uploading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center">
                  <UploadCloud className="w-5 h-5 mr-2" />
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

          <div className={`mt-6 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            <h3 className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              How to export your LinkedIn connections:
            </h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Go to{" "}
                <a
                  href="https://www.linkedin.com/mynetwork/network-manager/people/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hover:underline ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}
                >
                  LinkedIn Network Manager
                </a>
              </li>
              <li>Click on "Manage synced and imported contacts"</li>
              <li>Under "Advanced actions", click "Export contacts"</li>
              <li>Select "Connections" and click "Request archive"</li>
              <li>LinkedIn will email you when your data is ready to download</li>
              <li>Download and upload the CSV file here</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UploadConnectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-lg">Loading...</p>
        </div>
      }
    >
      <UploadConnectionsContent />
    </Suspense>
  );
}
