
import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Sparkles, Loader2, ArrowRight, ExternalLink, GraduationCap, Send, MessageCircle, Building2, RotateCcw, CheckCircle2, Image as ImageIcon, Calendar, BadgeCheck, Globe, List, Hash } from 'lucide-react';
import { getStudyGuide, createStudyChat, checkCompatibility } from './services/geminiService';
import { SearchResult } from './types';
import { Chat } from '@google/genai';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const PUBLISHERS_15 = [
  '미래엔', '비상교육', '동아출판', '천재교육', '지학사', '씨마스'
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

  const [chatSession, setChatSession] = useState<Chat | null>(null);
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
    
    if (!mainUnit.trim() || !selectedPublisher.trim() || !subject.trim()) {
      setError('필수 항목(출판사, 과목, 대단원)을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const isValid = await checkCompatibility(schoolLevel, grade, subject, selectedPublisher);
      
      if (!isValid) {
        setError('출판사에 맞지 않는 과목입니다. 다시 입력해주세요.');
        setLoading(false);
        return;
      }

      const unitInfo = `대단원: ${mainUnit}${subUnit ? `, 소단원: ${subUnit}` : ''}${semester ? ` (${semester})` : ''}`;
      const data = await getStudyGuide(subject, unitInfo, schoolLevel, grade, selectedPublisher);
      setResult(data);
      const chat = createStudyChat(JSON.stringify(data));
      setChatSession(chat);
      setChatMessages([]);
    } catch (err) {
      setError('정보를 불러오는데 실패했습니다. 단원 명칭을 더 정확하게 입력해 보세요.');
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
            <div className="p-2 bg-blue-600 rounded-lg shadow-blue-200 shadow-lg">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">교과서 압축기</h1>
          </div>
          <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 font-bold text-xs">
            <BadgeCheck className="w-3.5 h-3.5" />
            15개정 교육과정
          </div>
        </div>
      </header>

      <main className="max-w-4xl w-full px-4 py-12 flex-1">
        {!result && !loading && (
          <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold text-blue-600 bg-blue-50 rounded-full border border-blue-100 uppercase tracking-widest">
              Visual Learning Experience
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
              그림으로 보는 교과서 압축
            </h2>
            <p className="text-slate-500 text-lg max-w-lg mx-auto">
              AI가 핵심 개념을 정리하고, 이해를 돕는 삽화를 직접 그려줍니다.
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
                      className={`flex-1 py-3 px-3 text-sm font-bold rounded-lg transition-all ${
                        schoolLevel === level ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
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
                      className={`flex-1 py-3 px-2 text-sm font-bold rounded-lg transition-all ${
                        grade === g ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                      } disabled:opacity-70`}
                    >
                      <span>{g}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block ml-1">출판사 (15개정 기준)</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      disabled={loading || !!result}
                      placeholder="출판사 이름을 입력하세요"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black disabled:bg-slate-100 disabled:text-slate-500"
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          selectedPublisher === pub
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
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
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black disabled:bg-slate-100 disabled:text-slate-500"
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
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black disabled:bg-slate-100 disabled:text-slate-500"
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
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black disabled:bg-slate-100 disabled:text-slate-500"
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
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black disabled:bg-slate-100 disabled:text-slate-500"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading || !!result}
                className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-lg ${
                  !!result 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    내용 분석 및 삽화 생성 중...
                  </>
                ) : !!result ? (
                  <>
                    분석이 완료되었습니다
                  </>
                ) : (
                  <>
                    정리 및 그림 생성 시작
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
            <Sparkles className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <p className="text-xl font-bold text-slate-800 uppercase tracking-wide mb-2">교과서 내용을 시각화하고 있습니다</p>
            <p className="text-slate-400 text-sm">잠시만 기다려주세요. 개념을 그림으로 그리고 있습니다.</p>
          </div>
        )}

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-12 pb-20">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 border border-slate-100">
              <div className="mb-8 flex flex-wrap items-center gap-2 text-xs font-bold text-blue-600">
                <div className="bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 flex items-center gap-2">
                  <span>{selectedPublisher}</span>
                  <span className="w-1 h-1 bg-blue-300 rounded-full"></span>
                  <span>{schoolLevel} {grade}</span>
                  <span className="w-1 h-1 bg-blue-300 rounded-full"></span>
                  <span>{subject}</span>
                </div>
                <span className="px-2 py-1 bg-blue-600 text-white rounded font-black">15개정</span>
                <span className="px-2 py-1 bg-slate-800 text-white rounded flex items-center gap-1 font-black">
                  <ImageIcon className="w-3 h-3" /> ILLUSTRATED
                </span>
              </div>

              {result.groundingChunks && result.groundingChunks.length > 0 && (
                <div className="mb-10 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-tight">학습 데이터 출처</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.groundingChunks.map((chunk, idx) => chunk.web && (
                      <a
                        key={idx}
                        href={chunk.web.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm group"
                      >
                        <span className="truncate max-w-[150px] font-medium">{chunk.web.title}</span>
                        <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-20">
                {result.sections.map((section, idx) => (
                  <div key={idx} className="space-y-8 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 150}ms` }}>
                    <div className="relative group">
                      <div className="absolute -left-4 top-0 bottom-0 w-1.5 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      <h3 className={`font-black tracking-tight break-keep ${section.isImportant ? 'text-3xl text-slate-950 underline decoration-blue-500/30' : 'text-2xl text-slate-900'} leading-snug`}>
                        {section.title}
                      </h3>
                    </div>

                    {section.imageUrl ? (
                      <div className="my-10 rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-100 ring-1 ring-slate-200 transition-transform hover:scale-[1.01] duration-500 group">
                        <img 
                          src={section.imageUrl} 
                          alt={section.title} 
                          className="w-full h-auto min-h-[200px] object-cover" 
                        />
                        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-blue-500" />
                            <span>AI가 생성한 개념 이해 삽화</span>
                          </div>
                          <span className="italic">Visual Explanation for better memory</span>
                        </div>
                      </div>
                    ) : (
                      <div className="my-8 aspect-video rounded-3xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-sm font-medium">그림을 불러오는 중...</span>
                      </div>
                    )}

                    <div className="space-y-6">
                      {section.parts.map((sentence, sIdx) => (
                        <p key={sIdx} className="leading-[2.4] break-keep text-lg text-slate-700 font-medium">
                          {sentence.map((part, pIdx) => (
                            <span 
                              key={pIdx} 
                              className={part.isImportant ? 'text-xl font-black text-slate-950 mx-0.5 px-1 rounded bg-blue-50 border-b-2 border-blue-400 shadow-sm' : ''}
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
                      <Sparkles className="w-7 h-7 text-blue-500" /> 핵심 개념 용어집
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {result.keywords.map((kw, i) => (
                        <div key={i} className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-blue-200 group">
                          <span className="font-black text-xl text-blue-700 block mb-3 group-hover:translate-x-1 transition-transform">{kw.word}</span>
                          <span className="text-slate-700 leading-relaxed break-keep font-medium">{kw.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.examPoints.length > 0 && (
                  <div className="pt-16 border-t border-slate-100">
                    <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                      <CheckCircle2 className="w-7 h-7 text-red-500" /> 시험 단골 출제 포인트
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
              <div className="bg-blue-600 px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <MessageCircle className="w-6 h-6" />
                  <h3 className="font-bold text-lg">그림에 대해 더 질문하기</h3>
                </div>
                <div className="text-blue-100 text-xs font-medium">AI Tutor is online</div>
              </div>
              <div className="p-8 h-[500px] overflow-y-auto space-y-6 flex flex-col bg-slate-50/30">
                {chatMessages.length === 0 && (
                  <div className="text-center text-slate-400 my-auto px-10">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    정리된 그림의 세부 사항이나 이해가 안 가는 개념을 물어보세요.<br/>AI 튜터가 친절하게 설명해 드립니다.
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-5 py-4 text-base shadow-sm ${
                      msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
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
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-75"></span>
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-150"></span>
                      </div>
                      답변 생성 중...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-5 bg-white border-t border-slate-100 flex gap-3">
                <input
                  type="text"
                  placeholder="예: 두 번째 그림에서 화살표가 의미하는 게 뭐야?"
                  className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={!userInput.trim() || chatLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-4 rounded-2xl transition-all shadow-lg hover:shadow-blue-200 active:scale-95"
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
            © 2024 AI Visual Textbook Summarizer. Powered by Gemini 3.0. 
            <strong>15개정 교육과정</strong> 완벽 지원.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
