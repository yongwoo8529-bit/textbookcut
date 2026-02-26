import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Sparkles, Loader2, ArrowRight, GraduationCap, Send,
  MessageCircle, Building2, RotateCcw, CheckCircle2, BadgeCheck, List,
  LogIn, UserPlus, LogOut, Database, User as UserIcon, Book, Settings
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
  const { user, role, signOut } = useAuth();

  if (import.meta.env.DEV) {
    console.log('DEBUG: LandingPage rendered, user:', user ? user.email : 'null');
  }
  return (
    <main className="max-w-4xl w-full px-4 py-20 flex-1 mx-auto text-center animate-in fade-in zoom-in duration-500">
      {user ? (
        <>
          <h2 className="text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
            전략 가이드에 오신 것을 환영합니다!
          </h2>
          <p className="text-slate-500 text-xl max-w-lg mx-auto mb-10 leading-relaxed">
            {role === 'admin' ? '관리자님, 새로운 개념을 수집하거나 기출 데이터를 분석할 수 있습니다.' : '학습 가이드가 준비되는 동안 조금만 기다려주세요.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {role === 'admin' ? (
              <Link to="/admin/collect" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2">
                <Database className="w-5 h-5" />
                데이터 수집소 입장하기
              </Link>
            ) : (
              <div className="bg-slate-100 text-slate-500 px-8 py-4 rounded-2xl text-lg font-bold">
                가이드 준비 중입니다
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-full border border-indigo-100 uppercase tracking-widest">
            Authentication Required
          </div>
          <h2 className="text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
            모의고사 대비를 하기위해<br />로그인이 필요합니다
          </h2>
          <p className="text-slate-500 text-xl max-w-lg mx-auto mb-10 leading-relaxed">
            회원가입 후 AI Tutor와 함께 15개정 교육과정의 핵심을 관통하는 최상의 학습 가이드를 만나보세요.
          </p>
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
        </>
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
  const { user, loading } = useAuth();

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