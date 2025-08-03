"use client";

import { useState, useEffect, useCallback, FC, ReactNode } from "react";
import { apiClient } from "@/integrations/fastapi/client";
import type { UsageStats } from "@/integrations/fastapi/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search, Zap, Star, CreditCard, Loader2, AlertCircle } from "lucide-react";

const timePeriods = [
  { days: 1, label: "24H" },
  { days: 7, label: "7D" },
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
];

interface StatBoxProps {
  title: string;
  value: number | string;
  icon: ReactNode;
}

const StatBox: FC<StatBoxProps> = ({ title, value, icon }) => (
  <div className="p-4 rounded-lg flex flex-col items-center justify-center text-center bg-gray-100">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <p className="text-sm font-medium text-gray-600">{title}</p>
    </div>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
  </div>
);

const UsageStatsCard = () => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(30);

  const fetchUsageStats = useCallback(async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getUsageStats(days);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsageStats(selectedDays);
  }, [selectedDays, fetchUsageStats]);

  const creditUsagePercentage =
    stats && stats.total_credits_purchased > 0
      ? (stats.total_credits_used / stats.total_credits_purchased) * 100
      : 0;

  return (
    <Card className="transition-all duration-300 bg-white border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold text-gray-800">Usage Statistics</CardTitle>
        <div className="flex items-center gap-2 p-1 rounded-lg bg-gray-100">
          {timePeriods.map(({ days, label }) => (
            <button
              key={days}
              onClick={() => setSelectedDays(days)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${
                selectedDays === days
                  ? "bg-indigo-500 text-white shadow"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-56">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Stats</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatBox
                title="Total Searches"
                value={stats.total_searches}
                icon={<Search className="h-5 w-5 text-gray-500" />}
              />
              <StatBox
                title="Basic Searches"
                value={stats.basic_searches}
                icon={<Zap className="h-5 w-5 text-gray-500" />}
              />
              <StatBox
                title="Deep Searches"
                value={stats.deep_searches}
                icon={<Star className="h-5 w-5 text-gray-500" />}
              />
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-gray-500" />
                  <p className="text-md font-semibold text-gray-700">Credits Used</p>
                </div>
                {stats.total_credits_purchased > 0 ? (
                  <p className="text-sm font-bold text-indigo-600">
                    {stats.total_credits_used} / {stats.total_credits_purchased}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">Purchase credits to get started</p>
                )}
              </div>
              {stats.total_credits_purchased > 0 && (
                <Progress value={creditUsagePercentage} className="h-3 [&>div]:bg-indigo-500" />
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p>No usage data available for this period.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UsageStatsCard;
