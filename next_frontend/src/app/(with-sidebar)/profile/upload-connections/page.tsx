"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        setErrorMessage("Please select a CSV file");
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setErrorMessage("");
      setUploadStatus("idle");
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
      formData.append('cacheControl', '3600');
      formData.append('', file); // Empty name field like in your curl

      const uploadResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/connection-files/${fileName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
      className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
    >
      <div className="container mx-auto px-4 pt-8 pb-16 max-w-2xl">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className={`mb-6 flex items-center gap-2 ${darkMode ? "text-white hover:text-gray-300" : "text-gray-900 hover:text-gray-700"}`}
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

          <div className="mt-6 flex justify-end">
            <Button onClick={handleUpload} disabled={!file || uploading} className="px-6">
              {uploading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Uploading...
                </>
              ) : (
                "Upload File"
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
