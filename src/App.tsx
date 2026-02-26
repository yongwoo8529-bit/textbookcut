import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Sparkles, Loader2, GraduationCap, Send,
  MessageCircle, RotateCcw, CheckCircle2, BadgeCheck, List,
  LogIn, UserPlus, LogOut, Database, User as UserIcon, Settings
} from 'lucide-react';
import { getStudyGuide, createStudyChat } from './services/geminiService';
import { SearchResult } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminCollect from './pages/AdminCollect';
import AdminConfig from './pages/AdminConfig';
interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
const PUBLISHERS_LIST = [
  '미래엔', '비상교육', '동아출판', '천재교육', '지학사', '씨마스', '천재교과서', '성림출판', 'YBM'
];
const SUBJECTS = ['국어', '영어', '수학', '한국사', '과학', '사회'];
// --- Components ---
const Navbar: React.FC = () => {
  const { user, role, nickname, signOut } = useAuth();
  return (
    <header className="w-full bg-white border-b border-slate-200 py-4 px-4 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-indigo-200 shadow-lg">
              <GraduationCap className="text-white w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">3모 고득점 전략 연구소</h1>
          </div>
        ) : (
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-indigo-200 shadow-lg">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">3모 고득점 전략 가이드</h1>
          </Link>
        )}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {role === 'admin' && (
                <div className="flex gap-2">
                  <Link to="/admin/collect" className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 font-bold text-[10px] hover:bg-red-100 transition-colors">
                    <Database className="w-3 h-3" />
                    수집
                  </Link>
                  <Link to="/admin/config" className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-[10px] hover:bg-slate-200 transition-colors">
                    <Settings className="w-3 h-3" />
                    설정
                  </Link>
                </div>
              )}

              <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl font-bold text-xs">
                <UserIcon className="w-3.5 h-3.5" />
                {nickname || user.email?.split('@')[0]}
                <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                  {role === 'admin' ? '관리자' : (role || 'none')}
                </span>
              </div>
              <button
                onClick={() => {
                  localStorage.clear();
                  signOut();
                }}
                className="text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 transition-all flex items-center gap-2 font-bold text-xs"
                title="로그아웃"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>로그아웃</span>
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-bold text-sm px-3 py-2">
                로그인
              </Link>
              <Link to="/signup" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md">
                시작하기
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
const LandingPage: React.FC = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState('');
  const [schoolLevel] = useState('중학교');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleReset = () => {
    setSelectedSubject('');
    setResult(null);
    setError(null);
    setChatMessages([]);
    setChatSession(null);
  };

  // --- 통합 홈 화면 UI (Hero + Dashboard/Auth) ---
  const HeroSection = () => (
    <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-black mb-6 border border-indigo-100 animate-bounce">
        ✨ 3모 고득점 전략 가이드 준비 중
      </div>
      <h2 className="text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
        실전 대비: 5개년(2021-2025) 초정밀 전략 분석
      </h2>
      <p className="text-slate-500 text-xl max-w-lg mx-auto mb-10 leading-relaxed">
        최근 5개년 핵심 트렌드와 전문가의 실전 노하우를 결합하여<br />
        당신만을 위한 최상의 합격 시나리오를 만나보세요.
      </p>
    </div>
  );

  const ResetButton = () => (
    <div className="flex justify-end mb-6">
      <button
        onClick={handleReset}
        className="px-4 py-2 text-sm text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-2 bg-white rounded-lg border border-slate-200 hover:border-indigo-200 transition-all"
      >
        <RotateCcw className="w-4 h-4" />
        새로운 주제 분석하기
      </button>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (result) return;
    if (!selectedSubject) {
      setError('교과를 먼저 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const unitInfo = '';
      const data = await getStudyGuide(selectedSubject, unitInfo, schoolLevel, '3학년', '');
      setResult(data);
      const chat = createStudyChat(JSON.stringify(data));
      setChatSession(chat);
      setChatMessages([]);
    } catch (err: any) {
      console.error("Submit Error:", err);
      if (err.message === 'RATE_LIMIT_EXCEEDED') {
        setError('현재 서비스 이용자가 많아 API 할당량이 일시적으로 소모되었습니다. 약 1분 후 다시 시도해 주세요.');
      } else if (err.message === 'NOT_FOUND') {
        setError('입력하신 정보에 해당되는 교과서를 찾을 수 없습니다. 출판사와 과목명을 다시 확인해 주세요.');
      } else {
        setError(`정보를 불러오는 데 실패했습니다: ${err.message || '알 수 없는 오류'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !chatSession || chatLoading) return;
    const newMessage: ChatMessage = { role: 'user', text: userInput };
    setChatMessages(prev => [...prev, newMessage]);
    const currentInput = userInput;
    setUserInput('');
    setChatLoading(true);

    try {
      const response = await chatSession.sendMessage({ message: currentInput });
      const modelMessage: ChatMessage = { role: 'model', text: response.text || '' };
      setChatMessages(prev => [...prev, modelMessage]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', text: '답변을 생성할 수 없습니다.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (import.meta.env.DEV) {
    console.log('DEBUG: LandingPage rendered, user:', user ? user.email : 'null', 'authLoading:', authLoading);
  }

  // 0. Global Loading (handled by AppContent, but here as a secondary guard)
  if (authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // 1. Guest View (Not logged in)
  if (!user && !authLoading) {
    return (
      <main className="max-w-4xl w-full px-4 py-20 flex-1 mx-auto text-center animate-in fade-in zoom-in duration-500">
        <HeroSection />
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/signup" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2">
            <UserPlus className="w-5 h-5" />
            무료로 시작하기
          </Link>
          <Link to="/login" className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-2xl text-lg font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <LogIn className="w-5 h-5" />
            이미 계정이 있나요?
          </Link>
        </div>
      </main>
    );
  }

  // 2. Dashboard View (Logged in)
  return (
    <main className="max-w-4xl w-full px-4 py-12 flex-1 mx-auto">
      {/* 관리자 공지사항 표시 */}
      {localStorage.getItem('admin_notice') && (
        <div className="mb-8 bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-lg shadow-indigo-100 font-bold text-sm">
          <Sparkles className="w-4 h-4 text-indigo-200" />
          {localStorage.getItem('admin_notice')}
        </div>
      )}

      {!result && !loading && <HeroSection />}

      {result && <ResetButton />}

      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                과목 선택
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {SUBJECTS.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    disabled={loading || !!result}
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${selectedSubject === sub
                      ? 'bg-indigo-600 text-white shadow-lg scale-105'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      } disabled:opacity-70`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!result && (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.98] disabled:bg-indigo-300 disabled:shadow-none mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>기출 데이터 분석 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>기출 분석 요약 생성하기</span>
                </>
              )}
            </button>
          )}
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 mb-8">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          {error}
        </div>
      )}

      {result && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
          <div className="flex justify-end">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-2 bg-white rounded-lg border border-slate-200 hover:border-indigo-200 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              새로운 주제 분석하기
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BadgeCheck className="text-indigo-200 w-6 h-6" />
                <h3 className="text-xl font-bold text-white">5개년(2021-2025) 실전 전략 가이드</h3>
              </div>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/30 backdrop-blur-sm">
                PREMIUM STRATEGY
              </span>
            </div>

            <div className="p-8 space-y-10">
              {result.sections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-4">
                  <h4 className="text-xl font-bold text-indigo-900 border-b border-indigo-100 pb-2 flex items-center gap-2">
                    {section.title}
                  </h4>
                  <div className="space-y-6">
                    {section.parts.map((paragraph, pIdx) => (
                      <div key={pIdx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        {paragraph.map((sentence, tIdx) => (
                          <div key={tIdx} className={`text-slate-700 leading-relaxed mb-3 last:mb-0 ${sentence.isImportant ? 'font-bold text-indigo-700' : ''}`}>
                            {sentence.isImportant && <span className="inline-block mr-2 text-indigo-500">🔥</span>}
                            <div
                              className="inline"
                              dangerouslySetInnerHTML={{ __html: sentence.text.replace(/\n/g, '<br />') }}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {result.keywords && result.keywords.length > 0 && (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <List className="w-5 h-5 text-indigo-600" />
                      필수 개념 용어
                    </h4>
                    <div className="space-y-3">
                      {result.keywords.map((kw, idx) => (
                        <div key={idx} className="flex gap-2 text-sm">
                          <span className="font-black text-indigo-600 shrink-0">[{kw.word}]</span>
                          <span className="text-slate-600">{kw.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.expertTips && result.expertTips.length > 0 && (
                  <div className="bg-indigo-600 p-6 rounded-2xl border border-indigo-500 shadow-xl shadow-indigo-100">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-200" />
                      전문가의 실전 비책
                    </h4>
                    <div className="space-y-3">
                      {result.expertTips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-indigo-50 font-medium">
                          <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] text-white">
                            {idx + 1}
                          </div>
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {result.timeManagement && (
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                    <h4 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
                      <RotateCcw className="w-5 h-5 text-emerald-600" />
                      실전 시간 배분 전략
                    </h4>
                    <p className="text-sm text-emerald-800 leading-relaxed font-medium">
                      {result.timeManagement}
                    </p>
                  </div>
                )}

                {result.trapAlerts && result.trapAlerts.length > 0 && (
                  <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100">
                    <h4 className="text-lg font-bold text-rose-900 mb-4 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-rose-600" />
                      빈출 함정 알림
                    </h4>
                    <div className="space-y-3">
                      {result.trapAlerts.map((trap, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-rose-800 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          {trap}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col mt-16 transition-all ring-1 ring-slate-100">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-8 py-8 flex items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl ring-4 ring-white/10 group">
                  <Sparkles className="text-white w-8 h-8 group-hover:scale-110 transition-transform" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">AI 3모 튜터</h3>
                <p className="text-indigo-200/70 text-sm font-bold">실시간 5개년 트렌드 분석 및 1:1 학습 상담</p>
              </div>
              <div className="ml-auto flex gap-2">
                <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-indigo-300 border border-white/5 uppercase">
                  온라인
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto max-h-[600px] bg-slate-50/50 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-indigo-400" />
                  </div>
                  <p className="text-slate-500 text-sm">
                    궁금한 점을 물어보시면 AI 튜터가 친절하게 답변해드립니다.<br />
                    "이 내용 더 쉽게 설명해줘" 또는 "예시를 들어줘"라고 물어보세요.
                  </p>
                </div>
              )}

              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`
                max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm
                ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'}
              `}>
                    {msg.role === 'model' && msg.text.includes('최다 빈출') && (
                      <div className="flex items-center gap-1 mb-2">
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-md text-[10px] font-black border border-red-100 uppercase tracking-tighter shadow-sm">
                          🔥 최다 빈출
                        </span>
                      </div>
                    )}
                    <div dangerouslySetInnerHTML={{
                      __html: msg.text.replace(/\n/g, '<br />')
                    }} />
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span className="text-xs text-slate-500">답변 생성 중...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input
                type="text"
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                placeholder="AI 튜터에게 질문하기..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={!userInput.trim() || chatLoading}
                className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:bg-slate-200"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({ children, requiredRole }) => {
  const { user, role, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" />;
  }
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" />;
  }
  return <>{children}</>;
};
const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

const AppContent: React.FC = () => {
  const { user, loading, signOut } = useAuth();

  // --- [요구사항] 링크 접속 시(첫 진입) 자동 로그아웃 로직 ---
  useEffect(() => {
    // 로딩 중이거나 이미 체크했다면 중단
    if (loading) return;

    const entryChecked = sessionStorage.getItem('textbookcut_entry_checked');
    if (entryChecked) return;

    const isRoot = window.location.pathname === '/';

    if (isRoot) {
      if (user) {
        console.log('AUTO-LOGOUT 실행: 링크 접속 첫 진입 감지 -> 로그아웃 실행');
        // 로컬 데이터도 확실히 비움
        localStorage.removeItem('user-role');
        localStorage.removeItem('user-nickname');
        signOut();
      }
      // 로그아웃 시도 후(또는 유저가 없더라도) 체크 완료 표시
      sessionStorage.setItem('textbookcut_entry_checked', 'true');
    }
  }, [loading, user, signOut]);

  // 로딩 중에는 빈 화면 표시 (user 상태가 확정될 때까지 대기)
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="text-slate-500 text-sm">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/admin/collect"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminCollect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/config"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminConfig />
            </ProtectedRoute>
          }
        />
      </Routes>

      <footer className="w-full bg-slate-100 py-12 border-t border-slate-200 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm tracking-wide">
            © 2024 AI Visual Textbook Summarizer. Powered by Groq (Llama 4).
            <strong> 2015 개정 교육과정</strong> 완벽 지원.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;