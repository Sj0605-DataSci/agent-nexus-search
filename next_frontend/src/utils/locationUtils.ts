/**
 * Utility functions for location-based features
 */

export interface PricingConfig {
  currency: string;
  symbol: string;
  monthlyPrice: number;
  yearlyPrice: number;
  countryCode: string;
  countryName: string;
}

const PRICING_CONFIGS: Record<string, PricingConfig> = {
  IN: {
    currency: "INR",
    symbol: "₹",
    monthlyPrice: 299,
    yearlyPrice: 225,
    countryCode: "IN",
    countryName: "India",
  },
  DEFAULT: {
    currency: "USD",
    symbol: "$",
    monthlyPrice: 20,
    yearlyPrice: 15,
    countryCode: "US",
    countryName: "International",
  },
};

/**
 * Detect user's country using multiple methods
 */
export async function detectUserCountry(): Promise<string> {
  try {
    // Method 1: Try timezone-based detection first (fastest)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone.includes("Kolkata") || timezone.includes("Calcutta")) {
      return "IN";
    }

    // Method 2: Use IP-based geolocation API
    const response = await fetch("https://ipapi.co/json/", {
      cache: "force-cache",
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.country_code || "US";
    }

    // Fallback to default
    return "US";
  } catch (error) {
    // If all methods fail, default to US
    return "US";
  }
}

/**
 * Get pricing configuration based on country code
 */
export function getPricingConfig(countryCode: string): PricingConfig {
  return PRICING_CONFIGS[countryCode] || PRICING_CONFIGS.DEFAULT;
}

/**
 * Format price with currency symbol
 */
export function formatPrice(amount: number, config: PricingConfig): string {
  return `${config.symbol}${amount}`;
}

/**
 * Get user's country from localStorage or detect it
 */
export async function getUserCountry(): Promise<string> {
  if (typeof window === "undefined") return "US";

  // Check if we already have the country stored
  const storedCountry = localStorage.getItem("userCountry");
  if (storedCountry) {
    return storedCountry;
  }

  // Detect and store
  const country = await detectUserCountry();
  localStorage.setItem("userCountry", country);
  return country;
}
