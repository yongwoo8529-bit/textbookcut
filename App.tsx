
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import {
  BookOpen, Sparkles, Loader2, ArrowRight, GraduationCap, Send,
  MessageCircle, Building2, RotateCcw, CheckCircle2, BadgeCheck, List,
  LogIn, UserPlus, LogOut, Database, User as UserIcon
} from 'lucide-react';
import { getStudyGuide, createStudyChat } from './services/geminiService';
import { SearchResult } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminCollect from './pages/AdminCollect';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const PUBLISHERS_LIST = [
  '미래엔', '비상교육', '동아출판', '천재교육', '지학사', '씨마스', '천재교과서', '성림출판', 'YBM'
];

// --- Components ---

const Navbar: React.FC = () => {
  const { user, role, signOut } = useAuth();

  return (
    <header className="w-full bg-white border-b border-slate-200 py-4 px-4 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-indigo-200 shadow-lg">
            <GraduationCap className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">3모 교과서 압축기</h1>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {role === 'admin' && (
                <Link to="/admin/collect" className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 font-bold text-xs hover:bg-red-100 transition-colors">
                  <Database className="w-3.5 h-3.5" />
                  관리자 수집
                </Link>
              )}
              <Link to="/dashboard" className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors md:hidden">
                <Sparkles className="w-3.5 h-3.5" />
                연구소
              </Link>
              <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl font-bold text-xs">
                <UserIcon className="w-3.5 h-3.5" />
                {user.email?.split('@')[0]}
                {/* 디버깅용: 현재 권한 표시 */}
                <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                  {role || 'none'}
                </span>
              </div>
              <button
                onClick={() => {
                  // 강력 초기화 로그아웃
                  localStorage.clear();
                  signOut();
                }}
                className="text-slate-500 hover:text-red-600 p-2 transition-colors flex flex-col items-center gap-0.5"
                title="로그아웃 & 초기화"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-[9px]">RESET</span>
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
  const { user } = useAuth();

  return (
    <main className="max-w-4xl w-full px-4 py-20 flex-1 mx-auto text-center animate-in fade-in zoom-in duration-500">
      <div className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-full border border-indigo-100 uppercase tracking-widest">
        Authentication Required
      </div>
      <h2 className="text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
        교과서 정밀 압축을 위해<br />로그인이 필요합니다
      </h2>
      <p className="text-slate-500 text-xl max-w-lg mx-auto mb-10 leading-relaxed">
        회원가입 후 AI Tutor와 함께 15개정 교육과정의 핵심을 관통하는 최상의 학습 가이드를 만나보세요.
      </p>

      {user ? (
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/dashboard" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI 연구소 입장하기
          </Link>
        </div>
      ) : (
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
      )}
    </main>
  );
};

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [subject, setSubject] = useState('');
  const [studyRange, setStudyRange] = useState('');
  const [schoolLevel] = useState('중학교');
  const [grade, setGrade] = useState('1학년');
  const [selectedPublisher, setSelectedPublisher] = useState('');
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
    setSubject('');
    setStudyRange('');
    setSelectedPublisher('');
    setResult(null);
    setError(null);
    setChatMessages([]);
    setChatSession(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (result) return;

    if (!selectedPublisher.trim()) {
      setError('출판사를 선택하거나 직접 입력해주세요.');
      return;
    }
    if (!subject.trim()) {
      setError('과목명을 입력해주세요.');
      return;
    }
    if (!studyRange.trim()) {
      setError('분석할 학습 범위를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const unitInfo = studyRange.trim();
      const data = await getStudyGuide(subject, unitInfo, schoolLevel, grade, selectedPublisher);
      setResult(data);
      const chat = createStudyChat(JSON.stringify(data));
      setChatSession(chat);
      setChatMessages([]);
    } catch (err: any) {
      console.error("Submit Error:", err);
      if (err.message === 'RATE_LIMIT_EXCEEDED') {
        setError('현재 서비스 이용자가 많아 API 할당량이 일시적으로 소모되었습니다. 약 1분 후 다시 시도해 주세요.');
      } else if (err.message === 'NOT_FOUND') {
        setError('입력하신 정보에 해당하는 교과서를 찾을 수 없습니다. 출판사와 과목명을 다시 확인해 주세요.');
      } else {
        setError(`정보를 불러오는데 실패했습니다: ${err.message || '알 수 없는 오류'}`);
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

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // Dashboard는 ProtectedRoute여야 하므로 user가 없으면 리다이렉트 (안전장치)
  if (!user) {
    return <Navigate to="/" />;
  }

  return (
    <main className="max-w-4xl w-full px-4 py-12 flex-1 mx-auto">
      {!result && !loading && (
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-full border border-indigo-100 uppercase tracking-widest">
            Advanced Analysis Engine
          </div>
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
            3모 대비 교과서 정밀 압축
          </h2>
          <p className="text-slate-500 text-lg max-w-lg mx-auto">
            AI가 15개정 교육과정의 핵심을 관통하는 방대한 학습 가이드를 생성합니다.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner gap-1">
              {['1학년', '2학년', '3학년'].map((g) => (
                <button
                  key={g}
                  type="button"
                  disabled={loading || !!result}
                  onClick={() => setGrade(g)}
                  className={`flex-1 py-3 px-2 text-sm font-bold rounded-lg transition-all ${grade === g ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                    } disabled:opacity-70`}
                >
                  <span>{g}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Book className="w-4 h-4 text-indigo-500" />
                출판사 선택
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PUBLISHERS_LIST.map((pub) => (
                  <button
                    key={pub}
                    type="button"
                    disabled={loading || !!result}
                    onClick={() => setSelectedPublisher(pub)}
                    className={`text-xs py-2 px-1 rounded-lg border transition-all ${selectedPublisher === pub
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {pub}
                  </button>
                ))}
              </div>
              <input
                type="text"
                disabled={loading || !!result}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm mt-2"
                placeholder="목록에 없다면 직접 입력하세요"
                value={selectedPublisher}
                onChange={(e) => setSelectedPublisher(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                과목명
              </label>
              <input
                type="text"
                required
                disabled={loading || !!result}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="예: 통합과학, 사회 1"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <List className="w-4 h-4 text-indigo-500" />
                학습 범위 (대단원)
              </label>
              <input
                type="text"
                required
                disabled={loading || !!result}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="예: 2. 물질의 규칙성과 결합"
                value={studyRange}
                onChange={(e) => setStudyRange(e.target.value)}
              />
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
                  <span>AI 분석 중... (약 15초 소요)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>AI 핵심 요약 생성하기</span>
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
                <h3 className="text-xl font-bold text-white">AI 핵심 요약 가이드</h3>
              </div>
              <span className="bg-indigo-500/50 text-indigo-50 px-3 py-1 rounded-full text-xs font-medium border border-indigo-400/30">
                Llama 3 70B Powered
              </span>
            </div>

            <div className="p-8 prose prose-slate max-w-none prose-headings:text-indigo-900 prose-a:text-indigo-600">
              <div dangerouslySetInnerHTML={{ __html: result.summary }} />
            </div>
          </div>

          {/* Chat Interface */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-slate-800">AI 튜터와의 대화</h3>
                <p className="text-xs text-slate-500">생성된 요약 내용을 바탕으로 질문해보세요</p>
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
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <Navbar />

          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
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
          </Routes>

          <footer className="w-full bg-slate-100 py-12 border-t border-slate-200 mt-auto">
            <div className="max-w-4xl mx-auto px-4 text-center">
              <p className="text-slate-400 text-sm tracking-wide">
                © 2024 AI Visual Textbook Summarizer. Powered by Groq (Llama 4).
                <strong>2015 개정 교육과정</strong> 완벽 지원.
              </p>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
