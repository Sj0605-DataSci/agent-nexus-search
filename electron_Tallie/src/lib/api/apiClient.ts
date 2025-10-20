import axiosInstance from './axiosInstance';
import { AxiosError } from 'axios';
import { UserProfile, ApiResponse } from '../../types/profile';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    access_token: string;
    refresh_token: string;
    user?: any;
  };
}

class ApiClient {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await axiosInstance.post<LoginResponse>(
        '/auth/login',
        credentials,
      );

      // Store tokens if login is successful
      if (response.data.success && response.data.data) {
        const { access_token, refresh_token } = response.data.data;

        if (access_token) {
          localStorage.setItem('discover_minds_access_token', access_token);
        }

        if (refresh_token) {
          localStorage.setItem('discover_minds_refresh_token', refresh_token);
        }
      }

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<LoginResponse>;

      if (axiosError.response?.data) {
        throw axiosError.response.data;
      }

      throw {
        success: false,
        message: axiosError.message || 'An unexpected error occurred',
      };
    }
  }

  /**
   * Fetch user profile
   */
  async fetchProfile(): Promise<UserProfile> {
    try {
      const response =
        await axiosInstance.get<ApiResponse<UserProfile>>('/profiles');
      return response.data.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(axiosError.message || 'Failed to fetch profile');
    }
  }

  /**
   * Process connection file
   */
  async processConnectionFile(fileId: string): Promise<any> {
    try {
      const response = await axiosInstance.post('/connections/process', {
        file_id: fileId,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(
        axiosError.message || 'Failed to process connection file',
      );
    }
  }
  async processStockFile(fileId: string): Promise<any> {
    try {
      const res = await axiosInstance.post('/process-stock-items-file', {
        file_id: fileId,
      });
      return res.data?.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(
        axiosError.message || 'Failed to process connection file',
      );
    }
  }

  /**
   * Get user ID from profile
   */
  async getUserId(): Promise<string> {
    try {
      const profile = await this.fetchProfile();
      return profile.id;
    } catch (error) {
      throw new Error('Failed to get user ID');
    }
  }

  /**
   * Logout user and clear tokens
   */
  logout(): void {
    localStorage.removeItem('discover_minds_access_token');
    localStorage.removeItem('discover_minds_refresh_token');
  }
}

export const apiClient = new ApiClient();
