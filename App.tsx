
import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Sparkles, Loader2, ArrowRight, ExternalLink, GraduationCap, Send, MessageCircle, Building2, RotateCcw, CheckCircle2, Image as ImageIcon, Calendar, BadgeCheck, Globe, List, Hash } from 'lucide-react';
import { getStudyGuide, createStudyChat } from './services/geminiService';
import { SearchResult } from './types';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const PUBLISHERS_LIST = [
  '미래엔', '비상교육', '동아출판', '천재교육', '지학사', '씨마스', '천재교과서', '성림출판', 'YBM'
];

const App: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [mainUnit, setMainUnit] = useState('');
  const [subUnit, setSubUnit] = useState('');
  const [semester, setSemester] = useState('');
  const [schoolLevel, setSchoolLevel] = useState('중학교');
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
    setMainUnit('');
    setSubUnit('');
    setSemester('');
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
    if (!mainUnit.trim()) {
      setError('분석할 대단원(또는 단원 번호)을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const unitInfo = `대단원: ${mainUnit}${subUnit ? `, 소단원: ${subUnit}` : ''}${semester ? ` (${semester})` : ''}`;
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
        // 상세 에러 메시지 표시 (디버깅용)
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      <header className="w-full bg-white border-b border-slate-200 py-6 px-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-indigo-200 shadow-lg">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">교과서 압축기</h1>
          </div>
          <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 font-bold text-xs">
            <BadgeCheck className="w-3.5 h-3.5" />
            22개정 교육과정
          </div>
        </div>
      </header>

      <main className="max-w-4xl w-full px-4 py-12 flex-1">
        {!result && !loading && (
          <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-full border border-indigo-100 uppercase tracking-widest">
              Advanced Analysis Engine
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
              2022 개정 교과서 정밀 압축
            </h2>
            <p className="text-slate-500 text-lg max-w-lg mx-auto">
              AI가 22개정 교육과정의 핵심을 관통하는 방대한 학습 가이드를 생성합니다.
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                  {['중학교', '고등학교'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      disabled={loading || !!result}
                      onClick={() => setSchoolLevel(level)}
                      className={`flex-1 py-3 px-3 text-sm font-bold rounded-lg transition-all ${schoolLevel === level ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                        } disabled:opacity-70`}
                    >
                      <span>{level}</span>
                    </button>
                  ))}
                </div>
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
                  <label className="text-sm font-semibold text-slate-700 block ml-1">출판사 (22개정 기준)</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      disabled={loading || !!result}
                      placeholder="출판사 이름을 입력하세요"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-black disabled:bg-slate-100 disabled:text-slate-500"
                      value={selectedPublisher}
                      onChange={(e) => setSelectedPublisher(e.target.value)}
                    />
                  </div>
                </div>
                {!result && (
                  <div className="flex flex-wrap gap-2">
                    {PUBLISHERS_15.map((pub) => (
                      <button
                        key={pub}
                        type="button"
                        onClick={() => setSelectedPublisher(pub)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${selectedPublisher === pub
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                          }`}
                      >
                        {pub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block ml-1">과목</label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    disabled={loading || !!result}
                    placeholder="예: 역사, 과학"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-black disabled:bg-slate-100 disabled:text-slate-500"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block ml-1">대단원</label>
                <div className="relative">
                  <List className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    required
                    type="text"
                    disabled={loading || !!result}
                    placeholder="예: I. 물질의 구성"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-black disabled:bg-slate-100 disabled:text-slate-500"
                    value={mainUnit}
                    onChange={(e) => setMainUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block ml-1">소단원 (선택)</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    disabled={loading || !!result}
                    placeholder="예: 1. 원소와 원자"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-black disabled:bg-slate-100 disabled:text-slate-500"
                    value={subUnit}
                    onChange={(e) => setSubUnit(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block ml-1">학기 (선택)</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  disabled={loading || !!result}
                  placeholder="예: 1학기"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-black disabled:bg-slate-100 disabled:text-slate-500"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading || !!result}
                className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-lg ${!!result
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-300'
                  }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    광범위 분석 데이터 생성 중...
                  </>
                ) : !!result ? (
                  <>
                    분석이 완료되었습니다
                  </>
                ) : (
                  <>
                    22개정 상세 정리 시작
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {!!result && !loading && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  다른 단원 학습하기
                </button>
              )}
            </div>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-8 border border-red-100 animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-20 animate-pulse">
            <Sparkles className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
            <p className="text-xl font-bold text-slate-800 uppercase tracking-wide mb-2">22개정 교육과정 데이터를 분석 중입니다</p>
            <p className="text-slate-400 text-sm">심화 개념까지 포함된 광범위한 리포트를 생성하고 있습니다.</p>
          </div>
        )}

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-12 pb-20">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 border border-slate-100">
              <div className="mb-8 flex flex-wrap items-center gap-2 text-xs font-bold text-indigo-600">
                <div className="bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 flex items-center gap-2">
                  <span>{selectedPublisher}</span>
                  <span className="w-1 h-1 bg-indigo-300 rounded-full"></span>
                  <span>{schoolLevel} {grade}</span>
                  <span className="w-1 h-1 bg-indigo-300 rounded-full"></span>
                  <span>{subject}</span>
                </div>
                <span className="px-2 py-1 bg-indigo-600 text-white rounded font-black">22개정</span>
                <span className="px-2 py-1 bg-slate-800 text-white rounded flex items-center gap-1 font-black">
                  FULL ANALYSIS
                </span>
              </div>

              <div className="space-y-20">
                {result.sections.map((section, idx) => (
                  <div key={idx} className="space-y-8 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 150}ms` }}>
                    <div className="relative group">
                      <div className="absolute -left-4 top-0 bottom-0 w-1.5 bg-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      <h3 className={`font-black tracking-tight break-keep ${section.isImportant ? 'text-3xl text-slate-950 underline decoration-indigo-500/30' : 'text-2xl text-slate-900'} leading-snug`}>
                        {section.title}
                      </h3>
                    </div>

                    <div className="space-y-6">
                      {section.parts.map((sentence, sIdx) => (
                        <p key={sIdx} className="leading-[2.4] break-keep text-lg text-slate-700 font-medium">
                          {sentence.map((part, pIdx) => (
                            <span
                              key={pIdx}
                              className={part.isImportant ? 'text-xl font-black text-slate-950 mx-0.5 px-1 rounded bg-indigo-50 border-b-2 border-indigo-400 shadow-sm' : ''}
                            >
                              {part.text}
                            </span>
                          ))}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}

                {result.keywords.length > 0 && (
                  <div className="pt-16 border-t border-slate-100">
                    <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                      <Sparkles className="w-7 h-7 text-indigo-500" /> 핵심 개념 심층 해설
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {result.keywords.map((kw, i) => (
                        <div key={i} className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-indigo-200 group">
                          <span className="font-black text-xl text-indigo-700 block mb-3 group-hover:translate-x-1 transition-transform">{kw.word}</span>
                          <span className="text-slate-700 leading-relaxed break-keep font-medium">{kw.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.examPoints.length > 0 && (
                  <div className="pt-16 border-t border-slate-100">
                    <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                      <CheckCircle2 className="w-7 h-7 text-red-500" /> 22개정 출제 분석 리포트
                    </h3>
                    <div className="bg-red-50/50 rounded-3xl p-8 border border-red-100">
                      <ul className="space-y-6">
                        {result.examPoints.map((point, i) => (
                          <li key={i} className="flex gap-4 text-xl font-bold text-slate-900 break-keep leading-relaxed">
                            <span className="text-red-500 font-black text-2xl">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="bg-indigo-600 px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <MessageCircle className="w-6 h-6" />
                  <h3 className="font-bold text-lg">상세 내용 질문하기</h3>
                </div>
                <div className="text-indigo-100 text-xs font-medium">22개정 전용 AI Tutor</div>
              </div>
              <div className="p-8 h-[500px] overflow-y-auto space-y-6 flex flex-col bg-slate-50/30">
                {chatMessages.length === 0 && (
                  <div className="text-center text-slate-400 my-auto px-10">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    새로운 교육과정의 복잡한 개념이나 궁금한 점을 물어보세요.<br />상세하고 폭넓은 지식을 바탕으로 답변해 드립니다.
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-5 py-4 text-base shadow-sm ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none whitespace-pre-wrap leading-relaxed'
                      }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 text-slate-400 rounded-2xl px-5 py-4 text-base flex items-center gap-3 shadow-sm animate-pulse">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-75"></span>
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-150"></span>
                      </div>
                      심층 분석 중...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-5 bg-white border-t border-slate-100 flex gap-3">
                <input
                  type="text"
                  placeholder="예: 실린더 내부의 압력과 부피 관계에 대해 더 자세히 알려줘"
                  className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-base"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={!userInput.trim() || chatLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white p-4 rounded-2xl transition-all shadow-lg hover:shadow-indigo-200 active:scale-95"
                >
                  <Send className="w-6 h-6" />
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full bg-slate-100 py-12 border-t border-slate-200 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm tracking-wide">
            © 2024 AI Visual Textbook Summarizer. Powered by Groq (Llama 4).
            <strong>2022 개정 교육과정</strong> 완벽 지원.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
