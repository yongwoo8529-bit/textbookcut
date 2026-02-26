
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

    const fetchProfile = async (userId: string, userObj?: User | null) => {
        try {
            // 메타데이터에서 닉네임 먼저 시도 (가장 빠름)
            const metaNickname = userObj?.user_metadata?.nickname;

            const { data, error } = await supabase
                .from('profiles')
                .select('role, nickname')
                .eq('id', userId)
                .single();

            // 특정 이메일 또는 닉네임 "yongwoo"는 관리자 권한
            const isHardcodedAdmin = userObj?.email === 'yongwoo8529@gmail.com' || data?.nickname === 'yongwoo' || metaNickname === 'yongwoo';
            const fetchedRole = isHardcodedAdmin ? 'admin' : (data?.role ?? 'user');

            // 닉네임 우선순위: DB > 메타데이터 > 이메일 앞부분
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
            return {
                role: roleRef.current || 'user',
                nickname: savedNickname
            };
        }
    };

    useEffect(() => {
        // 강력한 세이프티 타이머: 어떤 경우에도 5초 뒤에는 로딩을 강제 종료
        const safetyTimer = setTimeout(() => {
            console.warn('[Auth] Safety timeout reached. Forcing loading to false.');
            setLoading(false);
        }, 5000);

        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                userRef.current = currentUser;

                if (currentUser) {
                    const { role: userRole, nickname: userNickname } = await fetchProfile(currentUser.id, currentUser);
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
                if (userRef.current === null) {
                    setLoading(false); // 유저가 없을 때만 여기서 종료
                }
                clearTimeout(safetyTimer);
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

            if (event === 'TOKEN_REFRESHED' || (event === 'USER_UPDATED' && userRef.current?.id === currentUser?.id)) {
                return;
            }

            setLoading(true);
            setUser(currentUser);
            userRef.current = currentUser;

            try {
                if (currentUser) {
                    const { role: userRole, nickname: userNickname } = await fetchProfile(currentUser.id, currentUser);
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
    }, []);

    const signOut = async () => {
        try {
            setLoading(true); // 로그아웃 시작 시 로딩 표시
            await supabase.auth.signOut();
            setUser(null);
            setRole(null);
            setNickname(null);
            roleRef.current = null;
            userRef.current = null;
            localStorage.removeItem('user-role');
            localStorage.removeItem('user-nickname');

            // 세션 스토리지 플래그는 유지 (무한 루프 방지)

            if (window.location.pathname !== '/') {
                window.location.href = '/';
            } else {
                setLoading(false); // 홈이면 상태만 업데이트
            }
        } catch (error) {
            console.error('[Auth] Sign out error:', error);
            window.location.reload();
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, nickname, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
