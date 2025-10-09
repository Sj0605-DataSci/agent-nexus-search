"use client";

import React from "react";
import ComingSoonOverlay from "@/components/ComingSoonOverlay";
import { useAppSelector } from "@/store";

export default function ResearchPersonPage() {
  const { profile, loading } = useAppSelector(s => s.profile);

  return (
    <div className="relative">
      <ComingSoonOverlay type={!profile?.id ? "login-required" : "coming-soon"} />
    </div>
  );
}
