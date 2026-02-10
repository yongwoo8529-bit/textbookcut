
import { GoogleGenAI } from "@google/genai";
import { SearchResult, StudySection } from "../types";

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// 모델 설정
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const IMAGE_MODEL = "gemini-2.0-flash";

/**
 * 이미지 생성 (Gemini 유지 - Groq 미지원)
 */
export const generateImage = async (prompt: string): Promise<string | undefined> => {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'PLACEHOLDER_API_KEY') {
    console.warn("Gemini API Key is missing for image generation.");
    return undefined;
  }

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [
          { text: `An educational, clear, and high-quality 2D diagram or illustration for a school textbook explaining: ${prompt}. The style should be clean, modern, flat design, on a pure white background, without any text or labels inside the image. Focus on visual clarity and conceptual accuracy.` }
        ]
      },
      config: {
        // @ts-ignore
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image Generation Error:", error);
  }
  return undefined;
};

/**
 * 학습 가이드 생성 (Groq API 사용)
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
    당신은 한국의 교육 전문가입니다. **[${publisher}]** 출판사의 **[${studentLevel}] [${subject}] 2015 개정 교육과정(15개정)** 내용을 요약하고 시각화하는 역할을 맡았습니다.
    
    [핵심 지시사항]
    1. 사용자가 요청한 **[${range}]** 범위의 핵심 개념을 정리하십시오.
    2. **시각적 설명 우선**: 모든 주요 개념은 그림(이미지)과 함께 설명되어야 합니다. 각 섹션마다 해당 개념을 가장 잘 나타낼 수 있는 '시각적 묘사 프롬프트(illustrationPrompt)'를 반드시 포함하십시오.
    3. **유연한 생성**: 특정 출판사의 세부 내용이 기억나지 않더라도, 해당 과목의 15개정 표준 교육과정 내용과 일치한다면 "isValid: true"로 간주하고 내용을 생성하십시오.
    4. **내용 구성**: 텍스트 설명은 그림과 유기적으로 연결되도록 작성하고, 중요한 키워드는 'isImportant: true'로 설정하십시오.
    5. **반드시 JSON 형식으로만 응답하십시오.**
  `;

  const userPrompt = `
    [${studentLevel}] [${subject}] [${range}] 범위를 요약해줘.
    
    응답 형식(JSON):
    {
      "isValid": true,
      "sections": [
        {
          "title": "섹션 제목",
          "parts": [[{"text": "문장1", "isImportant": true}, {"text": "문장2", "isImportant": false}]],
          "isImportant": true,
          "illustrationPrompt": "그림 생성용 영문 프롬프트 (예: a diagram of atom structure, flat design style)"
        }
      ],
      "keywords": [{"word": "단어", "meaning": "뜻"}],
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

    if (data.sections) {
      const imagePromises = data.sections.map(async (section: StudySection) => {
        if (section.illustrationPrompt) {
          section.imageUrl = await generateImage(section.illustrationPrompt);
        }
      });
      await Promise.all(imagePromises);
    }

    return {
      ...data,
      groundingChunks: [] // Groq는 Google Search Grounding 미지원
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
      content: `당신은 학생의 질문에 답변하는 학습 도우미입니다. 2015 개정 교육과정(15개정) 지식을 바탕으로, 앞선 정리 내용과 그림 설명을 참고하여 답변하세요. 인사말은 생략하고 본론만 명확히 답변하세요. Context: ${context}`
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
