/**
 * Tally Configuration and Connection Types
 */

export interface TallyConfig {
  port: number;
  connected: boolean;
  lastChecked?: string;
}

export interface TallyMetadata {
  companies: TallyCompany[];
  ledgers: string[];
  voucherTypes: string[];
  stockItems: string[];
  lastUpdated: string;
}

export interface TallyCompany {
  name: string;
  startingFrom: string;
  booksFrom: string;
}

export interface TallyConnectionStatus {
  connected: boolean;
  port: number;
  error?: string;
  metadata?: TallyMetadata;
}

export interface ExecuteXMLRequest {
  xml: string;
}

export interface ExecuteXMLResponse {
  success: boolean;
  data: string;
  error?: string;
}
