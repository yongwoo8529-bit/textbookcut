import React, { useState } from 'react';
import { supabase, getInternalEmail, getInternalPassword } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Loader2, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Signup: React.FC = () => {
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    // 이미 로그인된 유저는 대시보드로 리다이렉트
    React.useEffect(() => {
        if (user && !authLoading) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, authLoading, navigate]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const internalEmail = getInternalEmail(nickname);
        const internalPassword = getInternalPassword(password);

        const { error } = await supabase.auth.signUp({
            email: internalEmail,
            password: internalPassword,
            options: {
                data: {
                    nickname: nickname
                }
            }
        });

        if (error) {
            setMessage({ type: 'error', text: error.message });
            setLoading(false);
        } else {
            setLoading(false);
            alert('회원가입이 완료되었습니다! 로그인해 주세요.');
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                <div className="text-center mb-8">
                    <div className="inline-block p-3 bg-indigo-600 rounded-xl shadow-lg mb-4">
                        <UserPlus className="text-white w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900">회원가입</h2>
                    <p className="text-slate-500 mt-2">새로운 공부 파트너와 함께 시작해 보세요</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 block ml-1">기억하실 수 있는 영어 닉네임이나 이름</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                required
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="영어 닉네임 또는 이름"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 block ml-1">비밀번호를 입력해주세요</label>
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
                        <p className="text-[10px] text-slate-400 ml-1">비밀번호나 이름은 1자리로 적어도 됩니다.</p>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm border animate-in fade-in ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.98] disabled:bg-indigo-300"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "가입하기"}
                    </button>
                </form>

                <div className="mt-8 text-center text-slate-600 text-sm">
                    이미 계정이 있으신가요?{" "}
                    <Link to="/login" className="text-indigo-600 font-bold hover:underline">
                        로그인
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;