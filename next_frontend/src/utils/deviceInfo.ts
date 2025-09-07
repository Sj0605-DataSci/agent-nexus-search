/**
 * Utility functions for getting device and network information
 */

import { v4 as uuidv4 } from 'uuid';

// Constants for storage keys
const DEVICE_ID_KEY = 'discover_minds_device_id';
const IP_ADDRESS_KEY = 'discover_minds_ip_address';
const IP_TIMESTAMP_KEY = 'discover_minds_ip_timestamp';
const IP_CACHE_EXPIRY = 3600000; // 1 hour in milliseconds

/**
 * Device type enum
 */
export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  UNKNOWN = 'unknown'
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
  if (typeof window === 'undefined') return ''; // Handle server-side rendering
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
};

/**
 * Detects the device type based on user agent and screen size
 * @returns The detected device type
 */
export const detectDeviceType = (): DeviceType => {
  if (typeof window === 'undefined') return DeviceType.UNKNOWN; // Handle server-side rendering
  
  // Get user agent
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for mobile devices first
  const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  // Check for tablets
  const isTablet = /ipad|tablet|playbook|silk/i.test(userAgent) || 
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
  if (typeof window === 'undefined') return null; // Handle server-side rendering
  
  // Check cache first
  const cachedIp = localStorage.getItem(IP_ADDRESS_KEY);
  const ipCacheTime = localStorage.getItem(IP_TIMESTAMP_KEY);
  const currentTime = Date.now();
  
  // Return cached IP if it's still valid
  if (cachedIp && ipCacheTime && (currentTime - parseInt(ipCacheTime)) < IP_CACHE_EXPIRY) {
    return cachedIp;
  }
  
  try {
    // Using ipify API as it's simple and doesn't require authentication
    const response = await fetch('https://api.ipify.org?format=json');
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
    console.error('Error fetching IP address:', error);
    return cachedIp || null; // Fall back to cached IP even if expired
  }
};

/**
 * Global function to get device information (device ID, IP address, and device type)
 * @param options Configuration options
 * @returns Promise with device information
 */
export const getDeviceInfo = async (options: { skipIpLookup?: boolean } = {}): Promise<DeviceInfo> => {
  const deviceId = getDeviceId();
  const deviceType = detectDeviceType();
  
  // If skipIpLookup is true, use cached IP without making a network request
  if (options.skipIpLookup && typeof window !== 'undefined') {
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
    if (typeof window !== 'undefined') {
      const cachedIp = localStorage.getItem(IP_ADDRESS_KEY);
      return { deviceId, ipAddress: cachedIp, deviceType };
    }
    return { deviceId, ipAddress: null, deviceType };
  }
};
