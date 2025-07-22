import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/integrations/fastapi/client";
import posthog from "posthog-js";
import { useAppSelector, useAppDispatch } from "@/store";
import { clearProfile } from "@/store/profileSlice";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{
    error: AuthError | null;
    emailExists?: boolean;
    weakPassword?: boolean;
    invalidEmail?: boolean;
    serverError?: boolean;
  }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const profile = useAppSelector(state => state.profile.profile);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email,
          name: session.user.user_metadata?.full_name,
          signUpDate: session.user.created_at,
        });
        posthog.capture("user_signed_in");
      } else if (!profile) {
        posthog.reset();
      }
    });

    const checkAuth = async () => {
      const token = localStorage.getItem("discover_minds_access_token");

      if (token && profile) {
        setLoading(false);

        if (profile.id) {
          posthog.identify(profile.id, {
            email: profile.email,
            name: profile.full_name,
          });
        }
      } else {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);

        if (data.session?.user) {
          posthog.identify(data.session.user.id, {
            email: data.session.user.email,
            name: data.session.user.user_metadata?.full_name,
            signUpDate: data.session.user.created_at,
          });
        }
      }
    };

    checkAuth();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<{
    error: AuthError | null;
    emailExists?: boolean;
    weakPassword?: boolean;
    invalidEmail?: boolean;
    serverError?: boolean;
  }> => {
    try {
      // Track signup attempt
      posthog.capture("signup_attempted", { email });

      const response = await apiClient.signUp(email, password, fullName || '');

      let emailExists = false;
      let invalidEmail = false;
      let weakPassword = false;
      let serverError = false;

      if (!response.success) {
        const errorMessage = response.message?.toLowerCase() || '';
        
        if (response.status_code === 409) {
          emailExists = true;
          posthog.capture("signup_error", { reason: "email_exists" });
        } else if (response.status_code === 400) {
          if (/email.*(invalid|format|valid)/i.test(errorMessage)) {
            invalidEmail = true;
            posthog.capture("signup_error", { reason: "invalid_email" });
          } else if (/password.*(weak|short|min|length)/i.test(errorMessage)) {
            weakPassword = true;
            posthog.capture("signup_error", { reason: "weak_password" });
          } else {
            serverError = true;
            posthog.capture("signup_error", { reason: "validation_error", message: errorMessage });
          }
        } else {
          serverError = true;
          posthog.capture("signup_error", { reason: "server_error", status: response.status_code });
        }

        return {
          error: new Error(response.message) as AuthError,
          emailExists,
          invalidEmail,
          weakPassword,
          serverError,
        };
      }

      // Track successful signup
      posthog.capture("signup_successful", { email });
      return { error: null };
    } catch (error: any) {
      console.error("SignUp Exception:", error.message);
      posthog.capture("signup_error", { reason: "exception", message: error.message });
      return {
        error: error as AuthError,
        serverError: true,
      };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    try {
      // Track login attempt
      posthog.capture("login_attempted", { email });

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("SignIn Error:", error.message);
        }
        posthog.capture("login_error", { reason: error.message });
      } else {
        // Login successful is tracked in the auth state change handler
      }

      return { error };
    } catch (error: any) {
      console.error("SignIn Exception:", error.message);
      posthog.capture("login_error", { reason: "exception", message: error.message });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      posthog.capture("logout_initiated");

      localStorage.removeItem("discover_minds_access_token");
      localStorage.removeItem("discover_minds_refresh_token");

      dispatch(clearProfile());

      await supabase.auth.signOut();

      posthog.reset();
    } catch (error: any) {
      console.error("SignOut Error:", error.message);
      posthog.capture("logout_error", { message: error.message });
    }
  };

  const effectiveUser = profile ? ({ id: profile.id, email: profile.email } as User) : user;

  const value = useMemo(
    () => ({
      user: effectiveUser,
      session,
      loading,
      signUp,
      signIn,
      signOut,
    }),
    [effectiveUser, session, loading, profile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
