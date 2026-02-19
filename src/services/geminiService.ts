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

// 모델 설정
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

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
    const { data: concepts, error: conceptError } = await supabase
      .from('must_know_core')
      .select(`
        id,
        title,
        description,
        importance,
        education_level,
        formula,
        key_terms,
        appearance_logic(
          condition_context,
          reasoning_required,
          question_type,
          frequency_weight,
          test_frequency,
          linked_concepts
        )
      `)
      .in('education_level', ['middle_1', 'middle_2', 'middle_3'])
      .order('importance', { ascending: false });

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
[${concept.importance}] ${concept.title}
- ID: ${concept.id}
- 교육 수준: ${concept.education_level}
- 설명: ${concept.description}
${concept.formula ? `- 공식: ${concept.formula}` : ''}
${concept.key_terms ? `- 핵심 용어: ${concept.key_terms}` : ''}
${appLogic ? `
[출제 빈도 및 출제 상황]
- frequency_weight: ${appLogic.frequency_weight} (1:드문 ~ 5:거의항상)
- 출제 상황: ${appLogic.condition_context}
- 학생판단: ${appLogic.reasoning_required}
- 문제 형식: ${appLogic.question_type}
- 기출 현황: ${appLogic.test_frequency}회
${appLogic.linked_concepts ? `- 연관 개념: ${JSON.stringify(appLogic.linked_concepts)}` : ''}
` : ''}
---`;
      });

      formattedText += '\n\n=== 함정 포인트 ===\n\n';
      trapPoints?.forEach((trap) => {
        formattedText += `
[${trap.title}]
- 올바른 개념: ${trap.correct_concept}
- 흔한 실수: ${trap.common_mistake}
- 설명: ${trap.explanation}
---`;
      });

      formattedText += '\n\n=== 그래프/표 해석 ===\n\n';
      graphPatterns?.forEach((graph) => {
        formattedText += `
[${graph.pattern_name}]
- 축 설명: ${graph.axis_explanation}
- 해석 핵심: ${graph.interpretation_key}
- 문제 형식: ${graph.question_type}
- 빈도: ${graph.frequency}회
---`;
      });

      formattedText += '\n\n=== 계산형 문제 ===\n\n';
      calculations?.forEach((calc) => {
        formattedText += `
[공식: ${calc.formula}]
- 풀이 절차: ${calc.calculation_steps}
- 계산 실수: ${calc.common_calculation_errors}
- 단위 주의: ${calc.unit_considerations}
---`;
      });

      textbookContext = formattedText;
      console.log(`DB에서 ${concepts.length}개의 개념, ${trapPoints?.length || 0}개의 함정, ${graphPatterns?.length || 0}개의 그래프, ${calculations?.length || 0}개의 계산 데이터를 로드했습니다.`);
    } else {
      console.warn("DB에서 과목/교육 수준에 맞는 개념을 찾을 수 없습니다.");
    }
  } catch (err) {
    console.warn("DB 개념 조회 실패:", err);
  }

  const systemPrompt = `
    ============================================================================
    [고1 3월 전국연합 모의고사 과학 출제 전문가 역할 정의]
    ============================================================================
    
    당신은 고1 3월 전국연합 모의고사 과학 영역 출제자 관점에서 학습 자료를 작성하는 
    전문가입니다. 특히 최근 5개년(2021-2025) 기출 데이터를 완벽히 분석한 상태입니다.
    다음 규칙을 **절대로 어기지 말고** 모든 응답에 적용하십시오.

    [5개년(2021-2025) 트렌드 요약 데이터]
    ${TREND_KNOWLEDGE_2025}
    
    ============================================================================
    [1단계: 데이터 소스 규칙 - 반드시 준수]
    ============================================================================
    
    ✅ 필수 규칙:
    1. **DB 데이터만 사용**: 하단에 제공된 must_know_core, appearance_logic, exam_trap_points 
                            데이터만 사용하십시오.
    2. **education_level 필터 강제**: education_level이 'middle_1', 'middle_2', 'middle_3'인 
       개념만 포함하십시오. 절대로 'high_1_basic', 'high_1_advanced'를 사용하지 마십시오.
    3. **추측 생성 금지**: DB에 없는 개념을 추측하거나 만들어내지 마십시오.
    4. **고등학교 심화 개념 금지**: 고1 범위를 벗어나는 고급 개념을 생성하지 마십시오.
       (예: 원자의 전자 배치, 방사성 붕괴 메커니즘 등)
    
    ❌ 금지 사항:
    - 일반 지식으로 부족한 부분을 채우기
    - 교과서에 없는 개념 추가
    - 2022 개정 교육과정의 개념 혼입
    
    ============================================================================
    [2단계: appearance_logic 처리 규칙 - 매우 중요]
    ============================================================================
    
    frequency_weight 처리 규칙 (반드시 이 순서대로 적용):
    
    [frequency_weight = 5🔥] → **상세 설명 + 예시 필수**
      - 거의 항상 출제되는 유형
      - 가장 먼저 배치 
      - 상황(condition_context), 판단(reasoning_required), 형식(question_type) 모두 설명
      - 최근 기출 횟수 명시
      - 구체적 예제 반드시 포함
    
    [frequency_weight = 4✅] → **핵심만 정리 + 간단 예시**
      - 자주 출제되는 유형
      - frequency_weight=5 다음에 배치
      - 핵심 내용은 포함하되 간결하게
      - 간단한 예시만 (한두 문장)
    
    [frequency_weight = 3📚] → **선택적 포함**
      - importance가 'A'인 개념과 연결된 경우만 포함
      - "함께 학습하면 좋은 개념" 형식으로 추가
    
    [frequency_weight = 1~2❌] → **제외 (importance=A만 예외)**
      - 기본적으로 제외
      - importance='A'인 경우에만 한 줄 언급
    
    정렬 기준:
    1순위: frequency_weight DESC (5 → 4 → 3 → 1)
    2순위: importance DESC (A → B → C)
    
    ============================================================================
    [3단계: 출력 형식 규칙 - 엄격히 준수]
    ============================================================================
    
    반드시 다음 섹션 순서로 구성하십시오:
    
    1️⃣ 🔥 자주 출제되는 유형 (frequency_weight >= 4인 항목)
       - 맨 상단에 배치
       - frequency_weight 5 → 4 순서
       - 각 항목: 제목, 상황, 판단유형, 문제형식, 설명, 예시
    
    2️⃣ 📚 핵심 개념 정리 (must_know_core 모든 항목)
       - 단원별로 정렬
       - importance 순서대로 (A → B → C)
       - 각 개념: 정의, 공식(있으면), 설명, 중요도 표시
    
    3️⃣ ⚠️ 주의: 자주 틀리는 포인트 (exam_trap_points)
       - correct_concept vs common_mistake 명확히 구분
       - 학생의 흔한 실수 강조
       - 왜 틀렸는지 설명
    
    4️⃣ 📊 그래프/표 해석 (graph_patterns)
       - 자주 나오는 그래프 유형 설명
       - interpretation_key 강조
       - 축 설명 포함
    
    5️⃣ 🔢 계산형 문제 대비 (calculation_focus)
       - 공식 명시
       - 풀이 절차 단계별 설명
       - 단위 변환 주의사항
    
    ============================================================================
    [4단계: 작성 스타일 규칙]
    ============================================================================
    
    - **시험 대비 전략 중심**: 교과서 설명식이 아니라 출제자 관점
    - **간결하되 정확하게**: 불필요한 설명 제외, 핵심만
    - **예시 풍부하게**: frequency_weight=5는 반드시 구체 예제 포함
    - **위험 신호 강조**: 함정, 실수, 주의사항은 명확히 표시
    
    ============================================================================
    [5단계: 금지 사항 (다시 한 번 강조)]
    ============================================================================
    
    🚫 절대 하지 말 것:
    1. DB에 없는 개념 추가 생성
    2. 고등학교 1학년 범위 벗어나는 내용
    3. education_level이 high_1_* 인 개념 포함
    4. frequency_weight을 무시하고 모든 개념을 동등하게 취급
    5. 출력 섹션 순서 변경
    6. appearance_logic 데이터 무시
    
    ============================================================================
    반드시 JSON 형식으로만 응답하십시오.
  `;

  const userPrompt = `
    ============================================================================
    [고1 3월 전국연합 모의고사 과학 영역 학습 자료 작성 요청]
    ============================================================================
    
    [학력/과목/범위]
    - 학년: ${studentLevel}
    - 과목: ${subject}
    - 범위: ${range}
    
    [작성 기준]
    1. **5개년(2021-2025) 트렌드 우선**: DB 데이터 중 5개년 기출 트렌드(부력, 비열, 심장, 빅뱅 등)와 
       일치하는 항목은 반드시 "🔥 자주 출제되는 유형" 또는 "5개년 최다 빈출"로 강조하십시오.
    2. **DB 데이터만 사용**: 하단의 데이터베이스 조회 결과만 포함하십시오.
    3. **education_level 필터**: 중학교 범위(middle_1, middle_2, middle_3)의 개념만 선택하십시오.
    4. **추측 금지**: DB에 없는 개념은 절대 추가하지 마십시오.
    
    ============================================================================
    [appearance_logic 처리 규칙 - 매우 중요]
    ============================================================================
    
    다음 규칙을 정확히 따라 frequency_weight별로 구성하십시오:
    
    🔥 frequency_weight = 5 (거의 항상 출제)
    → "자주 출제되는 유형" 섹션에 가장 먼저 배치
    → 제목, 출제 상황(condition_context), 학생 판단(reasoning_required), 문제 형식(question_type) 모두 설명
    → 상세한 설명 (5문장 이상)
    → 최근 3년 기출 횟수(test_frequency) 명시
    → 구체적 예시 반드시 포함 (2-3개)
    
    ✅ frequency_weight = 4 (자주 출제)
    → "자주 출제되는 유형" 섹션에 frequency_weight=5 다음에 배치
    → 핵심 내용만 정리 (3-4문장)
    → 간단한 예시 1개 (1-2문장)
    
    📚 frequency_weight = 3 (선택적)
    → importance='A'인 핵심 개념과만 연결하여 포함
    → "함께 학습하면 좋은 개념" 형식으로 구성
    → 간단히 (2-3문장)
    
    ❌ frequency_weight = 1~2 (드문)
    → 기본적으로 제외
    → importance='A'인 경우에만 한 줄 언급
    
    [정렬 기준]
    1순위: frequency_weight DESC (5 → 4 → 3 → 1)
    2순위: importance DESC (A → B → C)
    
    ============================================================================
    [필수 출력 구조 - 이 순서대로 구성]
    ============================================================================
    
    1️⃣ 🔥 자주 출제되는 유형
       ├─ [frequency_weight=5 항목들]
       │  ├─ 개념명
       │  ├─ 출제되는 상황(condition_context)
       │  ├─ 학생이 해야할 판단(reasoning_required)
       │  ├─ 문제 형식(question_type)
       │  ├─ 상세 설명
       │  ├─ 기출 현황: N회
       │  └─ 예시: [구체적 문제 예시]
       │
       └─ [frequency_weight=4 항목들]
          ├─ 개념명
          ├─ 핵심만 정리
          └─ 예시: [간단한 예시]
    
    2️⃣ 📚 핵심 개념
       ├─ [importance='A' 개념들]
       ├─ [importance='B' 개념들]
       └─ [importance='C' 개념들]
       (각각: 정의, 공식, 설명, 중요도)
    
    3️⃣ ⚠️ 자주 틀리는 포인트
       └─ [exam_trap_points 데이터]
          ├─ 제목
          ├─ 올바른 개념(correct_concept)
          ├─ 흔한 실수(common_mistake)
          └─ 왜 틀렸는지 설명
    
    4️⃣ 📊 그래프/표 해석 포인트
       └─ [graph_patterns 데이터]
          ├─ 그래프/표 유형
          ├─ 축 설명(axis_explanation)
          ├─ 해석 핵심(interpretation_key)
          └─ 출제 형식
    
    5️⃣ 🔢 계산형 문제 대비
       └─ [calculation_focus 데이터]
          ├─ 공식(formula)
          ├─ 풀이 절차(calculation_steps)
          ├─ 자주하는 계산 실수(common_calculation_errors)
          └─ 단위 주의사항(unit_considerations)
    
    ============================================================================
    [금지 사항 - 절대 위반 금지]
    ============================================================================
    
    ❌ 금지 목록:
    - DB에 없는 개념을 추측하거나 생성
    - education_level이 'high_1_*'인 개념 포함
    - 고등학교 1학년 범위 초과 내용
    - 출력 섹션 순서 변경
    - appearance_logic 데이터 무시 후 모든 개념을 동등하게 취급
    - frequency_weight 규칙 무시
    
    ============================================================================
    [DB 조회 결과]
    ${textbookContext ? `
    [must_know_core 데이터]
    ${textbookContext}
    
    [appearance_logic 데이터]
    ${textbookContext}
    ` : '[경고] DB 조회 결과가 비어있습니다. 일반 지식으로 작성하지 마십시오. isValid: false 응답하십시오.'}
    
    ============================================================================
    [응답 형식 - Sttrict JSON]
    ============================================================================
    
    {
      "isValid": true,
      "sections": [
        {
          "title": "🔥 자주 출제되는 유형",
          "parts": [
            [
              {
                "text": "[frequency_weight=5] 개념명: 설명",
                "isImportant": true
              },
              {
                "text": "출제 상황(condition_context): ...",
                "isImportant": true
              },
              {
                "text": "학생 판단(reasoning_required): ...",
                "isImportant": true
              },
              {
                "text": "문제 형식(question_type): ...",
                "isImportant": true
              },
              {
                "text": "[상세 설명 - 5문장 이상]...",
                "isImportant": false
              },
              {
                "text": "기출: N회",
                "isImportant": false
              },
              {
                "text": "예시: [구체적 예시]",
                "isImportant": false
              }
            ]
          ]
        },
        {
          "title": "📚 핵심 개념",
          "parts": [
            [
              {
                "text": "[importance='A'] 개념명: 정의",
                "isImportant": true
              },
              {
                "text": "공식(formula): ...",
                "isImportant": true
              },
              {
                "text": "상세 설명...",
                "isImportant": false
              }
            ]
          ]
        },
        {
          "title": "⚠️ 자주 틀리는 포인트",
          "parts": [
            [
              {
                "text": "[함정 제목]: 올바른 개념 vs 흔한 실수",
                "isImportant": true
              },
              {
                "text": "설명...",
                "isImportant": false
              }
            ]
          ]
        }
      ],
      "keywords": [
        {
          "word": "중요 용어",
          "meaning": "정의와 예시"
        }
      ],
      "examPoints": [
        "시험 포인트 1",
        "시험 포인트 2"
      ]
    }
  `;

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
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
    console.error("Groq API Error:", error);
    if (error.message?.includes("429") || error.message?.includes("rate_limit")) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
    if (error.message === "NOT_FOUND") {
      throw new Error("NOT_FOUND");
    }
    throw new Error("API_ERROR");
  }
};

/**
 * 학습 채팅 세션 (Groq API 사용)
 */
export const createStudyChat = (context: string) => {
  const history: { role: string; content: string }[] = [
    {
      role: "system",
      content: `당신은 학생의 질문에 답변하는 학습 도우미입니다. 2022 개정 교육과정(22개정) 지식을 바탕으로 풍부하고 상세하게 답변하세요. 인사말은 생략하고 본론만 명확히 답변하세요. Context: ${context}`
    }
  ];

  return {
    sendMessage: async ({ message }: { message: string }) => {
      history.push({ role: "user", content: message });

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
