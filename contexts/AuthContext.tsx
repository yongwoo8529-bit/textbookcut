
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
    const [role, setRole] = useState<string | null>(localStorage.getItem('user-role'));
    const [loading, setLoading] = useState(true);
    const roleRef = useRef<string | null>(localStorage.getItem('user-role'));

    const fetchRole = async (userId: string) => {
        // 캐시가 있으면 즉시 반환하여 깜빡임 방지
        if (roleRef.current) return roleRef.current;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (error) throw error;

            const fetchedRole = data?.role ?? 'user';
            roleRef.current = fetchedRole;
            localStorage.setItem('user-role', fetchedRole);
            return fetchedRole;
        } catch (e) {
            console.error('[Auth] Role fetch failed:', e);
            return 'user';
        }
    };

    useEffect(() => {
        // 안전장치: 3초 뒤에는 무조건 로딩 종료 (무한 로딩 방지)
        const safetyTimer = setTimeout(() => {
            setLoading(false);
        }, 3000);

        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    const userRole = await fetchRole(currentUser.id);
                    setRole(userRole);
                } else {
                    setRole(null);
                    roleRef.current = null;
                    localStorage.removeItem('user-role');
                }
            } catch (err) {
                console.error('[Auth] Session init error:', err);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            // console.log('[Auth] Event:', event); // 디버깅용 로그 제거
            const currentUser = session?.user ?? null;

            if (event === 'SIGNED_OUT') {
                setUser(null);
                setRole(null);
                roleRef.current = null;
                localStorage.removeItem('user-role');
                setLoading(false);
                return;
            }

            // 토큰 갱신 등은 로딩 상태 건드리지 않음
            if (event === 'TOKEN_REFRESHED' || (event === 'USER_UPDATED' && user?.id === currentUser?.id)) {
                return;
            }

            // 그 외 로그인 관련 이벤트
            setLoading(true);
            setUser(currentUser);

            try {
                if (currentUser) {
                    const userRole = await fetchRole(currentUser.id);
                    setRole(userRole);
                } else {
                    setRole(null);
                    roleRef.current = null;
                    localStorage.removeItem('user-role');
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
            setUser(null);
            setRole(null);
            roleRef.current = null;
            await supabase.auth.signOut();
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
