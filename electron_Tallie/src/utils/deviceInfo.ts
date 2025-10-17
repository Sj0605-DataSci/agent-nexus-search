/**
 * Utility functions for getting device and network information
 */

import { v4 as uuidv4 } from "uuid";

// Namespace and salt for storage keys
const STORAGE_NAMESPACE = "dm_data";
const STORAGE_SALT = "discover_minds_2025";

// Storage key types
enum StorageKeyType {
  DEVICE_ID = "device_id",
  IP_ADDRESS = "ip_address",
  IP_TIMESTAMP = "ip_timestamp",
}

/**
 * Simple string hash function that works in browser environments
 * @param str String to hash
 * @returns A deterministic hash string
 */
const simpleHash = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return hash.toString(16);

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert to hex string and ensure positive value
  return Math.abs(hash).toString(16).substring(0, 8);
};

// Generate obfuscated storage keys
const generateStorageKey = (keyType: StorageKeyType): string => {
  const baseKey = `${STORAGE_NAMESPACE}_${keyType}`;
  const hash = simpleHash(`${baseKey}_${STORAGE_SALT}`);

  return `${STORAGE_NAMESPACE}_${hash}`;
};

// Hashed storage keys
const DEVICE_ID_KEY = generateStorageKey(StorageKeyType.DEVICE_ID);
const IP_ADDRESS_KEY = generateStorageKey(StorageKeyType.IP_ADDRESS);
const IP_TIMESTAMP_KEY = generateStorageKey(StorageKeyType.IP_TIMESTAMP);
const IP_CACHE_EXPIRY = 3600000; // 1 hour in milliseconds

/**
 * Device type enum
 */
export enum DeviceType {
  DESKTOP = "desktop",
  MOBILE = "mobile",
  TABLET = "tablet",
  UNKNOWN = "unknown",
}

/**
 * Global device information object
 */
export interface DeviceInfo {
  deviceId: string;
  ipAddress: string | null;
  deviceType: DeviceType;
}

/**
 * Generates or retrieves a persistent device ID
 * @returns A UUID string that persists across sessions
 */
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = uuidv4();
    try {
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    } catch (error) {
      console.error("Failed to save device ID:", error);
    }
  }

  return deviceId;
};

/**
 * Detects the device type based on user agent and screen size
 * @returns The detected device type
 */
export const detectDeviceType = (): DeviceType => {
  // Get user agent
  const userAgent = navigator.userAgent.toLowerCase();

  // Check for mobile devices first
  const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

  // Check for tablets
  const isTablet =
    /ipad|tablet|playbook|silk/i.test(userAgent) ||
    (navigator.maxTouchPoints > 0 && screen.width >= 600 && screen.width < 1200);

  // If neither mobile nor tablet, assume desktop
  if (isMobile) return DeviceType.MOBILE;
  if (isTablet) return DeviceType.TABLET;
  return DeviceType.DESKTOP;
};

/**
 * Gets the client's IP address using a public API
 * Note: This is an async function that makes an external request
 * @returns Promise resolving to the IP address string or null if unavailable
 */
export const getIpAddress = async (): Promise<string | null> => {
  // Check cache first
  const cachedIp = localStorage.getItem(IP_ADDRESS_KEY);
  const ipCacheTime = localStorage.getItem(IP_TIMESTAMP_KEY);
  const currentTime = Date.now();

  // Return cached IP if it's still valid
  if (cachedIp && ipCacheTime && currentTime - parseInt(ipCacheTime) < IP_CACHE_EXPIRY) {
    return cachedIp;
  }

  try {
    // Using ipify API as it's simple and doesn't require authentication
    const response = await fetch("https://api.ipify.org?format=json");
    if (!response.ok) {
      return cachedIp || null; // Fall back to cached IP even if expired
    }
    const data = await response.json();
    const ip = data.ip as string;

    // Update cache
    localStorage.setItem(IP_ADDRESS_KEY, ip);
    localStorage.setItem(IP_TIMESTAMP_KEY, currentTime.toString());

    return ip;
  } catch (error) {
    console.error("Error fetching IP address:", error);
    return cachedIp || null; // Fall back to cached IP even if expired
  }
};

/**
 * Global function to get device information (device ID, IP address, and device type)
 * @param options Configuration options
 * @returns Promise with device information
 */
export const getDeviceInfo = async (
  options: { skipIpLookup?: boolean } = {}
): Promise<DeviceInfo> => {
  const deviceId = getDeviceId();
  const deviceType = detectDeviceType();

  // If skipIpLookup is true, use cached IP without making a network request
  if (options.skipIpLookup) {
    const cachedIp = localStorage.getItem(IP_ADDRESS_KEY);
    // If we have a cached IP, use it
    if (cachedIp) {
      return { deviceId, ipAddress: cachedIp, deviceType };
    }
    // If no cached IP and skipIpLookup is true, we'll still try to get it
    // but we won't block the request if it fails
  }

  try {
    // Always attempt to get the IP address
    const ipAddress = await getIpAddress();
    return { deviceId, ipAddress, deviceType };
  } catch (error) {
    // If there's an error getting the IP, fall back to cached IP
    const cachedIp = localStorage.getItem(IP_ADDRESS_KEY);
    return { deviceId, ipAddress: cachedIp, deviceType };
  }
};
