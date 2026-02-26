
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Database, Plus, Loader2, Save, AlertCircle, CheckCircle2, FileText, ListOrdered, Book, Sparkles, RefreshCw, Settings } from 'lucide-react';
import { generateConceptDraft } from '../services/geminiService';

const AdminCollect: React.FC = () => {
    const { role } = useAuth();
    const navigate = useNavigate();

    // Redirect if not admin
    React.useEffect(() => {
        if (role && role !== 'admin') {
            navigate('/');
        }
    }, [role, navigate]);

    const [subject, setSubject] = useState('국어');
    const [conceptName, setConceptName] = useState('');
    const [importance, setImportance] = useState('A');
    const [description, setDescription] = useState('');
    const [formula, setFormula] = useState('');
    const [keyTerms, setKeyTerms] = useState('');

    const [logicContext, setLogicContext] = useState('');
    const [logicReasoning, setLogicReasoning] = useState('');
    const [logicType, setLogicType] = useState('옳은_것_고르기');

    const [trapTitle, setTrapTitle] = useState('');
    const [trapMistake, setTrapMistake] = useState('');
    const [trapCorrect, setTrapCorrect] = useState('');

    const [loading, setLoading] = useState(false);
    const [genLoading, setGenLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleAIGenerate = async () => {
        if (!conceptName) {
            setStatus({ type: 'error', message: '개념 이름을 먼저 입력해 주세요.' });
            return;
        }

        setGenLoading(true);
        setStatus(null);
        try {
            const data = await generateConceptDraft(subject, conceptName);
            setDescription(data.description);
            setImportance(data.importance);
            setFormula(data.formula || '');
            setKeyTerms(data.key_terms || '');
            setLogicContext(data.logic.context);
            setLogicReasoning(data.logic.reasoning);
            setLogicType(data.logic.type);
            setTrapTitle(data.trap.title);
            setTrapMistake(data.trap.mistake);
            setTrapCorrect(data.trap.correct);
            setStatus({ type: 'success', message: 'AI가 필드 내용을 생성했습니다. 내용을 확인하고 수정해 주세요.' });
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message });
        } finally {
            setGenLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            // 1. must_know_core 저장
            const { data: conceptRow, error: cErr } = await supabase.from('must_know_core').insert({
                subject,
                title: conceptName,
                description,
                importance,
                formula: formula || null,
                key_terms: keyTerms || null,
                education_level: 'middle_3'
            }).select().single();

            if (cErr) throw cErr;

            // 2. appearance_logic 저장
            const { error: lErr } = await supabase.from('appearance_logic').insert({
                concept_id: conceptRow.id,
                condition_context: logicContext,
                reasoning_required: logicReasoning,
                question_type: logicType,
                frequency_weight: 5,
                test_frequency: 10
            });

            if (lErr) throw lErr;

            // 3. exam_trap_points 저장
            const { error: tErr } = await supabase.from('exam_trap_points').insert({
                concept_id: conceptRow.id,
                title: trapTitle,
                common_mistake: trapMistake,
                correct_concept: trapCorrect,
                explanation: "관리자가 직접 수집한 함정 포인트입니다.",
                importance: 'A'
            });

            if (tErr) throw tErr;

            setStatus({ type: 'success', message: '데이터가 성공적으로 저장되었습니다!' });
            setConceptName('');
            setDescription('');
            setFormula('');
            setKeyTerms('');
            setLogicContext('');
            setLogicReasoning('');
            setTrapTitle('');
            setTrapMistake('');
            setTrapCorrect('');
        } catch (err: any) {
            console.error(err);
            setStatus({ type: 'error', message: err.message || '저장 중 오류가 발생했습니다.' });
        } finally {
            setLoading(false);
        }
    };

    if (role !== 'admin') return null;

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <header className="mb-12 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg ring-4 ring-indigo-50">
                            <Sparkles className="text-white w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">개념 수집소</h1>
                            <p className="text-slate-500 font-medium">관리자 권한: 5개년 기출 개념 데이터베이스 관리</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-white">
                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <Book className="w-3 h-3" /> 과목
                                        </label>
                                        <select
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-800"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                        >
                                            <option>국어</option>
                                            <option>수학</option>
                                            <option>영어</option>
                                            <option>사회</option>
                                            <option>과학</option>
                                            <option>한국사</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <FileText className="w-3 h-3" /> 중요도
                                        </label>
                                        <select
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-800"
                                            value={importance}
                                            onChange={(e) => setImportance(e.target.value)}
                                        >
                                            <option>A</option>
                                            <option>B</option>
                                            <option>C</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Plus className="w-3 h-3" /> 개념 이름
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            required
                                            placeholder="예: 운율, 이차함수"
                                            className="flex-1 px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-800"
                                            value={conceptName}
                                            onChange={(e) => setConceptName(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAIGenerate}
                                            disabled={genLoading || loading}
                                            className="px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all flex items-center gap-2 disabled:bg-slate-300"
                                        >
                                            {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            AI 생성
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">상세 설명</label>
                                    <textarea
                                        required
                                        rows={6}
                                        placeholder="개념의 핵심 내용을 설명해 주세요..."
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium text-slate-700 leading-relaxed"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">공식 (선택)</label>
                                        <input
                                            type="text"
                                            placeholder="예: y = ax^2 + bx + c"
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold"
                                            value={formula}
                                            onChange={(e) => setFormula(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">핵심 용어</label>
                                        <input
                                            type="text"
                                            placeholder="예: 꼭짓점, 축의 방정식"
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold"
                                            value={keyTerms}
                                            onChange={(e) => setKeyTerms(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-6 space-y-6">
                                    <h2 className="text-sm font-black text-indigo-600 flex items-center gap-2">
                                        <Settings className="w-4 h-4" /> 출제 로직 (Appearance Logic)
                                    </h2>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">문제 형식</label>
                                            <select
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold"
                                                value={logicType}
                                                onChange={(e) => setLogicType(e.target.value)}
                                            >
                                                <option>옳은_것_고르기</option>
                                                <option>틀린_것_고르기</option>
                                                <option>빈_칸_채우기</option>
                                                <option>숫자_계산</option>
                                                <option>표_해석</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">출제 상황</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="예: 지문의 마지막 문단에서"
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold"
                                                value={logicContext}
                                                onChange={(e) => setLogicContext(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">필요 사고 과정 (Reasoning)</label>
                                        <textarea
                                            required
                                            rows={3}
                                            placeholder="문제를 풀기 위해 학생이 거쳐야 하는 논리 단계를 적어주세요..."
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium text-slate-700"
                                            value={logicReasoning}
                                            onChange={(e) => setLogicReasoning(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-6 space-y-6">
                                    <h2 className="text-sm font-black text-rose-600 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> 빈출 함정 (Exam Traps)
                                    </h2>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">함정 명칭</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="예: 닮음비와 넓이비의 혼동"
                                            className="w-full px-5 py-4 bg-rose-50 border-2 border-rose-100 rounded-2xl focus:border-rose-400 focus:bg-white outline-none transition-all font-bold"
                                            value={trapTitle}
                                            onChange={(e) => setTrapTitle(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">자주 하는 실수</label>
                                            <textarea
                                                required
                                                rows={3}
                                                placeholder="학생들이 흔히 착각하는 내용..."
                                                className="w-full px-5 py-4 bg-rose-50 border-2 border-rose-100 rounded-2xl focus:border-rose-400 focus:bg-white outline-none transition-all font-medium"
                                                value={trapMistake}
                                                onChange={(e) => setTrapMistake(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">올바른 판단 기준</label>
                                            <textarea
                                                required
                                                rows={3}
                                                placeholder="실수를 피하기 위한 핵심 포인트..."
                                                className="w-full px-5 py-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl focus:border-emerald-400 focus:bg-white outline-none transition-all font-medium"
                                                value={trapCorrect}
                                                onChange={(e) => setTrapCorrect(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {status && (
                                    <div className={`p-5 rounded-2xl flex items-center gap-3 border-2 ${status.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
                                        }`}>
                                        {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                                        <span className="font-bold">{status.message}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-2xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 text-lg active:scale-[0.98] disabled:bg-slate-300"
                                >
                                    {loading ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-6 h-6" />
                                            데이터베이스에 저장하기
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200">
                            <h2 className="text-xl font-black mb-4">데이터 관리 규칙</h2>
                            <ul className="space-y-4 text-indigo-100 text-sm font-medium leading-relaxed">
                                <li className="flex gap-2">
                                    <span className="text-white font-black">•</span>
                                    개념 데이터는 중학교 3개학년 전체를 대상으로 수집합니다.
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-white font-black">•</span>
                                    출제 로직은 5개년 기출 경향을 반영하여 AI가 초안을 잡습니다.
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-white font-black">•</span>
                                    함정 포인트는 실제 학생들이 가장 많이 실수하는 내용을 위주로 입력해 주세요.
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white rounded-3xl p-8 border border-slate-200">
                            <h2 className="text-lg font-black text-slate-900 mb-4">수집 팁</h2>
                            <p className="text-slate-500 text-sm leading-relaxed mb-4">
                                페이지 번호를 입력하면 나중에 어느 페이지에서 발췌된 내용인지 사용자에게 알려줄 수 있습니다.
                            </p>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 mb-2">자동 진행</p>
                                <p className="text-xs text-slate-600">저장 버튼을 누르면 본문이 비워지고 페이지 번호가 자동으로 +1 됩니다.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminCollect;
