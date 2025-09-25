export const getNormalizedConnectionsStatus = (status: string | undefined) => {
  if (!status) return "no_data";
  // The status can come in as "'no_data'::text", so we parse it
  const match = status.match(/'(synced|syncing|no_data)'/);
  if (match) return match[1] as "synced" | "syncing" | "no_data";
  return status as "synced" | "syncing" | "no_data";
};
