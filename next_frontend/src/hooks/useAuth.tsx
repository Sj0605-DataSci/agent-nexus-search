import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import posthog from "posthog-js";

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

  useEffect(() => {
    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Identify user in PostHog when they sign in
      if (session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email,
          name: session.user.user_metadata?.full_name,
          signUpDate: session.user.created_at
        });
        posthog.capture('user_signed_in');
      } else {
        // Reset user identity when signed out
        posthog.reset();
      }
    });

    // Initial load
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      
      // Identify user in PostHog on initial load if they're logged in
      if (data.session?.user) {
        posthog.identify(data.session.user.id, {
          email: data.session.user.email,
          name: data.session.user.user_metadata?.full_name,
          signUpDate: data.session.user.created_at
        });
      }
    });

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
    const redirectUrl = `${window.location.origin}/`;

    try {
      // Track signup attempt
      posthog.capture('signup_attempted', { email });
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: fullName ? { full_name: fullName } : undefined,
        },
      });

      // Initialize flags
      let emailExists = false;
      let weakPassword = false;
      let invalidEmail = false;
      let serverError = false;

      if (error) {
        const msg = error.message.toLowerCase();

        if (error.status === 400) {
          if (/email.*(already|exist|used|registered)/i.test(msg)) {
            emailExists = true;
            posthog.capture('signup_error', { reason: 'email_exists' });
          } else if (/password.*(weak|short|min)/i.test(msg)) {
            weakPassword = true;
            posthog.capture('signup_error', { reason: 'weak_password' });
          } else if (/email.*(invalid|format|not valid)/i.test(msg)) {
            invalidEmail = true;
            posthog.capture('signup_error', { reason: 'invalid_email' });
          }
        }

        // Catch more general server-side or unknown issues
        if ((error.status && error.status >= 500) || msg.includes("unexpected")) {
          serverError = true;
          posthog.capture('signup_error', { reason: 'server_error' });
        }

        return {
          error,
          emailExists,
          weakPassword,
          invalidEmail,
          serverError,
        };
      }

      // Track successful signup
      posthog.capture('signup_successful', { email });
      return { error: null };
    } catch (error: any) {
      console.error("SignUp Exception:", error.message);
      posthog.capture('signup_error', { reason: 'exception', message: error.message });
      return {
        error: error as AuthError,
        serverError: true,
      };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    try {
      // Track login attempt
      posthog.capture('login_attempted', { email });
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("SignIn Error:", error.message);
        }
        posthog.capture('login_error', { reason: error.message });
      } else {
        // Login successful is tracked in the auth state change handler
      }
      
      return { error };
    } catch (error: any) {
      console.error("SignIn Exception:", error.message);
      posthog.capture('login_error', { reason: 'exception', message: error.message });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      posthog.capture('logout_initiated');
      await supabase.auth.signOut();
      // The actual reset of user identity happens in the auth state change handler
    } catch (error: any) {
      console.error("SignOut Error:", error.message);
      posthog.capture('logout_error', { message: error.message });
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
    }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
