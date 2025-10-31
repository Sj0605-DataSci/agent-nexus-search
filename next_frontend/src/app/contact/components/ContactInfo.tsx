"use client";

import { Mail } from "lucide-react";

export default function ContactInfo() {
  return (
    <div className="mt-8 space-y-4">
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Email</p>
            <p className="text-sm text-gray-600">support@discoverminds.ai</p>
          </div>
        </div>
      </div>
    </div>
  );
}
