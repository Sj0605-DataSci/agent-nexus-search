import { apiClient } from '@/integrations/fastapi/client';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email);
};

interface WaitlistResponse {
  success: boolean;
  message: string;
}

export const handleWaitlistSignup = async (email: string): Promise<WaitlistResponse> => {
  try {
    const response = await apiClient.joinWaitlistEmail(email);
    return { 
      success: true, 
      message: 'Successfully joined the waitlist!' 
    };
  } catch (error: any) {
    console.error('Error joining waitlist:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to join waitlist. Please try again.' 
    };
  }
};
