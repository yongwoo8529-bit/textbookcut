import { GoogleGenerativeAI } from "@google/generative-ai";
import { SearchResult, StudySection } from "../types";
import { supabase } from "../lib/supabase";

// --- env sanitize / debug utilities ---
function sanitizeEnvVar(value: unknown) {
  const raw = (typeof value === 'string') ? value : String(value ?? '');
  return raw.replace(/^\uFEFF/, '')
    .replace(/[\r\n]+/g, '')
    .trim();
}
function maskKey(k: string) {
  if (!k) return '<empty>';
  if (k.length <= 8) return '*'.repeat(k.length);
  return `${k.slice(0, 4)}...${k.slice(-4)}`;
}
function findNonLatin1Indices(s: string) {
  const bad: { i: number; cp: number }[] = [];
  for (let i = 0; i < s.length; i++) {
    const cp = s.codePointAt(i) || 0;
    if (cp > 255) bad.push({ i, cp });
  }
  return bad;
}

const RAW_GEMINI = import.meta.env.VITE_GEMINI_API_KEY || '';
const RAW_GROQ = import.meta.env.VITE_GROQ_API_KEY || '';

export const GEMINI_API_KEY = sanitizeEnvVar(RAW_GEMINI);
export const GROQ_API_KEY = sanitizeEnvVar(RAW_GROQ);

if (import.meta.env.DEV) {
  console.log('DEBUG: raw VITE_GROQ_API_KEY length =>', (RAW_GROQ as string)?.length ?? 0, '->', GROQ_API_KEY.length, 'masked:', maskKey(GROQ_API_KEY));
  const badGroq = findNonLatin1Indices(GROQ_API_KEY);
  if (badGroq.length) console.warn('DEBUG: GROQ_API_KEY non-latin1 indices (sample):', badGroq.slice(0, 10));
  console.log('DEBUG: raw VITE_GEMINI_API_KEY length =>', (RAW_GEMINI as string)?.length ?? 0, '->', GEMINI_API_KEY.length, 'masked:', maskKey(GEMINI_API_KEY));
  const badGem = findNonLatin1Indices(GEMINI_API_KEY);
  if (badGem.length) console.warn('DEBUG: GEMINI_API_KEY non-latin1 indices (sample):', badGem.slice(0, 10));
}

// 모델 설정 (TPM 제한을 고려하여 8B 모델 사용 - 70B는 12k 제한으로 대량 데이터 처리 불가)
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_MODEL_CHAMP = "llama-3.3-70b-versatile"; // 성능 중심 작업용 (현재 TPM 제한으로 미사용)

// --- 고1 3월 모의고사 5개년(2021-2025) 트렌드 지식 베이스 ---
const TREND_KNOWLEDGE_2025 = `
[고1 3월 모의고사 과학 5개년(2021-2025) 핵심 트렌드]
1. 물리학: 부력, 탄성력, 역학적 에너지 보존, 열의 이동(비열/열팽창), 빛의 합성 및 굴절, 전기 회로(옴의 법칙).
2. 화학: 물질의 상태 변화, 용해도, 아보가드로 법칙 기초(분자 수), 연분비 일정 법칙, 산-염기 기초.
3. 생명과학: 인체 순환계(심장 구조), 소화계 효소, 호르몬과 항상성, 세포 구조, 식물의 광합성.
4. 지구과학: 빅뱅 우주론, 우주 팽창, 해륙풍, 지구 온난화, 암석과 광물의 순환.

[2021-2025 특이사항]
- 2025: 열전달(비열) 및 인체 순환계 복합 문제 난이도 상승.
- 2024: 아보가드로 법칙 및 소화 효소(라이페이스 등) 비중 확대.
- 2023: 부력과 탄성력 결합 문제 다수 출제.
`;

/**
 * 개념에 대한 분석 초안 생성 (AI 분석 기반)
 */
export const generateConceptDraft = async (subject: string, conceptName: string): Promise<any> => {
  if (!GROQ_API_KEY) throw new Error("API 키가 설정되지 않았습니다.");

  const prompt = `당신은 대한민국 고1 3월 모의고사 전략 분석 전문가입니다.
'${conceptName}'(${subject}) 개념이 고1 3월 모의고사(최근 5개년: 2021-2025)에서 어떻게 다뤄지는지 분석하여 다음 JSON 형식으로 응답하세요.

{
  "description": "중학생도 이해할 수 있는 상세한 개념 설명 (5문장 이상)",
  "importance": "A",
  "formula": "공식이 있다면 수식, 없다면 null",
  "key_terms": "해당 개념과 연관된 핵심 용어 3-4개 (콤마로 구분)",
  "logic": {
    "context": "이 개념이 모의고사 문제에서 어떤 상황(지문, 조건)으로 등장하는지",
    "reasoning": "문제를 풀기 위해 학생이 거쳐야 하는 핵심 사고 과정",
    "type": "옳은_것_고르기"
  },
  "trap": {
    "title": "대표적 함정 명칭",
    "mistake": "학생들이 자주 하는 실수 또는 오개념",
    "correct": "실수를 방지하는 올바른 접근법 및 판단 기준"
  }
}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{
        role: "system",
        content: "당신은 고1 3월 모의고사 5개년 트렌드를 꿰뚫고 있는 초정밀 전략 분석가입니다. 모든 응답은 데이터에 기반해야 합니다."
      }, {
        role: "user",
        content: prompt
      }],
      response_format: { type: "json_object" },
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`AI 분석 실패: ${err.error?.message || 'Unknown'}`);
  }

  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
};


/**
 * 학습 가이드 생성 (Groq API 사용) - RAG (Supabase DB) 기반
 */
export const getStudyGuide = async (
  subject: string,
  range: string,
  schoolLevel: string,
  grade: string,
  publisher: string
): Promise<SearchResult> => {
  const studentLevel = `${schoolLevel} ${grade}`;

  // 1. DB에서 데이터 조회 (RAG)
  let textbookContext = "";
  try {
    if (subject === '국어') {
      // 국어는 직접 입력한 핵심 개념 DB(must_know_core) 사용
      const { data: conceptData, error: conceptError } = await supabase
        .from('must_know_core')
        .select('*')
        .eq('subject', subject)
        .order('title', { ascending: true })
        .limit(60);

      if (conceptError) {
        console.error('Concept data fetch error:', conceptError);
      } else if (conceptData && conceptData.length > 0) {
        // [수정] 프롬프트 내에서 수동으로 카테고리 태깅 (DB에 없으므로)
        const categories: Record<string, string[]> = {
          '시': ['화자', '청자', '시적 상황', '정서', '심상', '운율', '시어의 함축 의미', '상징', '비유', '의인법', '설의법', '반복', '대조', '역설'],
          '형태소': ['형태소', '자립 형태소', '의존 형태소', '어근', '접사', '파생어', '합성어'],
          '품사': ['체언', '명사', '대명사', '수사', '용언', '동사', '형용사', '수식언', '관형사', '부사', '관계언', '조사', '독립언', '감탄사'],
          '문법': ['주어', '서술어', '목적어', '보어', '관형어', '부사어', '독립어'],
          '문장구조': ['홑문장', '겹문장', '이어진 문장', '안은 문장', '능동문 / 피동문', '사동문', '부정문'],
          '음운': ['음절', '자음/모음', '음운 변동', '교체', '탈락', '첨가', '축약']
        };

        let formattedText = `=== [국어] 개념 DB (총 ${conceptData.length}개) ===\n`;
        conceptData.forEach(item => {
          let targetCat = "기타";
          for (const [cat, items] of Object.entries(categories)) {
            if (items.includes(item.title)) {
              targetCat = cat;
              break;
            }
          }
          // [중요] 말줄임표(...)를 프롬프트에서 제거하여 AI가 따라하지 않게 함
          formattedText += `[범주:${targetCat}] 명칭:${item.title} | 단서:${item.description.slice(0, 60)}\n`;
        });
        textbookContext = formattedText;
        console.log(`[RAG] Loaded ${conceptData.length} core concepts with category tagging.`);
      }
    } else {
      // 타 과목은 기존 기출 분석 데이터 사용
      const { data: granularData, error: granularError } = await supabase
        .from('mock_questions')
        .select('*')
        .eq('subject', subject)
        .order('year', { ascending: false })
        .order('question_num', { ascending: true })
        .limit(40);

      if (granularError) {
        console.error('Granular data fetch error:', granularError);
      } else if (granularData && granularData.length > 0) {
        let formattedText = `=== [${subject}] 기출 분석 데이터베이스 ===\n\n`;
        granularData.forEach(item => {
          formattedText += `
[${item.year}년 ${item.question_num}번] ${item.title} (중요도: ${item.importance})
- 해설: ${item.concept_explanation}
- 함정: ${item.trap_logic}
- 팁: ${item.teacher_tip}
---`;
        });
        textbookContext = formattedText;
        console.log(`[RAG] Loaded ${granularData.length} granular question analyses.`);
      }
    }
  } catch (err) {
    console.warn("Data retrieval failed:", err);
  }

  const savedSystemPrompt = typeof window !== 'undefined' ? localStorage.getItem('admin_system_prompt') : null;

  const systemPrompt = savedSystemPrompt || `
        당신은 대한민국 최고의 '국어 학습 개념 체계화 전문가'입니다. 
        
        [핵심 원칙]
        1. **100% 누락 없는 망라**: 전달된 DB 내의 모든(EVERY) 개념을 반드시 해당 범주(Category)에 포함하십시오.
        2. **압축 데이터의 전문적 복원**: 입력의 '단서'가 짧더라도 당신의 국어 전문 지식을 총동원하십시오. 특히 '심상'이나 '비유' 같은 시적 개념을 설명할 때 '내러티브' 같은 소설적 용어를 지양하고, **감각적 이미지, 형상화, 정서 전달** 등 시 문학 고유의 용어를 사용하여 정교하게 설명하십시오.
        3. **완벽한 카테고리 맵핑**: 입력 데이터의 [범주:XXX] 정보를 **절대적으로 준수**하여 개념을 배치하십시오.
        4. **완전한 문장 종결 (NO TRUNCATION)**: 모든 설명은 반드시 **"~입니다.", "~하는 현상입니다."**와 같이 완벽하게 끝맺음하십시오. 절대로 문장 끝에 '...'을 붙이지 마십시오.
        5. **분량 최적화 (Concise)**: 각 개념 설명은 핵심 위주로 **3-4문장**으로 작성하되, 문장은 완전해야 합니다.
    `;

  const userPrompt = `
        다음 국어 개념 데이터를 바탕으로, 모든 개념을 [범주]별로 분류하여 "국어 개념 마스터 총괄 가이드"를 작성하십시오.
        
        [데이터베이스 내용]
        ${textbookContext}

        [작성 지침]
        1. **범주별 그룹화**: [시 / 형태소 / 품사 / 문법 / 문장구조 / 음운] 순서로 대단원을 나누어 구성하십시오.
        2. **데이터 준수**: 각 개념의 [범주] 태그를 확인하여 정확한 위치에 배치하십시오.
        3. **문장 완성**: 모든 설명은 마침표(.)로 끝나는 완전한 문장이어야 합니다. ('...' 사용 절대 금지)
        4. **전체 포함**: 제공된 모든 개념 명칭을 가이드에 포함하십시오.

        반드시 다음 JSON 형식을 유지하십시오:
        {
          "isValid": true,
          "sections": [
            {
              "title": "대단원 명칭 (예: 1. 시 부분 문법 개념)",
              "parts": [
                [
                  { "text": "[개념 제목]", "isImportant": true },
                  { "text": "해당 개념의 학술적이고 상세한 설명 (매우 길게 작성 가능)", "isImportant": false }
                ]
              ]
            }
          ],
          "keywords": [{ "word": "핵심용어", "meaning": "용어의 정의" }],
          "examPoints": ["각 단원별 핵심 판단 기준"],
          "expertTips": ["개념 간의 논리적 연결성 및 심화 팁"],
          "timeManagement": "문법/문학 문항 접근 시 사고의 우선순위",
          "trapAlerts": ["주의해야 할 논리적 함정"]
        }
    `;


  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35초 타임아웃

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 2000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP_${response.status}`);
    }

    const result = await response.json();
    const data = JSON.parse(result.choices[0].message.content || "{}");

    if (!data.isValid) {
      throw new Error("NOT_FOUND");
    }

    return {
      ...data,
      groundingChunks: []
    };
  } catch (error: any) {
    console.error("getStudyGuide Error:", error);
    if (error.message?.includes("429") || error.message?.includes("rate_limit")) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
    if (error.message === "NOT_FOUND") {
      throw new Error("NOT_FOUND");
    }
    // 더 구체적인 에러 메시지 반환 (디버깅용)
    const detailedMsg = error.message || "Unknown error";
    throw new Error(`API_ERROR(${detailedMsg})`);
  }
};

/**
 * 학습 채팅 세션 (Groq API 사용)
 */
export const createStudyChat = (context: string) => {
  const history: { role: string; content: string }[] = [
    {
      role: "system",
      content: `당신은 학생의 질문에 답변하는 학습 도우미입니다. 2022 개정 교육과정(22개정) 지식을 바탕으로 풍부하고 상세하게 답변하세요.인사말은 생략하고 본론만 명확히 답변하세요.Context: ${context} `
    }
  ];

  return {
    sendMessage: async ({ message }: { message: string }) => {
      history.push({ role: "user", content: message });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 채팅은 20초

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: history,
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("GROQ_CHAT_ERROR");
      }

      const result = await response.json();
      const reply = result.choices[0].message.content;
      history.push({ role: "assistant", content: reply });

      return {
        text: reply
      };
    }
  };
};

/**
 * 관리자용: 특정 개념을 가르치고 DB에 저장 (AI 분석 기반)
 */
export const learnAndSaveConcept = async (subject: string, conceptName: string): Promise<void> => {
  const data = await generateConceptDraft(subject, conceptName);

  // 1. must_know_core 저장
  const { data: cRow, error: cErr } = await supabase.from('must_know_core').insert({
    subject,
    title: conceptName,
    description: data.description,
    importance: data.importance,
    formula: data.formula,
    key_terms: data.key_terms,
    education_level: 'middle_3'
  }).select().single();

  if (cErr) throw cErr;

  // 2. appearance_logic 저장
  await supabase.from('appearance_logic').insert({
    concept_id: cRow.id,
    condition_context: data.logic.context,
    reasoning_required: data.logic.reasoning,
    question_type: data.logic.type,
    frequency_weight: 5,
    test_frequency: 10
  });

  // 3. trap 저장
  await supabase.from('exam_trap_points').insert({
    concept_id: cRow.id,
    title: data.trap.title,
    common_mistake: data.trap.mistake,
    correct_concept: data.trap.correct,
    explanation: "AI 전략 전문가가 분석한 함정 포인트입니다.",
    importance: 'A'
  });
};
