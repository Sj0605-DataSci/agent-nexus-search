/**
 * Utility functions for generating unique identifiers
 */

/**
 * Generate a unique UUID v4 using the native crypto API
 * @returns A unique UUID string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export const generateUniqueId = (): string => {
  return crypto.randomUUID();
};

/**
 * Generate a short unique ID (first 8 characters of UUID)
 * Useful for shorter identifiers where full UUID is not needed
 * @returns A short unique ID string (e.g., "550e8400")
 */
export const generateShortId = (): string => {
  return crypto.randomUUID().split('-')[0];
};

/**
 * Generate a timestamp-based unique ID
 * Combines timestamp with random UUID for sortable unique IDs
 * @returns A timestamp-prefixed unique ID (e.g., "1729456789123-550e8400")
 */
export const generateTimestampId = (): string => {
  const timestamp = Date.now();
  const shortUuid = generateShortId();
  return `${timestamp}-${shortUuid}`;
};
