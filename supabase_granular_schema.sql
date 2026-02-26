-- ===========================================================================
-- New Table: Mock Questions (연도별/문항별 상세 분석 데이터)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS mock_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject TEXT NOT NULL, -- 국어, 수학, 영어, 한국사, 과학, 사회
    year INTEGER NOT NULL, -- 2021, 2022, 2023, 2024, 2025
    question_num INTEGER NOT NULL, -- 1~45번
    title TEXT NOT NULL, -- 문항 주제 (예: "물질의 상태 변화", "고전 시가의 정서")
    concept_explanation TEXT NOT NULL, -- 선생님 스타일의 상세 개념 설명 (일반 지식 + 기출 맥락)
    difficulty TEXT DEFAULT '중' CHECK (difficulty IN ('상', '중', '하')),
    trap_logic TEXT, -- 이 문항에서 파인 함정이나 주의점
    teacher_tip TEXT, -- 일타 강사의 실전 팁
    importance TEXT DEFAULT 'B' CHECK (importance IN ('A', 'B', 'C')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject, year, question_num)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_mock_questions_subject_year ON mock_questions(subject, year);
CREATE INDEX IF NOT EXISTS idx_mock_questions_importance ON mock_questions(importance);

-- RLS 설정
ALTER TABLE mock_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view mock_questions" ON mock_questions FOR SELECT USING (true);
CREATE POLICY "Admins can manage mock_questions" ON mock_questions 
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
