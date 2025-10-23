/**
 * Device Registration Types
 */

export interface DeviceInfo {
  deviceId: string;
  userId: string;
  businessId: string;
  wsUrl: string;
  registered: boolean;
  registeredAt?: string;
}

export interface RegisterDeviceRequest {
  deviceId: string;
  userId: string;
  businessId: string;
  wsUrl: string;
  tallyPort: number;
}

export interface RegisterDeviceResponse {
  success: boolean;
  deviceId: string;
  message: string;
}
