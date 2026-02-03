
import { GoogleGenAI, Chat, Type } from "@google/genai";
import { SearchResult, StudySection } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const checkCompatibility = async (
  schoolLevel: string,
  grade: string,
  subject: string,
  publisher: string
): Promise<boolean> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `다음 조합이 한국 **2015 개정 교육과정(15개정)** 기준 실제로 존재하는 교과서인지 확인해줘.
      학교급: ${schoolLevel}
      학년: ${grade}
      과목: ${subject}
      출판사: ${publisher}
      
      실제로 존재하는 조합이면 "YES", 존재하지 않거나 매우 불확실하면 "NO"라고만 답변해.`,
      config: {
        temperature: 0.1,
      },
    });

    const text = response.text?.trim().toUpperCase();
    return text?.includes("YES") ?? false;
  } catch (error) {
    console.error("Compatibility Check Error:", error);
    return true;
  }
};

export const generateImage = async (prompt: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `An educational, clear, and high-quality 2D diagram or illustration for a school textbook explaining: ${prompt}. The style should be clean, modern, flat design, on a pure white background, without any text or labels inside the image. Focus on visual clarity and conceptual accuracy.` }
        ]
      },
      config: {
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
    
    사용자의 요청: "그림과 함께 설명해줘"
    
    [핵심 지시사항]
    1. **시각적 설명 우선**: 모든 주요 개념은 그림(이미지)과 함께 설명되어야 합니다. 각 섹션마다 해당 개념을 가장 잘 나타낼 수 있는 '시각적 묘사 프롬프트(illustrationPrompt)'를 반드시 포함하십시오.
    2. **구체적인 묘사**: illustrationPrompt는 이미지 생성 모델이 이해하기 쉽게 "어떤 사물이 있고, 어떤 작용이 일어나고 있는지" 구체적으로 묘사하십시오.
    3. **내용 구성**: 텍스트 설명은 그림과 유기적으로 연결되도록 작성하십시오.

    [검증 및 분석 프로세스]
    1. **목차 검색**: 구글 검색 도구를 사용하여 [${publisher}] [${studentLevel}] [${subject}] 교과서의 전체 목차 정보를 확인하십시오.
    2. **단원 매핑**: 입력된 [${range}] 정보가 실제 교과서의 어느 단원인지 확인하십시오.
    3. **정확성**: 실제 교과서 내용을 기반으로 요약하십시오.

    [작성 가이드라인]
    1. 2015 개정 교육과정(15개정) 기준.
    2. 불필요한 서술은 빼고 핵심 원리와 암기 포인트를 'sections'로 구성.
    3. 중요한 키워드는 'isImportant: true' 설정.
    4. 반드시 JSON 형식을 지키십시오.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 4096 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
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
          required: ["sections", "keywords", "examPoints"]
        }
      },
    });

    const data = JSON.parse(response.text || "{}");
    
    if (data.sections) {
      // 병렬로 이미지 생성 진행
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
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("정보를 가져오는 중에 오류가 발생했습니다.");
  }
};

export const createStudyChat = (context: string): Chat => {
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `당신은 학생의 질문에 답변하는 학습 도우미입니다. 2015 개정 교육과정(15개정) 지식을 바탕으로, 앞선 정리 내용과 그림 설명을 참고하여 답변하세요. 인사말은 생략하고 본론만 명확히 답변하세요.`,
    },
  });
};
