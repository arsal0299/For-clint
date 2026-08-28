import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  profile: null,
  loading: true,
  isAdmin: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile((data as Profile) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  return (
    <AuthContext.Provider
      value={{
        profile,
        loading,
        isAdmin: Boolean(profile?.is_admin),
        refreshProfile: loadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
