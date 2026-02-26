import React, { useState, useEffect } from 'react';
import {
    Settings, Save, RotateCcw, MessageSquare, Bell,
    ShieldCheck, AlertTriangle, Info, Sparkles, BookOpen, Brain, Plus, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { learnAndSaveConcept } from '../services/geminiService';

const AdminConfig: React.FC = () => {
    const { role } = useAuth();
    const [systemPrompt, setSystemPrompt] = useState(
        "당신은 고1 3월 모의고사 최고의 전략 전문가입니다..."
    );
    const [adminNotice, setAdminNotice] = useState(
        "3월 모의고사 대비 집중 기간입니다. 기출 분석을 통해 자신의 약점을 보완하세요!"
    );
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);

    // AI 개념 학습 상태
    const [conceptSubject, setConceptSubject] = useState('국어');
    const [conceptName, setConceptName] = useState('');
    const [isLearning, setIsLearning] = useState(false);
    const [learnError, setLearnError] = useState<string | null>(null);
    const [learnSuccess, setLearnSuccess] = useState(false);

    // 로컬 스토리지에 저장 (실제 운영시에는 DB 연동 필요)
    useEffect(() => {
        const savedPrompt = localStorage.getItem('admin_system_prompt');
        const savedNotice = localStorage.getItem('admin_notice');
        if (savedPrompt) setSystemPrompt(savedPrompt);
        if (savedNotice) setAdminNotice(savedNotice);
    }, []);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            localStorage.setItem('admin_system_prompt', systemPrompt);
            localStorage.setItem('admin_notice', adminNotice);
            setIsSaving(false);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus(null), 3000);
        }, 1000);
    };

    const handleReset = () => {
        if (window.confirm('기본 설정으로 초기화하시겠습니까?')) {
            const defaultPrompt = "당신은 고1 3월 모의고사 최고의 전략 전문가입니다. 당신의 목표는 단순히 개념을 설명하는 것이 아니라, 학생들에게 '어떻게 합격할 것인가'에 대한 통찰력 있는 전략을 제공하는 것입니다.";
            setSystemPrompt(defaultPrompt);
        }
    };

    const handleLearnConcept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!conceptName.trim()) return;

        setIsLearning(true);
        setLearnError(null);
        setLearnSuccess(false);

        try {
            await learnAndSaveConcept(conceptSubject, conceptName);
            setLearnSuccess(true);
            setConceptName('');
            setTimeout(() => setLearnSuccess(false), 3000);
        } catch (err: any) {
            setLearnError(err.message || '학습 중 오류가 발생했습니다.');
        } finally {
            setIsLearning(false);
        }
    };

    if (role !== 'admin') {
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-red-50 text-red-600 p-8 rounded-3xl border border-red-100 text-center max-w-md">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">접근 권한 없음</h2>
                    <p className="text-sm opacity-80">관리자 계정으로 로그인 후 이용해 주세요.</p>
                </div>
            </div>
        );
    }

    return (
        <main className="max-w-4xl w-full px-4 py-12 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                        <Settings className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">관리자 설정</h2>
                        <p className="text-slate-500 text-sm font-medium">서비스 운영 및 AI 프롬프트 제어 센터</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-indigo-600 font-bold text-sm bg-white border border-slate-200 rounded-xl transition-all"
                    >
                        <RotateCcw className="w-4 h-4" />
                        초기화
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                    >
                        {isSaving ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isSaving ? '저장 중...' : '변경사항 저장'}
                    </button>
                </div>
            </div>

            {saveStatus === 'success' && (
                <div className="mb-6 bg-emerald-50 border border-emerald-100 text-emerald-600 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="font-bold text-sm">설정이 안전하게 저장되었습니다.</span>
                </div>
            )}

            <div className="grid gap-8">
                {/* AI 자동 개념 학습기 (Task 6) */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden ring-4 ring-indigo-500/5">
                    <div className="px-8 py-6 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white flex items-center gap-3">
                        <Brain className="w-5 h-5" />
                        <h3 className="font-bold">AI 전략 개념 학습기 (Concept Learner)</h3>
                        <span className="ml-auto px-2.5 py-1 bg-white/20 text-white rounded-lg text-[10px] font-black uppercase">NEW</span>
                    </div>
                    <div className="p-8">
                        <div className="mb-6 flex items-start gap-3 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-xs text-indigo-700 leading-relaxed font-medium">
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>
                                특정 과목의 개념 키워드(예: 운율, Similarity)를 입력하면 AI가 직접 5개년 기출을 분석하여<br />
                                **상세 정의, 출제 포인트, 함정 포인트**를 데이터베이스에 자동으로 등록합니다.
                            </p>
                        </div>

                        <form onSubmit={handleLearnConcept} className="flex flex-col sm:flex-row gap-4">
                            <select
                                value={conceptSubject}
                                onChange={(e) => setConceptSubject(e.target.value)}
                                className="px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-bold"
                            >
                                <option>국어</option>
                                <option>수학</option>
                                <option>영어</option>
                                <option>사회</option>
                                <option>과학</option>
                                <option>한국사</option>
                            </select>
                            <input
                                type="text"
                                value={conceptName}
                                onChange={(e) => setConceptName(e.target.value)}
                                className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                placeholder="학습시킬 개념 입력 (예: 운율, 다항식)"
                            />
                            <button
                                type="submit"
                                disabled={isLearning || !conceptName}
                                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-slate-900 transition-all shadow-lg flex items-center gap-2 justify-center disabled:bg-slate-200 disabled:shadow-none"
                            >
                                {isLearning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                학습 및 저장
                            </button>
                        </form>

                        {learnError && (
                            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100">
                                {learnError}
                            </div>
                        )}
                        {learnSuccess && (
                            <div className="mt-4 p-4 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold border border-emerald-100 animate-bounce">
                                ✨ 개념 학습이 완료되어 DB에 등록되었습니다!
                            </div>
                        )}
                    </div>
                </div>

                {/* AI 프롬프트 설정 */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">
                    <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-800">AI 전략 전문가 프롬프트 제어</h3>
                    </div>
                    <div className="p-8">
                        <div className="mb-4 flex items-start gap-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-xs text-indigo-700 leading-relaxed font-medium">
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>
                                AI가 분석 보고서를 생성할 때 사용하는 페르소나와 핵심 규칙을 설정합니다.
                                이곳을 수정하면 **모든 과목의 전략 가이드 생성 방식**이 즉시 변경됩니다.
                            </p>
                        </div>
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            className="w-full h-64 p-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium leading-relaxed"
                            placeholder="여기에 AI 시스템 프롬프트를 입력하세요..."
                        />
                    </div>
                </div>

                {/* 고정 안내 문구 설정 */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">
                    <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                        <Bell className="w-5 h-5 text-amber-600" />
                        <h3 className="font-bold text-slate-800">전략 가이드 공지사항 (Fixed Tips)</h3>
                    </div>
                    <div className="p-8">
                        <div className="mb-4 text-xs text-slate-400 font-medium">대시보드 상단에 고정으로 노출될 문구를 설정합니다.</div>
                        <input
                            type="text"
                            value={adminNotice}
                            onChange={(e) => setAdminNotice(e.target.value)}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                            placeholder="예: 3월 모의고사 집중 기간! 기출 분석을 통해 자신의 약점을 보완하세요."
                        />
                    </div>
                </div>
            </div>
        </main>
    );
};

export default AdminConfig;
