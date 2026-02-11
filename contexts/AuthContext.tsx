
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    role: string | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchRole = async (userId: string) => {
        console.log('[Auth] Fetching role for:', userId);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('[Auth] Role fetch error:', error.message);
                return 'user';
            }
            console.log('[Auth] Role successful:', data?.role);
            return data?.role ?? 'user';
        } catch (e) {
            console.error('[Auth] Role fetch exception:', e);
            return 'user';
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            console.log('[Auth] Initializing...');

            // Safety timeout: Ensure loading is resolved even if everything hangs
            const loadingTimeout = setTimeout(() => {
                console.warn('[Auth] Loading timed out, force clearing...');
                setLoading(false);
            }, 5000);

            try {
                const { data: { session } } = await supabase.auth.getSession();
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    const userRole = await fetchRole(currentUser.id);
                    setRole(userRole);
                } else {
                    setRole(null);
                }
            } catch (err) {
                console.error('[Auth] Init failed:', err);
            } finally {
                clearTimeout(loadingTimeout);
                setLoading(false);
                console.log('[Auth] Loading finished');
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Auth] State change:', event, session?.user?.email);
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                const userRole = await fetchRole(currentUser.id);
                setRole(userRole);
            } else {
                setRole(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        console.log('[Auth] Sign out initiated');
        try {
            await supabase.auth.signOut();
        } finally {
            setUser(null);
            setRole(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
