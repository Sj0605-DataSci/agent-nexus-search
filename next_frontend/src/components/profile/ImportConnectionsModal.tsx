"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';

interface ImportConnectionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportConnectionsModal({ open, onOpenChange }: ImportConnectionsModalProps) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl shadow-xl max-w-md w-full p-6 relative bg-white">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <h3 className="text-xl font-semibold mb-4 text-gray-900">
          Import LinkedIn Connections
        </h3>
        <p className="mb-6 text-gray-600">
          Choose how you'd like to import your LinkedIn connections:
        </p>

        <div className="space-y-4">
          <Button
            onClick={() => window.open('https://chrome.google.com/webstore/detail/your-extension-id', '_blank')}
            className="w-full flex items-center justify-center gap-2 py-6 border-gray-300 hover:bg-gray-100 text-gray-900"
            variant="outline"
          >
            <Download className="h-5 w-5 text-gray-700" />
            Install Browser Extension
          </Button>

          <Button
            onClick={() => router.push('/profile/upload-connections')}
            className="w-full flex items-center justify-center gap-2 py-6"
            variant="default"
          >
            <Upload className="h-5 w-5 text-white" />
            Upload CSV File
          </Button>
        </div>

        <p className="text-sm mt-4 text-gray-500">
          Your connections data will be securely stored and only accessible to you.
        </p>
      </div>
    </div>
  );
}
