
export interface TextPart {
  text: string;
  isImportant: boolean;
}

export interface StudySection {
  title: string;
  parts: TextPart[][]; // 각 문장은 TextPart의 배열입니다.
  isImportant: boolean;
  illustrationPrompt?: string; // 과학 등 시각 자료가 필요한 경우
  imageUrl?: string; // 생성된 이미지 URL
}

export interface Keyword {
  word: string;
  meaning: string;
}

export interface SearchResult {
  sections: StudySection[];
  keywords: Keyword[];
  examPoints: string[];
  groundingChunks: Array<{
    web?: {
      uri: string;
      title: string;
    }
  }>;
}
