
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Database, Plus, Loader2, Save, AlertCircle, CheckCircle2, FileText, ListOrdered, Book, Sparkles } from 'lucide-react';
import { generateTextbookDraft } from '../services/geminiService';

const AdminCollect: React.FC = () => {
    const { role } = useAuth();
    const navigate = useNavigate();

    // Redirect if not admin
    React.useEffect(() => {
        if (role && role !== 'admin') {
            navigate('/');
        }
    }, [role, navigate]);

    const [publisher, setPublisher] = useState('');
    const [grade, setGrade] = useState('1학년');
    const [subject, setSubject] = useState('');
    const [unitTitle, setUnitTitle] = useState('');
    const [content, setContent] = useState('');

    const [loading, setLoading] = useState(false);
    const [genLoading, setGenLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleAIGenerate = async () => {
        if (!publisher || !subject || !unitTitle) {
            setStatus({ type: 'error', message: '출판사, 과목, 단원 제목을 먼저 입력해 주세요.' });
            return;
        }

        setGenLoading(true);
        setStatus(null);
        try {
            const draft = await generateTextbookDraft(publisher, subject, grade, unitTitle);
            setContent(draft);
            setStatus({ type: 'success', message: 'AI가 본문 초안을 생성했습니다. 내용을 확인하고 필요한 부분을 수정해 주세요.' });
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
            // 1. Get or Create Textbook
            let { data: textbook, error: tError } = await supabase
                .from('textbooks')
                .select('id')
                .eq('publisher', publisher)
                .eq('grade', grade)
                .eq('subject', subject)
                .maybeSingle();

            if (tError) throw tError;

            if (!textbook) {
                const { data: newT, error: nTError } = await supabase
                    .from('textbooks')
                    .insert({ publisher, grade, subject, school_level: '중학교', curriculum: '2015' })
                    .select()
                    .single();
                if (nTError) throw nTError;
                textbook = newT;
            }

            // 2. Get or Create Unit
            let { data: unit, error: uError } = await supabase
                .from('units')
                .select('id')
                .eq('textbook_id', textbook.id)
                .eq('main_unit_name', unitTitle)
                .maybeSingle();

            if (uError) throw uError;

            if (!unit) {
                const { data: newU, error: nUError } = await supabase
                    .from('units')
                    .insert({ textbook_id: textbook.id, main_unit_name: unitTitle })
                    .select()
                    .single();
                if (nUError) throw nUError;
                unit = newU;
            }

            // 3. Insert Content Chunk
            const { error: cError } = await supabase
                .from('content_chunks')
                .insert({
                    unit_id: unit.id,
                    page_number: 1, // Defaulting to 1 as page granularity is removed
                    raw_text: content,
                    is_important: false
                });

            if (cError) throw cError;

            setStatus({ type: 'success', message: '데이터가 성공적으로 저장되었습니다!' });
            setContent('');
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
                        <div className="p-3 bg-red-600 rounded-2xl shadow-lg ring-4 ring-red-50">
                            <Database className="text-white w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">컨텐츠 수집소</h1>
                            <p className="text-slate-500 font-medium">관리자 권한: 교과서 데이터베이스 관리</p>
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
                                            <Book className="w-3 h-3" /> 출판사
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="예: 비상교육"
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-800"
                                            value={publisher}
                                            onChange={(e) => setPublisher(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <FileText className="w-3 h-3" /> 학년
                                        </label>
                                        <select
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-800"
                                            value={grade}
                                            onChange={(e) => setGrade(e.target.value)}
                                        >
                                            <option>1학년</option>
                                            <option>2학년</option>
                                            <option>3학년</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">과목</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="예: 과학, 역사"
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-800"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <ListOrdered className="w-3 h-3" /> 단원 제목
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="예: 1단원 지권의 변화"
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-800"
                                        value={unitTitle}
                                        onChange={(e) => setUnitTitle(e.target.value)}
                                    />
                                </div>


                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">본문 내용</label>
                                        <button
                                            type="button"
                                            onClick={handleAIGenerate}
                                            disabled={genLoading || loading}
                                            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {genLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            AI로 본문 자동 생성 (대단원 기준)
                                        </button>
                                    </div>
                                    <textarea
                                        required
                                        rows={12}
                                        placeholder="AI로 자동 생성하거나 페이지의 원본 텍스트를 입력하세요..."
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium text-slate-700 leading-relaxed"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                    />
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
                                    출판사, 학년, 과목이 일치하는 경우 기존 교과서 데이터에 자동 연결됩니다.
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-white font-black">•</span>
                                    단원명이 다르면 새로운 단원을 생성합니다.
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-white font-black">•</span>
                                    본문 내용은 AI가 분석할 때 핵심 소스가 되므로 정확하게 입력해 주세요.
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
