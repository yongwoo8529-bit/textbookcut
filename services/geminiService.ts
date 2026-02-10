
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
    당신은 대한민국 교육 전문가입니다. **[${publisher}]** 출판사의 **[${studentLevel}] [${subject}] 2022 개정 교육과정(22개정)** 내용을 심도 있게 분석하고 요약하는 전문가입니다.
    
    [핵심 지시사항]
    1. 사용자가 요청한 **[${range}]** 범위의 내용을 매우 광범위하고 상세하게 정리하십시오. 
    2. 단순한 요약을 넘어, 개념 사이의 연결고리와 심화 학습 내용까지 포함하여 풍부하게 구성하십시오.
    3. **내용의 풍부함**: 각 섹션을 세분화하여 최대한 많은 정보를 제공하되, 가독성을 위해 문단과 문장을 적절히 나누십시오.
    4. **그림 제외**: 이미지는 생성하지 않으며, 오직 텍스트 기반의 상세한 설명에만 집중하십시오.
    5. **유연한 생성**: 특정 출판사의 세부 내용이 기억나지 않더라도, 해당 과목의 22개정 표준 교육과정 방향성과 일치한다면 "isValid: true"로 간주하고 내용을 생성하십시오.
    6. **반드시 JSON 형식으로만 응답하십시오.**
  `;

  const userPrompt = `
    [${studentLevel}] [${subject}] [${range}] 범위를 아주 상세하고 광범위하게 정리해줘. (2022 개정 교육과정 기준)
    
    응답 형식(JSON):
    {
      "isValid": true,
      "sections": [
        {
          "title": "섹션 제목 (추상적이지 않고 구체적으로)",
          "parts": [
            [{"text": "상세 설명 문장 1", "isImportant": true}, {"text": "상세 설명 문장 2", "isImportant": false}],
            [{"text": "심화 보충 설명 문장", "isImportant": false}]
          ],
          "isImportant": true
        }
      ],
      "keywords": [{"word": "핵심 개념", "meaning": "상세한 정의와 예시"}],
      "examPoints": ["시험에 자주 나오는 포인트 1", "변별력을 가르는 심화 포인트 2"]
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
