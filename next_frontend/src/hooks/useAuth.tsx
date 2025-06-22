import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
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
    });

    // Initial load
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
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
          } else if (/password.*(weak|short|min)/i.test(msg)) {
            weakPassword = true;
          } else if (/email.*(invalid|format|not valid)/i.test(msg)) {
            invalidEmail = true;
          }
        }

        // Catch more general server-side or unknown issues
        if (
          (error.status && error.status >= 500) ||
          msg.includes("unexpected")
        ) {
          serverError = true;
        }

        return {
          error,
          emailExists,
          weakPassword,
          invalidEmail,
          serverError,
        };
      }

      return { error: null };
    } catch (error: any) {
      console.error("SignUp Exception:", error.message);
      return {
        error: error as AuthError,
        serverError: true,
      };
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error && process.env.NODE_ENV === "development") {
        console.error("SignIn Error:", error.message);
      }
      return { error };
    } catch (error: any) {
      console.error("SignIn Exception:", error.message);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      console.error("SignOut Error:", error.message);
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
