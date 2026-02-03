
import { GoogleGenAI, Chat, Type } from "@google/genai";
import { SearchResult, StudySection } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// 안정적인 모델 명칭 사용
const TEXT_MODEL = "gemini-2.0-flash";
const IMAGE_MODEL = "gemini-2.0-flash"; // 이미지는 동일 모델 혹은 전용 모델 사용

export const generateImage = async (prompt: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [
          { text: `An educational, clear, and high-quality 2D diagram or illustration for a school textbook explaining: ${prompt}. The style should be clean, modern, flat design, on a pure white background, without any text or labels inside the image. Focus on visual clarity and conceptual accuracy.` }
        ]
      },
      config: {
        // 이미지 생성이 지원되는 모델인 경우의 설정
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

export const getStudyGuide = async (
  subject: string, 
  range: string, 
  schoolLevel: string, 
  grade: string,
  publisher: string
): Promise<SearchResult> => {
  const studentLevel = `${schoolLevel} ${grade}`;
  
  const prompt = `
    당신은 한국의 베테랑 강사입니다. **[${publisher}]** 출판사의 **[${studentLevel}] [${subject}] 2015 개정 교육과정(15개정)** 교과서 요약 전문가입니다.
    
    [핵심 지시사항]
    1. 만약 입력된 정보(학교급, 학년, 과목, 출판사)가 실제로 존재하지 않는 조합이라면, "NOT_FOUND"라는 에러 응답을 생성하십시오.
    2. 실제 존재하는 조합이라면, 사용자의 요청인 "그림과 함께 설명해줘"에 맞춰 내용을 구성하십시오.
    3. **시각적 설명 우선**: 모든 주요 개념은 그림(이미지)과 함께 설명되어야 합니다. 각 섹션마다 해당 개념을 가장 잘 나타낼 수 있는 '시각적 묘사 프롬프트(illustrationPrompt)'를 반드시 포함하십시오.
    4. **내용 구성**: 텍스트 설명은 그림과 유기적으로 연결되도록 작성하고, 중요한 키워드는 'isImportant: true'로 설정하십시오.
    5. 반드시 JSON 형식을 지키십시오.
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // @ts-ignore
        thinkingConfig: { thinkingBudget: 2048 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN, description: "실존하는 교과서 조합인지 여부" },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  parts: { 
                    type: Type.ARRAY, 
                    items: { 
                      type: Type.ARRAY, 
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING },
                          isImportant: { type: Type.BOOLEAN }
                        },
                        required: ["text", "isImportant"]
                      }
                    } 
                  },
                  isImportant: { type: Type.BOOLEAN },
                  illustrationPrompt: { type: Type.STRING }
                },
                required: ["title", "parts", "isImportant", "illustrationPrompt"]
              }
            },
            keywords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  meaning: { type: Type.STRING }
                },
                required: ["word", "meaning"]
              }
            },
            examPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["isValid", "sections", "keywords", "examPoints"]
        }
      },
    });

    const data = JSON.parse(response.text || "{}");
    
    if (!data.isValid) {
      throw new Error("NOT_FOUND");
    }

    if (data.sections) {
      // 병렬 생성 시에도 약간의 지연을 주거나 순차적으로 처리하여 429 방지 고려
      // 여기서는 일단 병렬로 두되 개별 에러 핸들링 강화
      const imagePromises = data.sections.map(async (section: StudySection) => {
        if (section.illustrationPrompt) {
          section.imageUrl = await generateImage(section.illustrationPrompt);
        }
      });
      await Promise.all(imagePromises);
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
      ...data,
      groundingChunks: groundingChunks as any
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("429") || error.status === "RESOURCE_EXHAUSTED") {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
    if (error.message === "NOT_FOUND") {
      throw new Error("NOT_FOUND");
    }
    throw new Error("API_ERROR");
  }
};

export const createStudyChat = (context: string): Chat => {
  return ai.chats.create({
    model: TEXT_MODEL,
    config: {
      systemInstruction: `당신은 학생의 질문에 답변하는 학습 도우미입니다. 2015 개정 교육과정(15개정) 지식을 바탕으로, 앞선 정리 내용과 그림 설명을 참고하여 답변하세요. 인사말은 생략하고 본론만 명확히 답변하세요.`,
    },
  });
};
