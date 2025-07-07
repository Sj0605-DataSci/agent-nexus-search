"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/integrations/fastapi/client";

export default function UploadConnectionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | string>('idle');
  const [errorMessage, setErrorMessage] = useState("");

  if (!user) {
    router.push("/login");
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith('.csv')) {
        setErrorMessage("Please select a CSV file");
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setErrorMessage("");
      setUploadStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    try {
      setUploading(true);
      setErrorMessage("");
      console.log("Starting upload process...");
      
      // 1. Upload file to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      console.log(`Uploading to storage bucket 'connection-files' with filename: ${fileName}`);
      
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('connection-files')
        .upload(fileName, file);

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error(`File upload failed: ${uploadError.message}`);
      }
      
      console.log("File uploaded successfully:", fileData);

      // 2. Get the public URL for the file
      console.log("Getting public URL...");
      const { data: urlData } = await supabase.storage
        .from('connection-files')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        console.error("Failed to get public URL", urlData);
        throw new Error("Failed to get file URL");
      }
      
      console.log("Got public URL:", urlData.publicUrl);

      // 3. Create entry in connection_files table
      console.log("Inserting record into connection_files table...");
      // Using type assertion to avoid TypeScript errors
      const { data: insertData, error: dbError } = await supabase
        .from('connection_files' as any)
        .insert({
          user_id: user.id,
          file_url: urlData.publicUrl,
          file_name: file.name,
          status: 'pending'
        })
        .select();

      if (dbError) {
        console.error("Database insert error:", dbError);
        throw new Error(`Database entry failed: ${dbError.message}`);
      }
      
      console.log("Database record inserted successfully:", insertData);

      // 4. Trigger background processing via API
      try {
        console.log("Triggering background processing...");
        
        // Get the file ID from the response
        // Since we're using type assertion above, we need to handle this carefully
        const fileId = (insertData as any)?.[0]?.id;
        
        if (!fileId) {
          console.error("Could not get file ID from database response");
          throw new Error("Could not get file ID from database response");
        }
        
        console.log("File ID for processing:", fileId);
        
        // Use the API client to process the connection file
        try {
          await apiClient.processConnectionFile(fileId);
          console.log("Background processing triggered successfully");
          setUploadStatus('success');
        } catch (error) {
          console.error("Processing trigger error:", error);
          throw new Error(`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } catch (processingError) {
        console.error('Processing trigger error:', processingError);
        // Don't fail the whole upload if just the processing trigger fails
        setErrorMessage(`Upload successful, but there was an issue triggering background processing: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`);
        setUploadStatus('success'); // Still mark as success since the file was uploaded
      }
      
      // Success!
      setTimeout(() => {
        router.push("/profile");
      }, 2000);
      
    } catch (error) {
      console.error("Upload error:", error);
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred");
      setUploadStatus('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
      <Button
        onClick={() => router.back()}
        variant="ghost"
        className="mb-6 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      
      <h1 className="text-3xl font-bold mb-2">Upload LinkedIn Connections</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">
        Upload your LinkedIn connections CSV file to import your network.
      </p>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div 
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          
          <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          
          {file ? (
            <p className="font-medium text-indigo-600 dark:text-indigo-400">
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          ) : (
            <>
              <p className="font-medium mb-1">Click to select or drag and drop</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                CSV files only (max 5MB)
              </p>
            </>
          )}
        </div>
        
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        
        {uploadStatus === 'success' && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span>Upload successful! Redirecting...</span>
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-6"
          >
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
        
        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">How to export your LinkedIn connections:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to <a href="https://www.linkedin.com/mynetwork/network-manager/people/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">LinkedIn Network Manager</a></li>
            <li>Click on "Manage synced and imported contacts"</li>
            <li>Under "Advanced actions", click "Export contacts"</li>
            <li>Select "Connections" and click "Request archive"</li>
            <li>LinkedIn will email you when your data is ready to download</li>
            <li>Download and upload the CSV file here</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
