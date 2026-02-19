
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Loader2, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
    const { user, loading: authLoading } = useAuth(); // AuthContext 리다이렉트 체크용

    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // 이미 로그인된 유저는 대시보드로 리다이렉트
    useEffect(() => {
        if (user && !authLoading) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, authLoading, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 닉네임을 내부적으로 이메일 형식으로 변환
            const internalEmail = `${nickname}@user.local`;
            // 가입 시와 동일한 패딩 적용
            const internalPassword = password + "_local_pad";

            const { error } = await supabase.auth.signInWithPassword({
                email: internalEmail,
                password: internalPassword
            });

            if (error) {
                setError(error.message);
                setLoading(false);
            } else {
                // 로그인 성공 시 리다이렉트는 위 useEffect가 처리하거나, 여기서 명시적으로 이동
                navigate('/dashboard', { replace: true });
            }
        } catch (err) {
            setError('로그인 중 오류가 발생했습니다.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                <div className="text-center mb-8">
                    <div className="inline-block p-3 bg-indigo-600 rounded-xl shadow-lg mb-4">
                        <LogIn className="text-white w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900">로그인</h2>
                    <p className="text-slate-500 mt-2">모의고사 대비 사이트 서비스를 이용해 보세요</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 block ml-1">닉네임 또는 이름</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                required
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="닉네임 또는 이름"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 block ml-1">비밀번호</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="password"
                                required
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 animate-in fade-in">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.98] disabled:bg-indigo-300"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "로그인"}
                    </button>
                </form>

                <div className="mt-8 text-center text-slate-600 text-sm">
                    계정이 없으신가요?{" "}
                    <Link to="/signup" className="text-indigo-600 font-bold hover:underline">
                        회원가입
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
