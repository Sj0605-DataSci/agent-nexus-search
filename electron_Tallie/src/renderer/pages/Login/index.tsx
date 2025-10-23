import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiClient } from '../../../lib/api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import './styles.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [lastShownError, setLastShownError] = useState<string | null>(null);
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const {
    isAuthenticated,
    signInWithGoogle,
    setSessionFromTokens,
    error: authError,
  } = useAuth();

  // Reset OAuth state on component mount to prevent stale state issues
  useEffect(() => {
    setOauthLoading(null);
    setHasRedirected(false);
  }, []);

  // Redirect to upload page if authenticated via OAuth (not traditional login)
  useEffect(() => {
    // Only redirect if OAuth was initiated (oauthLoading is 'google') and now authenticated
    if (isAuthenticated && !hasRedirected && oauthLoading === 'google') {
      setHasRedirected(true);
      setOauthLoading(null); // Reset OAuth loading state
      toast.success('OAuth login successful!');
      
      // Small delay to ensure state is stable
      const timeoutId = setTimeout(() => {
        navigate('/upload');
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, navigate, hasRedirected, oauthLoading]);

  // Show auth errors (with deduplication)
  useEffect(() => {
    if (authError && authError.message !== lastShownError) {
      toast.error(authError.message || 'Authentication error');
      setLastShownError(authError.message);
    } else if (!authError && lastShownError) {
      // Reset when error clears
      setLastShownError(null);
    }
  }, [authError, lastShownError]);

  const handleGoogleLogin = async () => {
    console.log('[Login] Starting Google OAuth flow...');
    setOauthLoading('google');
    
    // Safety timeout: reset loading state after 30 seconds if no response
    const timeoutId = setTimeout(() => {
      console.warn('[Login] OAuth timeout - resetting loading state');
      setOauthLoading(null);
      toast.error('OAuth timeout - please try again');
    }, 30000);
    
    // Store timeout for cleanup
    timeoutRef.current = timeoutId;
    
    try {
      console.log('[Login] Calling signInWithGoogle...');
      const result = await signInWithGoogle();
      console.log('[Login] signInWithGoogle result:', result);
      
      clearTimeout(timeoutId);
      timeoutRef.current = null;
      
      if (result.success) {
        toast.success('Opening Google Sign-In in your browser...');
        console.log('[Login] OAuth flow initiated successfully');
        // Keep oauthLoading set to track that OAuth was initiated
      } else {
        console.error('[Login] OAuth flow failed:', result.error);
        toast.error(result.error || 'Failed to initiate Google Sign-In');
        setOauthLoading(null);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      timeoutRef.current = null;
      console.error('[Login] Google login error:', error);
      toast.error('Failed to initiate Google Sign-In');
      setOauthLoading(null);
    }
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Basic validation
    if (!email || !email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    
    if (!password || !password.trim()) {
      toast.error('Please enter your password');
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setOauthLoading(null); // Ensure OAuth state is cleared for regular login

    try {
      const response = await apiClient.login({
        email: email.trim(),
        password,
      });

      if (response.success && response.data) {
        console.log('Login successful'); // Don't log sensitive data
        
        // Set Supabase session from tokens
        const { access_token, refresh_token } = response.data;
        if (access_token && refresh_token) {
          const sessionResult = await setSessionFromTokens(access_token, refresh_token);
          
          if (sessionResult.success) {
            toast.success('Login successful!');
            // Navigate to chat page after successful login
            setTimeout(() => {
              navigate('/chat');
            }, 1000);
          } else {
            console.error('Failed to set session:', sessionResult.error);
            toast.error('Login successful but session setup failed. Please try again.');
          }
        } else {
          toast.error('Login response missing tokens');
        }
      } else {
        toast.error(
          response.message || 'Login failed. Please check your credentials.',
        );
      }
    } catch (err: any) {
      console.error('Login error:', err.message || 'Unknown error');

      const errorMessage = err.message || 'An unexpected error occurred.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">
          {isRegister ? 'Register to Tallie' : 'Login to Tallie'}
        </h1>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="forgot-password">
            <a 
              href="https://www.test-web.discoverminds.ai/user-auth?active=reset" 
              className="forgot-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Forgot password?
            </a>
          </div>

          <button 
            type="submit" 
            className="login-button" 
            disabled={loading || oauthLoading !== null || !email || !password}
          >
            {loading ? 'Loading...' : isRegister ? 'Register' : 'Login'}
          </button>

          <div className="divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="google-button"
            onClick={handleGoogleLogin}
            disabled={loading || oauthLoading !== null}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z"
                fill="#4285F4"
              />
              <path
                d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z"
                fill="#34A853"
              />
              <path
                d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z"
                fill="#EA4335"
              />
            </svg>
            {oauthLoading === 'google' ? 'Loading...' : 'Continue with Google'}
          </button>

          {oauthLoading === 'google' && (
            <div className="oauth-info" style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#3b82f6',
              textAlign: 'center',
              lineHeight: '1.5'
            }}>
              <p style={{ margin: 0 }}>
                ℹ️ After signing in with Google, close the browser window and return to this app.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default Login;
