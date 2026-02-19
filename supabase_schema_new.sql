-- ============================================================================
-- 고1 3월 전국연합 과학 시험 대비 DB 구조
-- ============================================================================
-- 목표: 단원별 핵심개념, 함정, 그래프, 계산형 문제를 체계적으로 관리
-- ============================================================================

-- ===========================================================================
-- 1. Exam Types (시험 종류)
-- ===========================================================================
CREATE TABLE exam_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    year INTEGER,
    month INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, year, month)
);

-- ===========================================================================
-- 2. Subjects (과목)
-- ===========================================================================
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_type_id UUID REFERENCES exam_types(id) ON DELETE CASCADE NOT NULL,
    subject_code TEXT NOT NULL,
    korean_name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exam_type_id, subject_code)
);

-- ===========================================================================
-- 3. Units (단원) - 물리/화학/생명과학/지구과학의 각 단원
-- ===========================================================================
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    unit_number INTEGER NOT NULL,
    unit_title TEXT NOT NULL,
    description TEXT,
    difficulty_level TEXT DEFAULT 'intermediate' CHECK (difficulty_level IN ('easy', 'intermediate', 'hard')),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, unit_number)
);

-- ===========================================================================
-- 4. Must Know Core (꼭 알아야 할 핵심 개념)
-- ===========================================================================
-- 시험 출제자 입장에서 반드시 포함해야 하는 개념
CREATE TABLE must_know_core (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    importance TEXT NOT NULL DEFAULT 'A' CHECK (importance IN ('A', 'B', 'C')),
    -- A: 반드시 출제 가능 (90% 이상), B: 자주 출제 (50-90%), C: 가끔 출제 (20-50%)
    education_level VARCHAR(20) NOT NULL DEFAULT 'middle_3' CHECK (education_level IN (
        'middle_1', 'middle_2', 'middle_3', 'high_1_basic', 'high_1_advanced'
    )),
    -- 교육 수준: middle_1(중1), middle_2(중2), middle_3(중3), high_1_basic(고1 기초), high_1_advanced(고1 심화)
    formula TEXT,
    key_terms TEXT,
    related_concepts TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================================================
-- 5. Exam Trap Points (시험 함정 포인트)
-- ===========================================================================
-- 학생들이 자주 틀리거나 혼동하는 포인트
CREATE TABLE exam_trap_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    -- 함정이 무엇인지 설명
    correct_concept TEXT NOT NULL,
    -- 올바른 개념
    common_mistake TEXT NOT NULL,
    -- 학생들이 자주 하는 실수
    importance TEXT NOT NULL DEFAULT 'A' CHECK (importance IN ('A', 'B', 'C')),
    -- A: 매우 중요한 함정, B: 중간 정도, C: 가끔 나오는 함정
    test_frequency INTEGER DEFAULT 0,
    -- 최근 3년 기출 횟수
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================================================
-- 6. Graph Patterns (그래프 및 자료 해석 패턴)
-- ===========================================================================
-- 시험에서 자주 출제되는 그래프, 표, 이미지 해석 유형
CREATE TABLE graph_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    -- 그래프/표의 특성 설명
    pattern_type TEXT NOT NULL CHECK (pattern_type IN 
        ('line_graph', 'bar_chart', 'scatter_plot', 'table', 'diagram', 'image', 'mixed')),
    -- 그래프 유형 분류
    axis_explanation TEXT,
    -- x축, y축 또는 표의 행/열 설명
    interpretation_key TEXT NOT NULL,
    -- 이 그래프/표를 해석하는 핵심 포인트
    importance TEXT NOT NULL DEFAULT 'A' CHECK (importance IN ('A', 'B', 'C')),
    -- A: 매우 자주 출제, B: 중간 정도, C: 가끔 출제
    test_frequency INTEGER DEFAULT 0,
    -- 최근 3년 기출 횟수
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================================================
-- 7. Calculation Focus (계산형 문제 중심 개념)
-- ===========================================================================
-- 계산이 필요한 문제 유형과 공식, 풀이 절차
CREATE TABLE calculation_focus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    -- 계산 문제의 주제
    formula TEXT NOT NULL,
    -- 핵심 공식 (여러 개인 경우 메타데이터로 분리)
    formula_variables TEXT,
    -- 공식의 변수 설명 (JSON: {"v": "속도", "a": "가속도"})
    calculation_steps TEXT NOT NULL,
    -- 풀이 절차를 단계별로 설명
    common_calculation_errors TEXT,
    -- 계산 중 자주 하는 실수
    unit_considerations TEXT,
    -- 단위 변환, 유효숫자 등 주의사항
    importance TEXT NOT NULL DEFAULT 'A' CHECK (importance IN ('A', 'B', 'C')),
    -- A: 거의 항상 출제, B: 자주 출제, C: 가끔 출제
    difficulty_level TEXT DEFAULT 'intermediate' CHECK (difficulty_level IN ('easy', 'intermediate', 'hard')),
    test_frequency INTEGER DEFAULT 0,
    -- 최근 3년 기출 횟수
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================================================
-- 8. Appearance Logic (출제 상황 및 조건)
-- ===========================================================================
-- 각 개념이 어떤 조건에서 문제로 출제되는지를 정의
-- 예: "뉴턴의 제2법칙"은 "물체가 정지해있다"는 조건에서 "가속도 방향 판단" 유형으로 출제됨
CREATE TABLE appearance_logic (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    concept_id UUID REFERENCES must_know_core(id) ON DELETE CASCADE NOT NULL,
    condition_context TEXT NOT NULL,
    -- 문제가 나타나는 상황 (예: "병렬회로에서", "박테리오파지가 감염했을 때", "고기압 영역에서")
    reasoning_required TEXT NOT NULL,
    -- 학생이 필요한 판단/사고 유형 (예: "비교분석", "방향판단", "증감 추론", "수량 계산", "인과관계 파악")
    linked_concepts JSONB,
    -- 함께 출제되는 관련 개념들 (UUID 배열 형식)
    -- 예: ["uuid1", "uuid2"] - must_know_core의 개념들을 참조
    question_type TEXT NOT NULL CHECK (question_type IN (
        '옳은_것_고르기',
        '틀린_것_고르기',
        '순서_배열',
        '빈_칸_채우기',
        '그래프_해석',
        '표_해석',
        '숫자_계산',
        '선택지_비교',
        '현상_설명',
        '원인_파악',
        '결과_예측'
    )),
    -- 출제되는 문제 유형
    frequency_weight INTEGER NOT NULL DEFAULT 3 CHECK (frequency_weight >= 1 AND frequency_weight <= 5),
    -- 출제 빈도 가중치: 1(매우 드물게), 2(드물게), 3(중간), 4(자주), 5(거의 항상)
    test_frequency INTEGER DEFAULT 0,
    -- 최근 3년 기출 횟수 (참고용)
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================================================
-- 9. 인덱스 생성 (성능 최적화)
-- ===========================================================================
CREATE INDEX idx_subjects_exam_type_id ON subjects(exam_type_id);
CREATE INDEX idx_units_subject_id ON units(subject_id);
CREATE INDEX idx_must_know_core_unit_id ON must_know_core(unit_id);
CREATE INDEX idx_must_know_core_importance ON must_know_core(importance);
CREATE INDEX idx_must_know_core_education_level ON must_know_core(education_level);
CREATE INDEX idx_exam_trap_points_unit_id ON exam_trap_points(unit_id);
CREATE INDEX idx_exam_trap_points_importance ON exam_trap_points(importance);
CREATE INDEX idx_graph_patterns_unit_id ON graph_patterns(unit_id);
CREATE INDEX idx_graph_patterns_pattern_type ON graph_patterns(pattern_type);
CREATE INDEX idx_graph_patterns_importance ON graph_patterns(importance);
CREATE INDEX idx_calculation_focus_unit_id ON calculation_focus(unit_id);
CREATE INDEX idx_calculation_focus_importance ON calculation_focus(importance);
CREATE INDEX idx_appearance_logic_concept_id ON appearance_logic(concept_id);
CREATE INDEX idx_appearance_logic_question_type ON appearance_logic(question_type);
CREATE INDEX idx_appearance_logic_frequency_weight ON appearance_logic(frequency_weight);

-- ===========================================================================
-- 10. RLS (Row Level Security) 정책
-- ===========================================================================
-- 기본: 모든 테이블은 인증된 사용자가 읽을 수 있음 (공개)
-- 쓰기: admin 권한만 가능 (profiles.role = 'admin')

-- exam_types RLS
ALTER TABLE exam_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view exam_types" ON exam_types
  FOR SELECT USING (true);
CREATE POLICY "Only admins can insert exam_types" ON exam_types
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can update exam_types" ON exam_types
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can delete exam_types" ON exam_types
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- subjects RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view subjects" ON subjects
  FOR SELECT USING (true);
CREATE POLICY "Only admins can insert subjects" ON subjects
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can update subjects" ON subjects
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can delete subjects" ON subjects
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- units RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view units" ON units
  FOR SELECT USING (true);
CREATE POLICY "Only admins can insert units" ON units
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can update units" ON units
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can delete units" ON units
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- must_know_core RLS
ALTER TABLE must_know_core ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view must_know_core" ON must_know_core
  FOR SELECT USING (true);
CREATE POLICY "Only admins can insert must_know_core" ON must_know_core
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can update must_know_core" ON must_know_core
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can delete must_know_core" ON must_know_core
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- exam_trap_points RLS
ALTER TABLE exam_trap_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view exam_trap_points" ON exam_trap_points
  FOR SELECT USING (true);
CREATE POLICY "Only admins can insert exam_trap_points" ON exam_trap_points
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can update exam_trap_points" ON exam_trap_points
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can delete exam_trap_points" ON exam_trap_points
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- graph_patterns RLS
ALTER TABLE graph_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view graph_patterns" ON graph_patterns
  FOR SELECT USING (true);
CREATE POLICY "Only admins can insert graph_patterns" ON graph_patterns
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can update graph_patterns" ON graph_patterns
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can delete graph_patterns" ON graph_patterns
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- calculation_focus RLS
ALTER TABLE calculation_focus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view calculation_focus" ON calculation_focus
  FOR SELECT USING (true);
CREATE POLICY "Only admins can insert calculation_focus" ON calculation_focus
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can update calculation_focus" ON calculation_focus
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can delete calculation_focus" ON calculation_focus
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- appearance_logic RLS
ALTER TABLE appearance_logic ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view appearance_logic" ON appearance_logic
  FOR SELECT USING (true);
CREATE POLICY "Only admins can insert appearance_logic" ON appearance_logic
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can update appearance_logic" ON appearance_logic
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Only admins can delete appearance_logic" ON appearance_logic
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ===========================================================================
-- 11. 초기 데이터 설정 (기본 데이터 인박)
-- ===========================================================================
-- exam_types: 고1 3월 전국연합 과학
INSERT INTO exam_types (name, description, year, month)
VALUES ('고1_3월_전국연합_과학', 'High School 1st Year March National Unified Assessment - Science', 2025, 3);

-- subjects: 4개 과목
INSERT INTO subjects (exam_type_id, subject_code, korean_name, description, display_order)
SELECT id, 'physics', '물리', 'Physics - 운동, 에너지, 파동, 전기자기', 1
FROM exam_types WHERE name = '고1_3월_전국연합_과학'
UNION ALL
SELECT id, 'chemistry', '화학', 'Chemistry - 원소, 화학반응, 에너지변화', 2
FROM exam_types WHERE name = '고1_3월_전국연합_과학'
UNION ALL
SELECT id, 'biology', '생명과학', 'Biology - 세포, 순환, 유전, 진화', 3
FROM exam_types WHERE name = '고1_3월_전국연합_과학'
UNION ALL
SELECT id, 'earth_science', '지구과학', 'Earth Science - 광물, 암석, 지진, 대기, 우주', 4
FROM exam_types WHERE name = '고1_3월_전국연합_과학';

-- 기존 must_know_core 데이터에 education_level 기본값 설정
UPDATE must_know_core SET education_level = 'middle_3' WHERE education_level IS NULL;

-- ===========================================================================
-- 12. 테이블 구조 요약
-- ===========================================================================
/*
┌─────────────────────────────────────────────┐
│         고1 3월 전국연합 과학 DB 구조          │
│         (시험 출제 관점 설계)                  │
└─────────────────────────────────────────────┘

exam_types (시험 종류)
  ↓
subjects (과목: physics/chemistry/biology/earth_science)
  ↓
units (단원 1~10)
  ├─ must_know_core (꼭 알아야 할 핵심 개념)
  │  └─ id, title, description, importance(A/B/C)
  │     + education_level(middle_1/2/3, high_1_basic/advanced)
  │     └── appearance_logic (출제 상황 및 조건)
  │         └─ id, condition_context, reasoning_required
  │            + linked_concepts, question_type, frequency_weight
  │
  ├─ exam_trap_points (자주 틀리는 함정)
  │  └─ id, title, description, importance(A/B/C)
  │     + correct_concept, common_mistake
  │
  ├─ graph_patterns (그래프/표 해석 유형)
  │  └─ id, title, description, importance(A/B/C)
  │     + pattern_type, interpretation_key
  │
  └─ calculation_focus (계산형 문제)
     └─ id, title, description, importance(A/B/C)
        + formula, calculation_steps

접근 권한:
- SELECT: 모든 사용자 (인증 필수)
- INSERT/UPDATE/DELETE: admin만
*/

-- ===========================================================================
-- 13. 쿼리 예제
-- ===========================================================================
/*
-- 1. 물리학의 모든 핵심 개념 조회
SELECT mkc.title, mkc.description, mkc.importance
FROM must_know_core mkc
JOIN units u ON mkc.unit_id = u.id
JOIN subjects s ON u.subject_id = s.id
WHERE s.subject_code = 'physics'
ORDER BY u.unit_number, mkc.display_order;

-- 2. 중요도가 'A'인 함정 포인트 조회
SELECT ep.title, ep.correct_concept, ep.common_mistake
FROM exam_trap_points ep
JOIN units u ON ep.unit_id = u.id
WHERE ep.importance = 'A'
ORDER BY ep.test_frequency DESC;

-- 3. 선택형 그래프 패턴 조회
SELECT gp.title, gp.interpretation_key
FROM graph_patterns gp
WHERE gp.pattern_type IN ('line_graph', 'bar_chart')
ORDER BY gp.importance, gp.display_order;

-- 4. 특정 단원의 모든 데이터 조회
SELECT 
  'must_know_core' as category,
  mkc.title, mkc.description, mkc.importance
FROM must_know_core mkc
WHERE mkc.unit_id = '<unit_id>'
UNION ALL
SELECT 
  'exam_trap_points',
  ep.title, ep.description, ep.importance
FROM exam_trap_points ep
WHERE ep.unit_id = '<unit_id>'
UNION ALL
SELECT 
  'graph_patterns',
  gp.title, gp.description, gp.importance
FROM graph_patterns gp
WHERE gp.unit_id = '<unit_id>'
UNION ALL
SELECT 
  'calculation_focus',
  cf.title, cf.description, cf.importance
FROM calculation_focus cf
WHERE cf.unit_id = '<unit_id>';

-- 5. 특정 개념에 대한 출제 상황 조회
SELECT 
  mkc.title as concept,
  al.condition_context,
  al.reasoning_required,
  al.question_type,
  al.frequency_weight,
  al.linked_concepts
FROM appearance_logic al
JOIN must_know_core mkc ON al.concept_id = mkc.id
WHERE mkc.id = '<concept_id>'
ORDER BY al.frequency_weight DESC;

-- 6. 빈도가 높은 출제 유형 조회
SELECT 
  mkc.title as concept,
  al.question_type,
  al.condition_context,
  al.frequency_weight,
  COUNT(*) as occurrence_count
FROM appearance_logic al
JOIN must_know_core mkc ON al.concept_id = mkc.id
WHERE al.frequency_weight >= 4
GROUP BY mkc.title, al.question_type, al.condition_context, al.frequency_weight
ORDER BY al.frequency_weight DESC, occurrence_count DESC;

-- 7. 연관 개념을 함께 학습할 수정 있는 개념 추천
-- (linked_concepts에 해당 개념이 포함되어 있는 경우)
SELECT 
  mkc.title,
  mkc.description,
  COUNT(*) as correlation_count
FROM appearance_logic al
JOIN must_know_core mkc ON al.concept_id = mkc.id
WHERE al.linked_concepts::text LIKE '%<concept_id>%'
GROUP BY mkc.id, mkc.title, mkc.description
ORDER BY correlation_count DESC;

-- 8. 중학교 범위의 핵심 개념만 조회 (고1 3월 모의고사 기준)
-- education_level이 middle_1, middle_2, middle_3인 개념만 필터링
SELECT 
  s.korean_name as subject,
  u.unit_number,
  u.unit_title,
  mkc.title as concept,
  mkc.description,
  mkc.importance,
  mkc.education_level,
  COUNT(al.id) as appearance_count
FROM must_know_core mkc
JOIN units u ON mkc.unit_id = u.id
JOIN subjects s ON u.subject_id = s.id
LEFT JOIN appearance_logic al ON mkc.id = al.concept_id
WHERE mkc.education_level IN ('middle_1', 'middle_2', 'middle_3')
  AND s.exam_type_id = (SELECT id FROM exam_types WHERE name = '고1_3월_전국연합_과학')
GROUP BY s.id, s.korean_name, u.unit_number, u.unit_title, mkc.id, mkc.title, mkc.description, mkc.importance, mkc.education_level
ORDER BY s.korean_name, u.unit_number, mkc.display_order;

-- 9. 특정 과목의 교육 수준별 개념 통계
-- 각 교육 수준별로 얼마나 많은 개념이 있는지 파악
SELECT 
  s.korean_name as subject,
  mkc.education_level,
  COUNT(*) as concept_count,
  COUNT(DISTINCT mkc.importance) as importance_distribution
FROM must_know_core mkc
JOIN units u ON mkc.unit_id = u.id
JOIN subjects s ON u.subject_id = s.id
WHERE s.exam_type_id = (SELECT id FROM exam_types WHERE name = '고1_3월_전국연합_과학')
GROUP BY s.korean_name, mkc.education_level
ORDER BY s.korean_name, CASE mkc.education_level 
  WHEN 'middle_1' THEN 1
  WHEN 'middle_2' THEN 2
  WHEN 'middle_3' THEN 3
  WHEN 'high_1_basic' THEN 4
  WHEN 'high_1_advanced' THEN 5
END;
*/
