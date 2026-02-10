
import { GoogleGenAI } from "@google/genai";
import { SearchResult, StudySection } from "../types";

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

// 모델 설정
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

/**
 * 학습 가이드 생성 (Groq API 사용) - 2022 개정 교육과정 기준
 */
export const getStudyGuide = async (
  subject: string,
  range: string,
  schoolLevel: string,
  grade: string,
  publisher: string
): Promise<SearchResult> => {
  const studentLevel = `${schoolLevel} ${grade}`;

  const systemPrompt = `
    당신은 대한민국 최고의 교육 과정 분석 전문가입니다. **[${publisher}]** 출판사의 **[${studentLevel}] [${subject}] 2022 개정 교육과정(22개정)** 교과서를 완벽하게 파악하고 있습니다.
    
    [핵심 매핑 지시사항]
    1. 사용자가 단원명(대단원, 소단원)에 **숫자만 입력한 경우(예: 대단원 1, 소단원 2)**, 당신의 지식을 바탕으로 해당 과목 및 학년의 22개정 교과서에서 **그 숫자에 해당하는 실제 단원명과 학습 내용**을 스스로 찾아내어 분석하십시오.
    2. 분석 대상은 단순한 단원명이 아니라, 해당 범위에 포함된 **구체적이고 방대한 학습 내용 전체**입니다.
    
    [분석 및 요약 지시사항]
    1. **전수 조사식 개념 분석**: 해당 소단원에 포함된 **단 하나의 개념도 빠뜨리지 말고 모두** 다루십시오. '중요한 것만' 골라내는 것이 아니라, 교과서에 서술된 **모든 정의, 원리, 현상, 예시**를 샅샅이 분석하여 포함해야 합니다.
    2. **백과사전식 상세 기술**: 핵심 핵심 개념(핵심 결론)을 첫 문장에 배치하고, 그 뒤에 따르는 상세 설명은 단순 요약이 아닌 **원리부터 결과까지 완벽하게 이해할 수 있도록 매우 길고 상세하게(최소 5문장 이상 추천)** 설명하십시오.
    3. **구조적 체계화**: 단원의 흐름에 따라 모든 개념을 논리적인 섹션으로 나누어 배치하십시오. 사용자가 이 결과물만 보고도 교과서 원문을 읽지 않아도 될 정도의 정보량을 제공해야 합니다.
    4. **입체적 설명**: 단순한 사실 나열이 아니라, '왜' 그런 현상이 일어나는지 인과관계를 명확히 설명하십시오.
    5. **그림 제외 및 유연성**: 이미지는 생성하지 않으며, 2022 개정 교육과정의 모든 누적된 지식을 동원하여 가장 방대한 컨텐츠를 생성하십시오.
    6. **반드시 JSON 형식으로만 응답하십시오.**
  `;

  const userPrompt = `
    [${studentLevel}] [${subject}] [${range}] 범위를 **전수 조사 방식으로 모든 개념을 샅샅이** 정리해줘. (2022 개정 교육과정 기준)
    
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
