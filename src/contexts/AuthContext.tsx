
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
    const userRef = useRef<User | null>(null);

    const stopLoading = () => setLoading(false);

    const fetchProfile = async (userId: string, userObj?: User | null) => {
        try {
            const metaNickname = userObj?.user_metadata?.nickname;
            const { data } = await supabase
                .from('profiles')
                .select('role, nickname')
                .eq('id', userId)
                .single();

            const isHardcodedAdmin = userObj?.email === 'yongwoo8529@gmail.com' || data?.nickname === 'yongwoo' || metaNickname === 'yongwoo';
            const fetchedRole = isHardcodedAdmin ? 'admin' : (data?.role ?? 'user');
            const fetchedNickname = data?.nickname || metaNickname || (userObj?.email ? userObj.email.split('@')[0] : 'User');

            roleRef.current = fetchedRole;
            localStorage.setItem('user-role', fetchedRole);
            localStorage.setItem('user-nickname', fetchedNickname);
            setRole(fetchedRole);
            setNickname(fetchedNickname);
            return { role: fetchedRole, nickname: fetchedNickname };
        } catch (e) {
            console.error('[Auth] Profile fetch background error:', e);
            return null;
        }
    };

    useEffect(() => {
        const safetyTimer = setTimeout(() => {
            console.warn('[Auth] Performance safety trigger.');
            stopLoading();
        }, 2500);

        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                userRef.current = currentUser;

                // 세션 확인 즉시 로딩 종료 (비차단형)
                stopLoading();
                clearTimeout(safetyTimer);

                if (currentUser) {
                    // 프로필은 백그라운드에서 로드
                    fetchProfile(currentUser.id, currentUser);
                }
            } catch (err) {
                console.error('[Auth] Init error:', err);
                stopLoading();
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null;

            if (event === 'SIGNED_OUT') {
                setUser(null); setRole(null); setNickname(null); roleRef.current = null;
                localStorage.removeItem('user-role');
                localStorage.removeItem('user-nickname');
                stopLoading();
                return;
            }

            if (event === 'TOKEN_REFRESHED') return;

            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                setUser(currentUser);
                userRef.current = currentUser;
                if (currentUser) fetchProfile(currentUser.id, currentUser);
                stopLoading();
            }
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(safetyTimer);
        };
    }, []);

    const signOut = async () => {
        try {
            // 서버 응답 기다리지 않고 로컬 즉시 파괴
            setUser(null); setRole(null); setNickname(null);
            localStorage.clear(); // 전체 클리어로 확실히 제거

            await supabase.auth.signOut();
            window.location.href = '/';
        } catch (error) {
            console.error('[Auth] Hard signOut error:', error);
            window.location.href = '/';
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, nickname, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
