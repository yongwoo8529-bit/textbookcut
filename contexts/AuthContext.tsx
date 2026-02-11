
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

    useEffect(() => {
        const setData = async () => {
            console.log('[Auth] Initializing session...');
            try {
                const { data: { session }, error: sError } = await supabase.auth.getSession();
                if (sError) {
                    console.error('[Auth] Session error:', sError);
                    setUser(null);
                    setRole(null);
                    setLoading(false);
                    return;
                }

                const currentUser = session?.user ?? null;
                console.log('[Auth] User found:', currentUser?.email);
                setUser(currentUser);

                if (currentUser) {
                    console.log('[Auth] Fetching role for:', currentUser.id);
                    // Add a 5s timeout to the profile fetch to prevent infinite hang
                    const profilePromise = supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', currentUser.id)
                        .single();

                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
                    );

                    try {
                        const result = await (Promise.race([profilePromise, timeoutPromise]) as any);

                        if (result.error) {
                            console.error('[Auth] Profile error:', result.error);
                            setRole('user');
                        } else {
                            console.log('[Auth] Role fetched:', result.data?.role);
                            setRole(result.data?.role ?? 'user');
                        }
                    } catch (pErr: any) {
                        console.error('[Auth] Role fetch exception/timeout:', pErr.message);
                        setRole('user'); // Default to user on timeout
                    }
                } else {
                    setRole(null);
                }
            } catch (error) {
                console.error('[Auth] Unexpected init error:', error);
                setUser(null);
                setRole(null);
            } finally {
                console.log('[Auth] Initialization complete, setting loading to false');
                setLoading(false);
            }
        };

        setData();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Auth] Auth state changed:', event, session?.user?.email);
            setUser(session?.user ?? null);
            if (session?.user) {
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();
                    setRole(profile?.role ?? 'user');
                } catch (e) {
                    console.error('[Auth] Role fetch error on change:', e);
                    setRole('user');
                }
            } else {
                setRole(null);
            }
            // Always ensure loading is false after state change handled
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        console.log('[Auth] Signing out...');
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('[Auth] Sign out error:', error);
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
