
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

        // Timeout for the specific DB query
        const queryPromise = supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query Timeout')), 3000)
        );

        try {
            const result = await Promise.race([queryPromise, timeoutPromise]) as any;
            if (result.error) {
                console.error('[Auth] Role error:', result.error.message);
                return 'user';
            }
            console.log('[Auth] Role received:', result.data?.role);
            return result.data?.role ?? 'user';
        } catch (e: any) {
            console.error('[Auth] Role fetch failed/timed out:', e.message);
            return 'user'; // Fail safe to normal user
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            console.log('[Auth] Initializing session...');
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
                console.error('[Auth] Session init error:', err);
            } finally {
                setLoading(false);
                console.log('[Auth] Initial loading done');
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Auth] Event:', event);
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
        console.log('[Auth] Aggressive sign out...');
        try {
            // Clear local states first for immediate UI feedback
            setUser(null);
            setRole(null);

            // Try Supabase signout
            await supabase.auth.signOut();

            // Final blow: Force a complete page reload to clear all caches/states
            console.log('[Auth] Forcing page refresh...');
            window.location.href = '/';
        } catch (error) {
            console.error('[Auth] Sign out error:', error);
            window.location.reload();
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
