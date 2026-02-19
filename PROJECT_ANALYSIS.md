# 프로젝트 구조 분석 보고서
## 현재: 교과서 요약 서비스 → 목표: 고1 3월 전국연합 과학 시험 대비 서비스

---

## 1️⃣ 데이터베이스 구조 분석

### 현재 DB 설계 (단원/출판사 중심)
```
textbooks (교과서)
├── id, publisher, school_level, grade, subject, curriculum
└── UNIQUE(publisher, grade, subject, curriculum)
    │
    └─── units (단원)
         ├── id, textbook_id, main_unit_num, main_unit_name
         ├── sub_unit_num, sub_unit_name
         │
         └─── content_chunks (콘텐츠)
              ├── id, unit_id, page_number, raw_text, is_important
```

### 문제점
- **publisher 중심 설계**: 비상교육, 미래엔 등 출판사별로 데이터 분리
- **단원 기반 구성**: "1단원", "2단원" 등 교과서의 논리적 순서에 의존
- **시험 핵심 개념 체계 없음**: "이 개념은 3모에 자주 나온다"는 메타정보 부재
- **중복 데이터**: 출판사는 다르지만 같은 개념을 반복 저장

### 리팩토링 필요 사항
```sql
-- 새로운 테이블 추가 (제안)
exam_concepts (시험 핵심 개념)
├── id, exam_type (고1_3월_전국연합), subject (물리/화학/생명과학/지구과학)
├── concept_name, importance_level (A/B/C)
├── core_reason, test_patterns, common_mistakes

exam_problems (기출 문제)
├── id, exam_year, exam_month, subject, problem_type
├── related_concept_ids[], solution_explanation

concept_mapping (개념 간 연관도)
├── concept_id1, concept_id2, relationship_type
```

---

## 2️⃣ 프론트엔드 입력 흐름

### 📊 현재 흐름도

#### A. 관리자 흐름 (AdminCollect.tsx)
```
AdminCollect.tsx
├─ 1️⃣ 기본 정보 입력
│  ├─ 출판사 (publisher) ──────────────→ textbooks 테이블
│  ├─ 학년 (grade) ───────────────────→ 1학년/2학년/3학년
│  ├─ 과목 (subject) ────────────────→ "과학", "역사" 등
│  │
├─ 2️⃣ AI 주도 콘텐츠 생성
│  ├─ generateTextbookDraft() [Groq LLama]
│  │  └─ "출판사/과목/학년/단원명" → 교과서 본문 초안 생성
│  │
│  ├─ refineTextbookDraft() [Groq Llama]
│  │  └─ 기존 본문 + 추가 요청 → 보충 콘텐츠 생성
│  │
├─ 3️⃣ 수동 입력
│  ├─ 단원 제목 (unitTitle) ─────→ units 테이블
│  ├─ 본문 내용 (content) ──────→ content_chunks 테이블
│  └─ 추가/수정 내용 연결
│
└─ 4️⃣ 저장 (handleSave)
   ├─ textbooks 확인/생성
   ├─ units 확인/생성
   └─ content_chunks 삽입
```

**코드 위치**: `pages/AdminCollect.tsx` (342줄)
- Line 40-48: AI 생성 버튼 및 상태 관리
- Line 91-147: 저장 로직 (textbook → unit → content_chunks)

#### B. 사용자 흐름 (Dashboard.tsx in App.tsx)
```
Dashboard
├─ 1️⃣ 학년 선택
│  └─ 1학년 / 2학년 / 3학년
│
├─ 2️⃣ 출판사 선택 또는 입력
│  ├─ 사전정의 목록 [미래엔, 비상교육, 동아출판, ...]
│  └─ 또는 직접 입력 (자유 텍스트)
│
├─ 3️⃣ 과목명 + 학습 범위 입력
│  ├─ 과목: "통합과학", "사회 1"
│  └─ 학습 범위: "2. 물질의 규칙성과 결합" (대단원 호칭)
│
├─ 4️⃣ handleSubmit()
│  └─ getStudyGuide(subject, range, schoolLevel, grade, publisher)
│     ├─ DB 쿼리: content_chunks + units + textbooks JOIN
│     ├─ Groq API 호출 (systemPrompt + userPrompt)
│     └─ JSON 응답: sections[], keywords[], examPoints[]
│
└─ 5️⃣ AI 채팅 세션
   └─ createStudyChat() + 다중 메시지 교환
```

**코드 위치**: `App.tsx` (531줄)
- Line 130-150: 입력 폼 (출판사, 과목, 범위)
- Line 165-186: handleSubmit() - AI 분석 요청
- Line 200-220: 채팅 인터페이스

---

## 3️⃣ AI 요약 로직 흐름

### 🤖 geminiService.ts 분석

#### A. 교과서 초안 생성 (generateTextbookDraft)
```typescript
generateTextbookDraft(publisher, subject, grade, unitTitle)
├─ Groq API 호출 (meta-llama/llama-4-scout-17b-16e-instruct)
├─ 프롬프트: "당신은 대한민국 2015 개정 교육과정 전문 집필가입니다..."
├─ 지침:
│  ├─ 1. 해당 대단원의 **모든 핵심 개념, 실험, 원리** 서술
│  ├─ 2. 중학생 수준의 교과서 문체 유지
│  ├─ 3. 소단원별 제목 붙여 전개
│  └─ 4. 출판사의 교과서 퀄리티로 작성
├─ 응답: 본문 텍스트 (≤8000 토큰)
└─ 에러 처리: 빈 응답, API 오류, 타임아웃
```

**코드 위치**: `services/geminiService.ts` (Line 8-65)

#### B. 핵심 가이드 생성 (getStudyGuide) ⭐ 핵심 로직
```typescript
getStudyGuide(subject, range, schoolLevel, grade, publisher)

📍 Step 1: DB에서 원문 수집 (RAG)
├─ content_chunks 쿼리
├─ 필터: publisher=입력값 AND grade=입력값 AND subject=입력값
├─ 범위 필터: units.title에서 range 관련 항목 추출
└─ 결과: textbookContext = [교과서 원문 데이터]

📍 Step 2: systemPrompt 구성 (Line 188-210)
├─ 핵심: "데이터 우선주의" - DB 원문이 일반 지식보다 우선
├─ 범위 해석: "1단원"="대단원" (중학교 교과서의 주 단위)
├─ 과목 엄격 구분: 물리/화학/생명과학/지구과학 명확화
├─ 분석 지시: "이중 분석 전략" (전수조사 + 시험 적중)
│  ├─ 백과사전식 초정밀 기술
│  ├─ 각 섹션 5~7문장 이상 서술
│  └─ 시험 빈출 포인트 강조 (isImportant: true)
└─ 최종: "반드시 JSON 형식으로만 응답"

📍 Step 3: userPrompt 구성 (Line 212-240)
├─ "[학년] [과목] [범위]를 전수 조사 방식으로 정리해줘"
├─ 조건:
│  ├─ 소단원의 **모든 개념, 정의, 원리** 누락 없이
│  ├─ 각 섹션 첫 문장에 핵심 결론(isImportant: true)
│  ├─ 뒤에 상세 설명 5문장 이상
│  └─ 기초부터 심화까지 모든 흐름
└─ JSON 스키마 명시: sections[], keywords[], examPoints[]

📍 Step 4: Groq API 호출
├─ Model: meta-llama/llama-4-scout-17b-16e-instruct
├─ response_format: { type: "json_object" }
├─ temperature: 0.3 (안정성 중시)
└─ 응답: SearchResult (sections[], keywords[], examPoints[])

📍 Step 5: 오류 처리
├─ 429/rate_limit: "RATE_LIMIT_EXCEEDED"
├─ isValid=false: "NOT_FOUND"
└─ 기타: "API_ERROR"
```

**코드 위치**: `services/geminiService.ts` (Line 170-300)

#### C. 학습 채팅 세션 (createStudyChat)
```typescript
createStudyChat(context)
├─ history 배열 초기화
├─ system 메시지: "당신은 학생 질문에 답변하는 학습 도우미입니다"
├─ 매 메시지마다:
│  ├─ history에 user 메시지 추가
│  ├─ Groq API 호출 (temperature: 0.7)
│  ├─ 응답 추가
│  └─ 클라이언트에 텍스트 반환
└─ 상태: 대화 맥락 유지
```

**코드 위치**: `services/geminiService.ts` (Line 310-337)

### 🔍 현재 방식의 한계
| 항목 | 현재 방식 | 문제점 |
|------|---------|-------|
| **입력 기준** | 교과서 단원 | 시험 개념 중심 아님 |
| **DB 조회** | publisher 기반 | 출판사 관계없이 같은 개념 반복 |
| **분석 범위** | "모든 개념" | 시험에 나올 확률 무시 |
| **메타정보** | 없음 | "이건 89% 출제 확률" 같은 데이터 없음 |
| **프롬프트** | 일반적 교과서 | 시험 출제 관점 부재 |

---

## 4️⃣ 리팩토링 수정 필요 파일 목록

### 📋 우선순위별 수정 계획

#### **P0 - 필수 변경 (아키텍처)**
```
1. types.ts
   ├─ Interface 추가:
   │  ├─ ExamConcept (핵심개념, 중요도, 출제빈도)
   │  ├─ TestPattern (자주 출제되는 유형)
   │  ├─ CommonMistake (자주 틀리는 포인트)
   │  └─ CalculationConcept (계산형 공식)
   └─ SearchResult 재설계 (시험 특화)

2. supabase_schema.sql
   ├─ 기존 테이블 유지 (호환성)
   ├─ 새 테이블 추가:
   │  ├─ exam_types (고1_3월_전국연합 등)
   │  ├─ exam_subjects (물리/화학/생명과학/지구과학)
   │  ├─ core_concepts (핵심개념 마스터)
   │  ├─ concept_metadata (중요도, 출제빈도, 함정요소)
   │  ├─ thinking_patterns (사고 유형)
   │  ├─ common_mistakes (자주 틀리는 포인트)
   │  ├─ calculation_concepts (계산형 개념)
   │  └─ data_interpretation_types (자료 해석 유형)
   └─ 마이그레이션 스크립트

3. supabase_rbac.sql
   ├─ 권한 단순화 (admin/user 유지)
   ├─ exam_concepts 테이블 권한 설정
   └─ 긴급 패치 제거 (일반화)
```

#### **P1 - UI/UX 변경**
```
4. pages/AdminCollect.tsx
   └─ 목표: 교과서 수집 UI → 시험 개념 입력 UI
   ├─ 이름 변경: AdminCollect → ExamConceptEditor
   ├─ 입력 필드 변경:
   │  ├─ 제거: publisher → 통일된 "보편 표준"만 사용
   │  ├─ 제거: unit 구조 → 직접 개념명 입력
   │  ├─ 유지: grade, subject (과목: 물리/화학/생명과학/지구과학)
   │  ├─ 추가: importance (A/B/C)
   │  ├─ 추가: thinking_patterns (복수)
   │  ├─ 추가: common_mistakes (복수)
   │  └─ 추가: calculation_concepts (공식 리스트)
   ├─ UI 섹션 재구성:
   │  ├─ 핵심 개념 정의
   │  ├─ 시험 출제 이유
   │  ├─ 함정 요소 입력
   │  ├─ 계산 공식 추가
   │  └─ 자료 해석 유형 선택
   └─ AI 생성 로직: "3모 중심" 프롬프트로 변경

5. App.tsx - Dashboard 재설계
   ├─ 목표: 교과서 요약 → 3모 시험 대비 가이드
   ├─ 입력 폼 변경:
   │  ├─ 제거: publisher 선택 UI
   │  ├─ 유지: grade, subject
   │  ├─ 변경: "학습 범위" → "분석할 개념" (프리텍스트 불릿)
   │  └─ 추가: 필터 (중요도, 출제빈도)
   ├─ 결과 표시:
   │  ├─ 핵심 개념 + 설명
   │  ├─ 자주 출제되는 유형
   │  ├─ 자주 틀리는 포인트
   │  └─ 계산형 문제 공식
   └─ 채팅: 시험 문제 풀이 중심
```

#### **P2 - 로직 변경**
```
6. services/geminiService.ts
   ├─ generateTextbookDraft()
   │  └─ 제거 또는 오버로드: "3모 개념 설명" 용도로 변경
   │
   ├─ getStudyGuide() - 완전 리팩토링
   │  ├─ DB 쿼리: exam_concepts 테이블에서 조회
   │  ├─ 필터: exam_type, subject, importance_level
   │  ├─ systemPrompt: "당신은 3월 전국연합 과학 출제자입니다..."
   │  ├─ 응답 스키마: SearchResult → ExamGuideResult
   │  │  ├─ core_concepts (중요도별)
   │  │  ├─ thinking_patterns (자주 출제되는 유형)
   │  │  ├─ common_mistakes (함정 분석)
   │  │  ├─ data_interpretation_types (그래프/표 해석)
   │  │  └─ calculation_concepts (공식 + 예제)
   │  └─ Grounding: exam_concepts 데이터 우선
   │
   └─ createStudyChat() - 미세 조정
      └─ system prompt: "당신은 3월 전국연합 과학 튜터입니다..."
```

#### **P3 - 유틸리티/보조**
```
7. contexts/AuthContext.tsx
   ├─ 긴급 패치 제거
   ├─ 권한 관리 간소화 (admin/user)
   └─ exam_concepts 테이블 접근 권한 설정

8. pages/Login.tsx, Signup.tsx
   └─ 변경 없음 (기존 인증 유지)

9. lib/supabase.ts
   └─ 변경 없음 (클라이언트 초기화만)

10. scripts/ (데이터 마이그레이션)
    ├─ autoCrawler.ts → 수정 또는 폐지
    │  └─ 목표: 기출 문제 크롤링으로 변경
    └─ crawlTextbook.ts → 수정
       └─ 목표: 시험 개념 DB 채우기로 변경
```

#### **P4 - 설정**
```
11. package.json
    └─ 변경 없음 (의존성 동일)

12. vite.config.ts, tsconfig.json
    └─ 변경 없음

13. vercel.json
    └─ 환경변수 재검토 필요
```

---

## 5️⃣ 변경 영향도 맵

```
┌─────────────────────────────────────────────┐
│     types.ts (Interface 재설계)              │
│  1. ExamConcept 추가                        │
│  2. SearchResult → ExamGuideResult          │
└────────┬────────────────────────────────────┘
         │
    ┌────┴────────────┬──────────────────────┐
    │                 │                      │
    ▼                 ▼                      ▼
┌──────────────┐  ┌──────────────┐  ┌─────────────────┐
│ supabase_    │  │ geminiService│  │ pages/Admin     │
│ schema.sql   │  │ .ts (90%)    │  │ Collect.tsx     │
│ (40%)        │  └──────────────┘  └─────────────────┘
└────┬─────────┘         │                   │
     │              ┌────┘              ┌────┘
     │              │                   │
     ▼              ▼                   ▼
  ⭐ Core      ⭐ High             * Medium
```

---

## 6️⃣ 마이그레이션 전략

### 단계별 구현
```
Phase 1: 데이터 모델 설계 (1-2일)
├─ types.ts 인터페이스 정의
├─ supabase_schema.sql 작성
└─ 무시: 기존 테이블 유지 (점진적 마이그레이션)

Phase 2: 백엔드 서비스 (2-3일)
├─ geminiService.ts 완전 리팩토링
├─ exam_concepts 테이블 DAL 작성
└─ Groq API 프롬프트 "3모 중심"으로 변경

Phase 3: 프론트엔드 UI (1-2일)
├─ AdminCollect.tsx → ExamConceptEditor로 재설계
├─ App.tsx Dashboard 필터 추가
└─ 입력 폼 구조 변경

Phase 4: 테스트 및 배포 (1-2일)
├─ 기존 교과서 데이터 유지성 테스트
├─ 새 exam_concepts 데이터 검증
└─ Vercel 배포
```

---

## 📌 결론

### 현재 문제
- **출판사 중심**: 같은 개념을 여러 출판사에서 반복 저장
- **단원 중심**: 시험의 실제 출제 패턴 무시
- **일반적 분석**: "모든 개념" 나열만 함

### 리팩토링의 이점
- ✅ **시험 특화**: 3월 전국연합 출제 패턴 반영
- ✅ **중복 제거**: 보편적 개념 1회 저장, 메타정보만 추가
- ✅ **정밀 대비**: "빈출 유형", "함정 요소", "자주 틀리는 점" 강조
- ✅ **확장 가능**: 다른 시험(수능, 모의고사) 적용 용이

### 핵심 수정 파일 (우선순위)
1. **types.ts** - 인터페이스
2. **supabase_schema.sql** - DB 테이블
3. **geminiService.ts** - AI 프롬프트 (90% 변경)
4. **pages/AdminCollect.tsx** - 입력 UI
5. **App.tsx** - Dashboard UI
