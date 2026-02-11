
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
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const roleRef = useRef<string | null>(null); // 역할 캐시 (세션 갱신 시 보호)

    const fetchRole = async (userId: string) => {
        // 이미 역할이 캐시되어 있으면 DB 조회 생략
        if (roleRef.current) {
            return roleRef.current;
        }

        const queryPromise = supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query Timeout')), 5000)
        );

        try {
            const result = await Promise.race([queryPromise, timeoutPromise]) as any;
            if (result.error) {
                console.error('[Auth] Role error:', result.error.message);
                return roleRef.current || 'user';
            }
            const fetchedRole = result.data?.role ?? 'user';
            roleRef.current = fetchedRole; // 캐시 저장
            return fetchedRole;
        } catch (e: any) {
            console.error('[Auth] Role fetch failed/timed out:', e.message);
            return roleRef.current || 'user'; // 기존 캐시 값 유지
        }
    };

    useEffect(() => {
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
                }
            } catch (err) {
                console.error('[Auth] Session init error:', err);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Auth] Event:', event);
            const currentUser = session?.user ?? null;

            if (event === 'TOKEN_REFRESHED') {
                // 토큰 갱신 시에는 유저/역할을 리셋하지 않음 (기존 상태 유지)
                setUser(currentUser);
                return;
            }

            if (event === 'SIGNED_OUT') {
                setUser(null);
                setRole(null);
                roleRef.current = null;
                return;
            }

            setUser(currentUser);

            if (currentUser) {
                // SIGNED_IN 이벤트에서만 역할 새로 조회
                if (event === 'SIGNED_IN') {
                    roleRef.current = null; // 새 로그인 시 캐시 초기화
                }
                const userRole = await fetchRole(currentUser.id);
                setRole(userRole);
            } else {
                setRole(null);
                roleRef.current = null;
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

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
