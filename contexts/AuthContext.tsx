
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
        // Check active sessions and subscribe to auth changes
        const setData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);

                if (session?.user) {
                    const { data: profile, error: pError } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();

                    if (pError) {
                        console.error('Error fetching profile:', pError);
                        setRole('user');
                    } else {
                        console.log('Fetched role for user:', profile?.role);
                        setRole(profile?.role ?? 'user');
                    }
                } else {
                    setRole(null);
                }
            } catch (error) {
                console.error('Error during auth initialization:', error);
                setUser(null);
                setRole(null);
            } finally {
                setLoading(false);
            }
        };

        setData();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setLoading(true);
            try {
                setUser(session?.user ?? null);
                if (session?.user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();
                    setRole(profile?.role ?? 'user');
                } else {
                    setRole(null);
                }
            } catch (error) {
                console.error('Error during auth state change:', error);
                setUser(null);
                setRole(null);
            } finally {
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
            setUser(null);
            setRole(null);
        } catch (error) {
            console.error('Error signing out:', error);
            // Fallback: clear state even if API fails
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
