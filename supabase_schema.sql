
-- 1. 교과서 테이블 (Textbooks)
CREATE TABLE textbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publisher TEXT NOT NULL,          -- 출판사 (예: 비상교육)
    school_level TEXT NOT NULL,      -- 학교급 (중학교)
    grade TEXT NOT NULL,             -- 학년 (1학년)
    subject TEXT NOT NULL,           -- 과목 (과학)
    curriculum TEXT DEFAULT '2015',  -- 교육과정 (2015)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(publisher, grade, subject, curriculum)
);

-- 2. 단원 테이블 (Units)
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    textbook_id UUID REFERENCES textbooks(id) ON DELETE CASCADE,
    main_unit_num INTEGER,           -- 대단원 번호 (예: 1)
    main_unit_name TEXT NOT NULL,    -- 대단원 명 (예: 지권의 변화)
    sub_unit_num INTEGER,            -- 소단원 번호 (예: 1)
    sub_unit_name TEXT,              -- 소단원 명
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 본문 텍스트 데이터 (Content)
CREATE TABLE content_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    page_number INTEGER,             -- 페이지 번호
    raw_text TEXT NOT NULL,          -- 본문 원문
    is_important BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RAG 검색을 위한 인덱스
CREATE INDEX idx_textbooks_info ON textbooks(publisher, grade, subject);
CREATE INDEX idx_units_textbook ON units(textbook_id);
