"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, File, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface DocumentUploaderProps {
  agentId: string;
  darkMode?: boolean;
}

const DocumentUploader = ({ agentId, darkMode = false }: DocumentUploaderProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prevFiles => [
      ...prevFiles,
      ...acceptedFiles.filter(
        file => !prevFiles.some(pf => pf.name === file.name && pf.size === file.size)
      ),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
  });

  const removeFile = (fileName: string) => {
    setFiles(files.filter(file => file.name !== fileName));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !agentId) return;
    setUploading(true);

    const formData = new FormData();
    files.forEach(file => {
      formData.append("files", file);
    });

    try {
      // await apiClient.uploadAgentDocuments(agentId, formData);
      toast.success(`${files.length} file(s) uploaded successfully!`);
      setFiles([]);
    } catch (error: any) {
      toast.error(error.message || "Upload failed: Could not upload files.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-200/50">
      <h4 className={`font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-800"}`}>
        Knowledge Base
      </h4>
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
          isDragActive
            ? darkMode
              ? "border-blue-400 bg-blue-900/20"
              : "border-blue-500 bg-blue-50"
            : darkMode
              ? "border-gray-700 hover:border-blue-500"
              : "border-gray-300 hover:border-blue-400"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud
          className={`mx-auto h-10 w-10 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
        />
        <p className={`mt-2 text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
          {isDragActive ? "Drop the files here ..." : "Drag & drop files here, or click to select"}
        </p>
        <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>PDF, DOCX, TXT</p>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <h5 className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Ready to upload:
          </h5>
          {files.map(file => (
            <div
              key={file.name}
              className={`flex items-center justify-between p-2 rounded-md text-sm ${
                darkMode ? "bg-gray-700/50" : "bg-gray-100"
              }`}
            >
              <div className="flex items-center space-x-2 overflow-hidden">
                <File
                  className={`h-5 w-5 flex-shrink-0 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
                />
                <span className={`truncate ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                  {file.name}
                </span>
              </div>
              <button
                onClick={() => removeFile(file.name)}
                className="p-1 rounded-full hover:bg-gray-500/20"
              >
                <X className={`h-4 w-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
              </button>
            </div>
          ))}
          <Button onClick={handleUpload} disabled={uploading} className="w-full mt-2">
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
              </>
            ) : (
              `Upload ${files.length} file(s)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;
