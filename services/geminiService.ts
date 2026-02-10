import { GoogleGenAI } from "@google/genai";
import { SearchResult, StudySection } from "../types";
import { supabase } from "../lib/supabase";

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

// 모델 설정
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

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

  // 1. DB에서 실제 교과서 원문 데이터 조회 (RAG)
  let textbookContext = "";
  try {
    const query = supabase
      .from('content_chunks')
      .select(`
        raw_text, 
        page_number, 
        units!inner(
          title, 
          textbooks!inner(publisher, grade, subject)
        )
      `)
      .eq('units.textbooks.publisher', publisher)
      .eq('units.textbooks.grade', grade)
      .eq('units.textbooks.subject', subject);

    // 단원명(range)이 숫자가 아니면 해당 단원명으로 필터링 시도
    if (range && range.length > 2) {
      query.ilike('units.title', `%${range.replace('단원', '').trim()}%`);
    }

    const { data: chunks, error: dbError } = await query;

    if (chunks && chunks.length > 0) {
      textbookContext = chunks.map(c => `[p.${c.page_number}] ${c.raw_text}`).join('\n');
      console.log(`DB에서 ${chunks.length}개의 교과서 텍스트 조각을 로드했습니다. (필터: ${range})`);
    }
  } catch (err) {
    console.warn("DB 원문 조회 실패 (일반 지식으로 진행):", err);
  }

  const systemPrompt = `
    [핵심 매핑 및 사실 확인 지시사항]
    1. **영역별 전문성 발휘**: 당신은 **물리, 화학, 생명과학, 지구과학** 등 과학의 모든 영역을 **2015 개정 교육과정(15개정)** 수준에서 완벽히 마스터한 전문가입니다. 절대 2022 개정 교육과정(22개정)과 혼동하지 마십시오.
    2. **데이터 우선주의**: 만약 하단에 [교과서 원문 데이터]가 제공된다면, 당신의 일반 지식보다 **해당 원문에 적힌 내용을 최우선으로 신뢰**하여 분석하십시오. 원문에 있는 실험, 도표, 세부 설명을 하나도 누락하지 마십시오.
    3. **대단원 중심 정밀 매핑**: 사용자가 입력한 학습 범위가 숫자(예: 1, 2)나 "1단원"과 같은 형식일 경우, 이는 반드시 **2015 개정 교육과정 교과서의 '대단원(Major Unit)'**을 의미합니다. 해당 숫자에 해당하는 대단원 전체의 학습 내용과 모든 하위 소단원 개념을 완벽하게 인출하십시오.
    4. **과목 도메인 엄격 구분**: 입력된 대단원이 물리, 화학, 생명과학, 지구과학 중 어느 영역에 속하는지 15개정 표준 목차를 기준으로 즉시 확정하십시오.
    5. **내용 일치성 보장**: 15개정 교과서의 대단원별 실제 성취기준과 심도(Depth)를 그대로 재현하여, 해당 대단원 전체를 아우르는 방대한 데이터를 생성하십시오.
    6. **데이터 무결성**: 일반 상식이 아닌, 반드시 **2015 개정 교육과정 성취기준**에 명시된 범위 내에서만 내용을 생성하십시오.
    
    [분석 및 요약 지시사항]
    1. **이중 분석 전략 (전수 조사 + 시험 적중)**: 입력된 대단원의 **모든 개념을 샅샅이** 다루면서도, 동시에 **실제 시험에 출제될 확률이 높은 핵심 포인트**를 날카롭게 집어내십시오.
    2. **백과사전식 초정밀 기술**: 각 섹션의 첫 문장에 핵심 포인트를 배치하고, 그 뒤에 따르는 해설은 교과서 원문보다 구체적이고 깊이 있게 **매우 길게(최소 5~7문장 이상)** 서술하십시오. 분량에 제한을 두지 말고 풍부하게 작성하십시오.
    3. **시험 빈출 포인트 강조**: 시험에 반드시 나오는 함정 문구, 필수 암기 공식, 그래프 해석법 등을 'isImportant: true'와 함께 매우 상세히 설명하십시오.
    4. **논리적 완결성**: 현상의 원인, 과정, 결과, 그리고 실생활 예시까지 연결하여 사용자가 이 분석만으로 완벽한 시험 대비가 가능하도록 하십시오.
    5. **그림 제외 및 컨텐츠 극대화**: 이미지는 생성하지 않으며 2015 개정 교육과정의 모든 누적된 지식을 동원하여 가장 방대한 컨텐츠를 생성하십시오.
    6. **반드시 JSON 형식으로만 응답하십시오.**
  `;

  const userPrompt = `
    [${studentLevel}] [${subject}] [${range}] 범위를 **전수 조사 방식으로 모든 개념을 샅샅이** 정리해줘. (2015 개정 교육과정 기준)
    
    ${textbookContext ? `
    [교과서 원문 데이터 - 이 내용을 최우선으로 반영할 것]
    ${textbookContext}
    ` : ''}

    응답 지침:
    - 소단원에 존재하는 **모든 개념, 정의, 원리**를 누락 없이 섹션으로 나눌 것.
    - 각 섹션의 첫 문장에 핵심 결론을 넣고(isImportant: true), 그 뒤에 **교과서 원문보다 더 상세한 해설을 5문장 이상** 덧붙일 것.
    - 단순히 시험에 나오는 것뿐만 아니라, 기초부터 심화까지 모든 개념적 흐름을 다룰 것.
    
    응답 형식(JSON):
    {
      "isValid": true,
      "sections": [
        {
          "title": "섹션 제목",
          "parts": [
            [
              {"text": "여기에 가장 중요한 핵심 개념을 한 문장으로 작성하십시오.", "isImportant": true},
              {"text": "여기서부터는 위 핵심 개념에 대한 상세 설명을 3문항 이상 아주 길게 작성하십시오.", "isImportant": false},
              {"text": "상세 설명 문장 2...", "isImportant": false},
              {"text": "상세 설명 문장 3...", "isImportant": false}
            ]
          ],
          "isImportant": true
        }
      ],
      "keywords": [{"word": "핵심 개념", "meaning": "상세한 정의와 예시"}],
      "examPoints": ["시험 포인트 1", "시험 포인트 2"]
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
