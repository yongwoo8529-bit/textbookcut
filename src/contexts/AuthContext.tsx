
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    role: string | null;
    nickname: string | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    nickname: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(localStorage.getItem('user-role'));
    const [nickname, setNickname] = useState<string | null>(localStorage.getItem('user-nickname'));
    const [loading, setLoading] = useState(true);
    const roleRef = useRef<string | null>(localStorage.getItem('user-role'));

    const fetchProfile = async (userId: string, email?: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role, nickname')
                .eq('id', userId)
                .single();

            // 특정 이메일 또는 닉네임 "yongwoo"는 무조건 관리자 권한 부여
            const isHardcodedAdmin = email === 'yongwoo8529@gmail.com' || data?.nickname === 'yongwoo';
            const fetchedRole = isHardcodedAdmin ? 'admin' : (data?.role ?? 'user');
            const fetchedNickname = data?.nickname ?? (email ? email.split('@')[0] : 'User');

            roleRef.current = fetchedRole;
            localStorage.setItem('user-role', fetchedRole);
            localStorage.setItem('user-nickname', fetchedNickname);
            setRole(fetchedRole);
            setNickname(fetchedNickname);

            return { role: fetchedRole, nickname: fetchedNickname };
        } catch (e) {
            console.error('[Auth] Profile fetch failed:', e);
            return {
                role: roleRef.current || 'user',
                nickname: localStorage.getItem('user-nickname') || 'User'
            };
        }
    };

    useEffect(() => {
        const safetyTimer = setTimeout(() => {
            setLoading(false);
        }, 3000);

        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    const { role: userRole, nickname: userNickname } = await fetchProfile(currentUser.id, currentUser.email);
                    setRole(userRole);
                    setNickname(userNickname);
                } else {
                    setRole(null);
                    setNickname(null);
                    roleRef.current = null;
                    localStorage.removeItem('user-role');
                    localStorage.removeItem('user-nickname');
                }
            } catch (err) {
                console.error('[Auth] Session init error:', err);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null;

            if (event === 'SIGNED_OUT') {
                setUser(null);
                setRole(null);
                setNickname(null);
                roleRef.current = null;
                localStorage.removeItem('user-role');
                localStorage.removeItem('user-nickname');
                setLoading(false);
                return;
            }

            if (event === 'TOKEN_REFRESHED' || (event === 'USER_UPDATED' && user?.id === currentUser?.id)) {
                return;
            }

            setLoading(true);
            setUser(currentUser);

            try {
                if (currentUser) {
                    const { role: userRole, nickname: userNickname } = await fetchProfile(currentUser.id, currentUser.email);
                    setRole(userRole);
                    setNickname(userNickname);
                } else {
                    setRole(null);
                    setNickname(null);
                    roleRef.current = null;
                    localStorage.removeItem('user-role');
                    localStorage.removeItem('user-nickname');
                }
            } finally {
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(safetyTimer);
        };
    }, [user?.id]);

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
            setUser(null);
            setRole(null);
            setNickname(null);
            roleRef.current = null;
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('[Auth] Sign out error:', error);
            window.location.reload();
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, nickname, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
