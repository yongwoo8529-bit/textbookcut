
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

    // 공통 로딩 종료 함수 (타임아웃 보호 포함)
    const stopLoading = () => {
        setLoading(false);
    };

    const fetchProfile = async (userId: string, userObj?: User | null) => {
        try {
            const metaNickname = userObj?.user_metadata?.nickname;
            const { data, error } = await supabase
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
            console.error('[Auth] Profile fetch failed:', e);
            const savedNickname = localStorage.getItem('user-nickname') || 'User';
            setNickname(savedNickname);
            return { role: roleRef.current || 'user', nickname: savedNickname };
        }
    };

    useEffect(() => {
        // 1. 초기 로딩 보호 타이머
        const initialSafetyTimer = setTimeout(() => {
            console.warn('[Auth] Initial safety timeout. Forcing loading false.');
            stopLoading();
        }, 5000);

        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                userRef.current = currentUser;

                if (currentUser) {
                    await fetchProfile(currentUser.id, currentUser);
                } else {
                    setRole(null);
                    setNickname(null);
                    roleRef.current = null;
                    localStorage.removeItem('user-role');
                    localStorage.removeItem('user-nickname');
                }
            } catch (err) {
                console.error('[Auth] initAuth error:', err);
            } finally {
                stopLoading();
                clearTimeout(initialSafetyTimer);
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
                stopLoading();
                return;
            }

            if (event === 'TOKEN_REFRESHED') return;

            setLoading(true);
            const actionTimer = setTimeout(() => stopLoading(), 5000); // 상태 변경 시 5초 보호

            setUser(currentUser);
            userRef.current = currentUser;

            try {
                if (currentUser) {
                    await fetchProfile(currentUser.id, currentUser);
                } else {
                    setRole(null);
                    setNickname(null);
                }
            } finally {
                stopLoading();
                clearTimeout(actionTimer);
            }
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(initialSafetyTimer);
        };
    }, []);

    const signOut = async () => {
        const signoutTimer = setTimeout(() => {
            console.warn('[Auth] SignOut hang detected. Forcing UI reset.');
            window.location.href = '/';
        }, 4000);

        try {
            setLoading(true);
            await supabase.auth.signOut();

            setUser(null);
            setRole(null);
            setNickname(null);
            roleRef.current = null;
            userRef.current = null;
            localStorage.removeItem('user-role');
            localStorage.removeItem('user-nickname');

            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('[Auth] signOut error:', error);
            window.location.reload();
        } finally {
            clearTimeout(signoutTimer);
            stopLoading();
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, nickname, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
