"use client";

import { useState, useEffect, useCallback, FC, memo } from "react";
import { apiClient } from "@/integrations/fastapi/client";
import type { UsageStats } from "@/integrations/fastapi/types";
import { Search, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

const timePeriods = [
  { days: 1, label: "24H" },
  { days: 7, label: "7D" },
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
];

interface StatBoxProps {
  title: string;
  value: number | string;
  icon: React.ReactElement;
}

const StatBox: FC<StatBoxProps> = ({ title, value, icon }) => (
  <div className="flex items-center gap-4">
    <div className="p-2 rounded-lg bg-gray-50">
      {React.cloneElement(icon, { className: "h-5 w-5 text-gray-500" })}
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-lg font-semibold text-gray-900">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  </div>
);

const UsageStatsCard = () => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(30);

  const [isFetching, setIsFetching] = useState(false);

  const fetchUsageStats = useCallback(
    async (days: number) => {
      if (!loading) setIsFetching(true);
      setError(null);
      try {
        const data = await apiClient.getUsageStats(days);
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
        setStats(null);
      } finally {
        setLoading(false);
        setIsFetching(false);
      }
    },
    [loading]
  );

  useEffect(() => {
    fetchUsageStats(selectedDays);
  }, [selectedDays, fetchUsageStats]);

  return (
    <div className="p-4 rounded-lg border bg-white border-gray-200 transition-all hover:shadow-md">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Search Activity</h3>
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 relative">
            {timePeriods.map(({ days, label }) => (
              <button
                key={days}
                onClick={() => setSelectedDays(days)}
                disabled={isFetching}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium transition-colors relative z-10",
                  selectedDays === days
                    ? "bg-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700",
                  isFetching && "opacity-50"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-4">
        {loading || isFetching ? (
          <div className="space-y-4 h-8">
            <div className="h-5 w-5 mt-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-3">
            <div className="flex items-start text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="ml-2">
                <p className="text-sm font-medium">Error Loading Stats</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        ) : stats ? (
          <div>
            <StatBox title="Total Searches" value={stats.total_searches} icon={<Search />} />

            {stats.total_searches === 0 && (
              <div className="py-6 text-center">
                <Clock className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">No search activity yet</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No data available for this period</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(UsageStatsCard);
