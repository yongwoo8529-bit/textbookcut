import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Loader2, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Signup: React.FC = () => {
    const [email, setEmail] = useState('');
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

        // ===== 디버깅 코드 추가 =====
        console.log('=== Signup Debug ===');
        console.log('email:', email);
        console.log('password:', password);
        console.log('email type:', typeof email);
        console.log('password type:', typeof password);
        
        // 비 ASCII 문자 검출
        function detectNonASCII(str: string, label: string) {
            for (let i = 0; i < str.length; i++) {
                const code = str.charCodeAt(i);
                if (code > 127) {
                    console.error(`❌ ${label}[${i}]: char="${str[i]}" code=${code}`);
                }
            }
        }
        
        detectNonASCII(email, 'email');
        detectNonASCII(password, 'password');
        
        // ISO-8859-1 검증 (0-255)
        function validateISO88591(str: string, label: string) {
            for (let i = 0; i < str.length; i++) {
                const code = str.charCodeAt(i);
                if (code > 255) {
                    console.error(`❌ ${label}[${i}]: INVALID code=${code}`);
                    return false;
                }
            }
            console.log(`✅ ${label}: valid`);
            return true;
        }
        
        const emailValid = validateISO88591(email, 'email');
        const passwordValid = validateISO88591(password, 'password');
        
        if (!emailValid || !passwordValid) {
            setMessage({ type: 'error', text: '입력값에 허용되지 않은 문자가 포함되어 있습니다.' });
            setLoading(false);
            return;
        }
        // ===== 디버깅 코드 끝 =====

        const { error } = await supabase.auth.signUp({
            email,
            password,
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
                        <label className="text-sm font-semibold text-slate-700 block ml-1">이메일</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="email"
                                required
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="example@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                                minLength={6}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 ml-1">비밀번호는 최소 6자 이상이어야 합니다.</p>
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