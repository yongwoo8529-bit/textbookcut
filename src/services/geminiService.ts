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
 * 교과서 본문 초안 자동 생성 (Groq API 사용 - Llama 모델)
 */
export const generateTextbookDraft = async (
  publisher: string,
  subject: string,
  grade: string,
  unitTitle: string
): Promise<string> => {
  if (!GROQ_API_KEY) {
    throw new Error("API 키가 설정되지 않았습니다. Vercel 환경변수에 VITE_GROQ_API_KEY를 등록해 주세요.");
  }

  const prompt = `당신은 대한민국 2015 개정 교육과정 전문 집필가입니다.
다음 정보를 바탕으로 실제 교과서 대단원 전체를 아우르는 풍부하고 상세한 본문 텍스트를 작성해 주세요.

[정보]
- 출판사: ${publisher}
- 과목: ${subject}
- 학년: ${grade}
- 대단원: ${unitTitle}

[지침]
1. 해당 대단원에 포함된 모든 핵심 개념, 실험, 원리를 빠짐없이 매우 상세하게 서술하십시오.
2. 중학생이 이해하기 쉬우면서도 학술적으로 정확한 교과서 특유의 문체를 유지하십시오.
3. 소단원별로 제목을 붙이고 내용을 전개하십시오.
4. 중요한 용어나 정의는 강조하여 기술하십시오.
5. 마치 실제 ${publisher} 교과서의 해당 단원을 그대로 옮겨놓은 듯한 퀄리티로 작성하십시오.

본문 텍스트만 출력하십시오. (부연 설명 제외)`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "당신은 대한민국 2015 개정 교육과정 교과서 전문 집필가입니다. 정확하고 풍부한 교과서 본문을 작성합니다." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 8000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMsg = errorData?.error?.message || JSON.stringify(errorData);
      console.error("Groq Draft API Error:", errorMsg);
      throw new Error(`AI 생성 오류: ${errorMsg}`);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("AI가 빈 응답을 반환했습니다. 다시 시도해 주세요.");
    }

    return text;
  } catch (error: any) {
    console.error("Draft Generation Error:", error);
    if (error.message?.startsWith("AI") || error.message?.startsWith("API")) {
      throw error;
    }
    throw new Error(`AI 생성 실패: ${error.message}`);
  }
};

/**
 * 추가 내용을 보충 생성 (Groq API) - 기존 본문은 유지하고 추가 부분만 생성
 */
export const refineTextbookDraft = async (
  existingContent: string,
  additionalNotes: string
): Promise<string> => {
  if (!GROQ_API_KEY) {
    throw new Error("API 키가 설정되지 않았습니다.");
  }

  // 기존 본문의 마지막 500자만 참고용으로 전달 (API 부하 최소화)
  const contextSnippet = existingContent.length > 500
    ? '...' + existingContent.slice(-500)
    : existingContent;

  const prompt = `교과서 본문의 끝 부분 맥락:
"""
${contextSnippet}
"""

관리자 요청: ${additionalNotes}

위 맥락에 이어서, 관리자가 요청한 내용을 교과서 본문 스타일로 상세하게 작성하십시오.
- 기존 본문과 문체를 통일하십시오.
- 요청된 내용만 집중적으로 서술하십시오.
- 불필요한 서론이나 반복 없이 바로 본론을 작성하십시오.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "당신은 교과서 편집 전문가입니다. 요청된 보충 내용을 교과서 문체로 작성합니다." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`AI 보충 오류: ${errorData?.error?.message || 'Unknown'}`);
    }

    const result = await response.json();
    const supplementalText = result.choices?.[0]?.message?.content;

    if (!supplementalText) {
      throw new Error("AI가 빈 응답을 반환했습니다. 다시 시도해 주세요.");
    }

    // 기존 본문 + 보충 내용 합치기
    return existingContent.trimEnd() + '\n\n' + supplementalText.trim();
  } catch (error: any) {
    console.error("Refine Error:", error);
    if (error.message?.startsWith("AI")) throw error;
    throw new Error(`AI 보충 실패: ${error.message}`);
  }
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

  // 1. DB에서 과목/단원의 핵심 개념 조회 (RAG - appearance_logic 기반)
  let textbookContext = "";
  try {
    // must_know_core + appearance_logic 조인 쿼리
    let query = supabase
      .from('must_know_core')
      .select(`
        id, title, description, importance, education_level, formula, key_terms, subject,
        appearance_logic(
          condition_context, reasoning_required, question_type, frequency_weight, test_frequency
        )
      `)
      .in('education_level', ['middle_1', 'middle_2', 'middle_3']);

    // 과목별 그룹 필터링
    if (subject === '과학' || subject === '과학탐구' || subject.includes('과학')) {
      query = query.in('subject', ['물리', '화학', '생물', '생명과학', '지구과학', '과학']);
    } else {
      query = query.eq('subject', subject);
    }

    const { data: allConcepts, error: conceptError } = await query.order('importance', { ascending: false });

    // 데이터 샘플링 최적화: TPM 제한(6000)을 맞추기 위해 엄격한 샘플링
    let concepts = allConcepts || [];
    if (subject.includes('과학')) {
      // 영역별 중요도 순 TOP 4 (총 16-20개 내외)
      const areas = ['물리', '화학', '생명과학', '지구과학'];
      const sampled: any[] = [];
      areas.forEach(area => {
        const areaItems = concepts.filter(c => c.subject === area || area.includes(c.subject || ''))
          .sort((a, b) => (b.appearance_logic?.[0]?.frequency_weight || 0) - (a.appearance_logic?.[0]?.frequency_weight || 0))
          .slice(0, 4);
        sampled.push(...areaItems);
      });
      concepts = sampled;
    } else {
      // 일반 과목은 중요도 순 TOP 12
      concepts = concepts.slice(0, 12);
    }

    // exam_trap_points 조회
    const { data: trapPoints, error: trapError } = await supabase
      .from('exam_trap_points')
      .select('id, concept_id, title, correct_concept, common_mistake, explanation')
      .in('concept_id', concepts?.map(c => c.id) || []);

    // graph_patterns 조회
    const { data: graphPatterns, error: graphError } = await supabase
      .from('graph_patterns')
      .select('id, concept_id, pattern_name, axis_explanation, interpretation_key, question_type, frequency')
      .in('concept_id', concepts?.map(c => c.id) || []);

    // calculation_focus 조회
    const { data: calculations, error: calcError } = await supabase
      .from('calculation_focus')
      .select('id, concept_id, formula, calculation_steps, common_calculation_errors, unit_considerations')
      .in('concept_id', concepts?.map(c => c.id) || []);

    if (conceptError) {
      console.error('개념 조회 오류:', conceptError);
    } else if (concepts && concepts.length > 0) {
      // 텍스트 형식으로 포맷팅
      let formattedText = '=== 핵심 개념 (appearance_logic 메타데이터 포함) ===\n\n';

      // frequency_weight별로 정렬
      const sortedConcepts = concepts.sort((a, b) => {
        const aWeight = a.appearance_logic?.[0]?.frequency_weight || 0;
        const bWeight = b.appearance_logic?.[0]?.frequency_weight || 0;
        if (bWeight !== aWeight) return bWeight - aWeight;
        return (b.importance?.charCodeAt(0) || 0) - (a.importance?.charCodeAt(0) || 0);
      });

      sortedConcepts.forEach((concept) => {
        const appLogic = concept.appearance_logic?.[0];
        formattedText += `
[${concept.importance}] ${concept.title}(${concept.subject})
- 설명: ${concept.description?.substring(0, 100)}
${concept.formula ? `- 공식: ${concept.formula}` : ''}
${appLogic ? `- 빈도: ${appLogic.frequency_weight}, 상황: ${appLogic.condition_context}` : ''}
---`;
      });

      formattedText += '\n\n=== 함정/그래프/계산 ===\n\n';
      trapPoints?.slice(0, 10).forEach((trap) => {
        formattedText += `[함정] ${trap.title}: ${trap.common_mistake}\n`;
      });

      graphPatterns?.slice(0, 8).forEach((graph) => {
        formattedText += `[그래프] ${graph.pattern_name}: ${graph.interpretation_key}\n`;
      });

      calculations?.slice(0, 8).forEach((calc) => {
        formattedText += `[계산] ${calc.formula}: ${calc.calculation_steps}\n`;
      });

      textbookContext = formattedText;
      console.log(`최적화된 데이터: 개념 ${concepts.length}개 로드 (TPM 제한 준수)`);
      console.log(`DB에서 ${concepts.length}개의 개념, ${trapPoints?.length || 0}개의 함정, ${graphPatterns?.length || 0}개의 그래프, ${calculations?.length || 0}개의 계산 데이터를 로드했습니다.`);
    } else {
      console.warn("DB에서 과목/교육 수준에 맞는 개념을 찾을 수 없습니다.");
    }
  } catch (err) {
    console.warn("DB 개념 조회 실패:", err);
  }

  const isScience = subject.includes('과학');
  const systemPrompt = `
    당신은 고1 3월 모의고사 ${subject} 영역 학습 자료 작성 전문가입니다.
    다음 규칙을 엄격히 준수하여 JSON 형태로만 응답하십시오.

    [핵심 규칙]
    1. **영역별 4대 분류**: ${isScience ? '1. 물리, 2. 화학, 3. 생명과학, 4. 지구과학' : '교육과정에 맞춘 논리적 1, 2, 3, 4 영역'}으로 정리하십시오.
    2. **출력 형식**: 2021-2025 기출 트렌드를 반영하여 상세히 서술하되, 요약이 아닌 '상세 강의' 형태로 작성하십시오.
    3. **과목별 특화**:
       - 국어: 문법/어휘/용어 뜻풀이(예: 체언 등) 중심. 예문 필수.
       - 수학/과학: 원리 및 풀이 과정 상세 서술.
       - 한국사: 시대순 배치 필수.
       - 사회: 기출 질문 형식 포함.
    4. **응답**: 한국어로 JSON 형태만 출력.
  `;

  const userPrompt = `
    ============================================================================
  [고1 3월 전국연합 모의고사 ${subject} 영역 학습 자료 작성 요청]
    ============================================================================

  [학력 / 과목 / 범위]
    - 학년: ${studentLevel}
  - 과목: ${subject}
  - 범위: ${range}

  [작성 기준]
  1. ** 5개년(2021 - 2025) 트렌드 우선 **: DB 데이터 중 5개년 기출 트렌드와 일치하는 항목은 반드시 "🔥 자주 출제되는 유형" 또는 "5개년 최다 빈출"로 강조하십시오.
    2. ** DB 데이터만 사용 **: 하단의 데이터베이스 조회 결과만 포함하십시오.
    3. ** education_level 필터 **: 중학교 범위(middle_1, middle_2, middle_3)의 개념만 선택하십시오.
    4. ** 추측 금지 **: DB에 없는 개념은 절대 추가하지 마십시오.
    
    ============================================================================
  [appearance_logic 처리 규칙 - 매우 중요]
    ============================================================================
    
    다음 규칙을 정확히 따라 frequency_weight별로 구성하십시오:
    
    🔥 frequency_weight = 5(거의 항상 출제)
    → "자주 출제되는 유형" 섹션에 가장 먼저 배치
    → 제목, 출제 상황(condition_context), 학생 판단(reasoning_required), 문제 형식(question_type) 모두 설명
    → 상세한 설명(5문장 이상)
    → 최근 3년 기출 횟수(test_frequency) 명시
    → 구체적 예시 반드시 포함(2 - 3개)
    
    ✅ frequency_weight = 4(자주 출제)
    → "자주 출제되는 유형" 섹션에 frequency_weight = 5 다음에 배치
    → 핵심 내용만 정리(3 - 4문장)
    → 간단한 예시 1개(1 - 2문장)
    
    📚 frequency_weight = 3(선택적)
    → importance = 'A'인 핵심 개념과만 연결하여 포함
    → "함께 학습하면 좋은 개념" 형식으로 구성
    → 간단히(2 - 3문장)
    
    ❌ frequency_weight = 1~2(드문)
    → 기본적으로 제외
    → importance = 'A'인 경우에만 한 줄 언급

[정렬 기준]
1순위: frequency_weight DESC(5 → 4 → 3 → 1)
2순위: importance DESC(A → B → C)

  ============================================================================
[필수 출력 구조 - 이 순서대로 구성]
  ============================================================================

1️⃣ 🔥 자주 출제되는 유형
       ├─[frequency_weight = 5 항목들]
       │  ├─ 개념명 및 의미(뜻풀이)
       │  ├─ 출제 상황/판단/문제 형식
       │  ├─ 상세 설명 및 예시
       │  └─ 기출 현황: N회
       │
       └─[frequency_weight = 4 항목들]
          └─ 개념명/핵심정리/예시

2️⃣ 📚 핵심 개념 (정의, 공식, 설명, 중요도)

3️⃣ ⚠️ 자주 틀리는 포인트 (exam_trap_points)

${(subject.includes('과학') || subject === '수학' || subject === '사회') ? `
4️⃣ 📊 그래프 / 표 해석 포인트 (graph_patterns)
` : ''}

${(subject.includes('과학') || subject === '수학') ? `
5️⃣ 🔢 계산형 문제 대비 (calculation_focus)
` : ''}

  ============================================================================
[금지 사항]
  ============================================================================
- DB에 없는 내용 추측/생성 금지
- 고1 범위를 넘는 심화 내용 금지
- 출력 섹션 순서 변경 금지
- frequency_weight 규칙 엄수

            ============================================================================
[DB 조회 결과]
    ${textbookContext || '[경고] DB 조회 결과가 비어있습니다. 일반 지식으로 작성하십시오.'}
    
    ============================================================================
[응답 형식 - Strict JSON]
  ============================================================================
    
    반드시 다음 JSON 형식을 유지하십시오:

{
  "isValid": true,
    "sections": [
      {
        "title": "1. [영역명]",
        "parts": [
          [
            { "text": "🔥 [핵심유형] 개념명", "isImportant": true },
            { "text": "상세 설명 및 강의 내용... (충분히 길게)", "isImportant": false },
            { "text": "핵심 포인트: ...", "isImportant": true },
            { "text": "⚠️ 주의사항: ...", "isImportant": true }
          ]
        ]
      }
    ],
      "keywords": [
        { "word": "용어", "meaning": "설명" }
      ],
        "examPoints": [
          "강조하고 싶은 핵심 포인트 1",
          "강조하고 싶은 핵심 포인트 2"
        ]
}
`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY} `,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "GROQ_API_ERROR");
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

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY} `,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: history,
          temperature: 0.7
        })
      });

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
