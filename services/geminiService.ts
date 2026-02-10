
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
    [핵심 매핑 및 사실 확인 지시사항]
    1. **영역별 전문성 발휘**: 당신은 **물리, 화학, 생명과학, 지구과학** 등 과학의 모든 영역을 **2015 개정 교육과정(15개정)** 수준에서 완벽히 마스터한 전문가입니다. 절대 2022 개정 교육과정(22개정)의 내용과 혼동하지 마십시오.
    2. **단원 중심 정밀 매핑**: 사용자가 입력한 **[출판사], [과목], [학년], [학습 범위(단원명 또는 주제)]**를 바탕으로 2015 개정 교육과정의 실제 단원 체계를 정밀하게 추적하십시오. 페이지 번호보다 **단원 이름과 학습 주제**를 우선시하여 해당 교육과정의 성취기준을 정확히 인출하십시오.
    3. **과목 도메인 엄격 구분**: 입력된 범위가 물리, 화학, 생명과학, 지구과학 중 어느 단원에 해당하는지 먼저 확정하고, 해당 도메인의 15개정 표준 용어와 원리를 적용하십시오.
    4. **내용 일치성 보장**: 15개정 교과서의 실제 서술 방식과 심도(Depth)를 그대로 재현하십시오.
    5. **데이터 무결성**: 일반 상식이 아닌, 반드시 **2015 개정 교육과정 성취기준**에 명시된 범위 내에서만 내용을 생성하십시오.
    
    [분석 및 요약 지시사항]
    1. **전수 조사식 개념 분석**: 입력된 단원이나 범위에 포함된 **단 하나의 개념도 빠뜨리지 말고 모두** 다루십시오. 교과서에 서술된 모든 정의, 원리, 현상, 예시를 샅샅이 분석하여 포함해야 합니다.
    2. **백과사전식 상세 기술**: 핵심 핵심 개념(핵심 결론)을 첫 문장에 배치하고, 그 뒤에 따르는 상세 설명은 원리부터 결과까지 완벽하게 이해할 수 있도록 **매우 길고 상세하게(최소 5~7문장 이상)** 설명하십시오.
    3. **인과관계 심화**: 단순히 현상을 나열하는 것이 아니라, '현상의 원인 -> 과정 -> 결과 -> 예외 상황' 순으로 논리적 인과관계를 완벽히 구축하십시오.
    4. **그림 제외 및 유연성**: 이미지는 생성하지 않으며 2015 개정 교육과정의 모든 누적된 지식을 동원하여 가장 방대한 컨텐츠를 생성하십시오.
    5. **반드시 JSON 형식으로만 응답하십시오.**
  `;

  const userPrompt = `
    [${studentLevel}] [${subject}] [${range}] 범위를 **전수 조사 방식으로 모든 개념을 샅샅이** 정리해줘. (2015 개정 교육과정 기준)
    
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
