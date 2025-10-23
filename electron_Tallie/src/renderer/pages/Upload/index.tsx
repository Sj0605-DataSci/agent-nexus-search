import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiClient } from '../../../lib/api/apiClient';
import { supabase } from '../../../lib/supabase/client';
import { getSupabaseConfig } from '../../../config/supabase';
import { generateUniqueId } from '../../../utils';
import './styles.css';

function Upload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown === 0) {
      setCountdown(null);
      handleUpload();
    }
  }, [countdown]);

  const validateAndSetFile = (file: File) => {
    // Check if it's a zip file
    if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
      setErrorMessage(
        'Please unzip the file first! You need to extract and upload only the connections.csv file from the zip archive.',
      );
      setSelectedFile(null);
      toast.error('Please unzip the file first');
      return;
    }

    // Check if it's not a CSV file
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setErrorMessage('Please select a CSV file');
      setSelectedFile(null);
      toast.error('Please select a CSV file');
      return;
    }

    // Check if the file name is exactly connections.csv (case insensitive)
    if (file.name.toLowerCase() !== 'stock_items_rows.csv') {
      setErrorMessage(
        'Please upload the connections.csv file from your LinkedIn data export',
      );
      setSelectedFile(null);
      toast.error('File must be named connections.csv');
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
    toast.success(`File selected: ${file.name}`);

    // Start countdown
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!uploading && countdown === null) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (uploading || countdown !== null) return;

    const file = event.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    setErrorMessage('');

    try {
      // Get user ID
      const userId = await apiClient.getUserId();

      // Get authentication token
      const token = localStorage.getItem('discover_minds_access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Create file name with user ID and unique identifier
      const uniqueId = generateUniqueId();
      const fileName = `${userId}/${uniqueId}_${selectedFile.name}`;

      // Prepare form data
      const formData = new FormData();
      formData.append('cacheControl', '3600');
      formData.append('', selectedFile);

      const { supabaseUrl, supabaseKey } = getSupabaseConfig();

      // Upload file to Supabase Storage
      const uploadResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/stock-items/${fileName}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: supabaseKey,
          },
          body: formData,
        },
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(
          `File upload failed: ${uploadResponse.status} ${errorText}`,
        );
      }

      // Get public URL
      const { data: urlData } = await supabase.storage
        .from('stock-items')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get file URL');
      }

      // Insert file record into database
      const { data: insertData, error: dbError } = await supabase
        .from('stock_items_files' as any)
        .upsert(
          {
            user_id: userId,
            file_url: urlData.publicUrl,
            file_name: selectedFile.name,
            status: 'pending',
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'file_url', // If file_url exists, update it
          },
        )
        .select();

      if (dbError) throw new Error(`Database entry failed: ${dbError.message}`);

      const fileId = (insertData as any)?.[0]?.id;
      if (!fileId)
        throw new Error('Could not get file ID from database response');
      await apiClient.processStockFile(fileId);

      toast.success('Upload successful! Processing your connections...');
      setSelectedFile(null);
      setCountdown(null);

      setTimeout(() => {
        navigate('/profile');
      }, 1500);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg =
        error instanceof Error ? error.message : 'An unknown error occurred';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('discover_minds_access_token');
    localStorage.removeItem('discover_minds_refresh_token');
    toast.success('Logged out successfully');
    navigate('/');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <div className="document-upload-container">
      <div className="upload-header">
        <h1>Upload Document</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/chat')} className="chat-button">
            Chat
          </button>
          <button onClick={handleProfileClick} className="profile-button">
            Profile
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      <div className="upload-content">
        {errorMessage && (
          <div className="error-banner">
            <p>{errorMessage}</p>
          </div>
        )}

        {countdown !== null && countdown > 0 && (
          <div className="countdown-banner">
            <p>
              Uploading in {countdown} second{countdown !== 1 ? 's' : ''}...
            </p>
          </div>
        )}

        <div
          className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${
            selectedFile ? 'has-file' : ''
          } ${uploading ? 'uploading' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!selectedFile ? (
            <>
              <svg
                className="upload-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <h2>Drag & Drop your document here</h2>
              <p>or</p>
              <label htmlFor="file-input" className="file-select-button">
                Browse Files
              </label>
              <input
                id="file-input"
                type="file"
                onChange={handleFileSelect}
                accept=".csv"
                style={{ display: 'none' }}
                disabled={uploading || countdown !== null}
              />
              <p className="file-types">
                Please upload connections.csv from your LinkedIn data export
              </p>
            </>
          ) : (
            <div className="selected-file">
              <svg
                className="file-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
              <div className="file-info">
                <h3>{selectedFile.name}</h3>
                <p>{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="remove-file-button"
                aria-label="Remove file"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          )}
        </div>

        {selectedFile && countdown === null && !uploading && (
          <button onClick={handleUpload} className="upload-button">
            Upload Now
          </button>
        )}

        {uploading && (
          <div className="uploading-status">
            <div className="spinner"></div>
            <p>Uploading and processing your file...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Upload;
