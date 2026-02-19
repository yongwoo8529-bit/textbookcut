# AI 응답 규칙 (고1 3월 전국연합 모의고사 대비)

## 목표
고1 3월 전국연합 모의고사 과학 영역 대비 학습 자료로서 **중학교 범위의 핵심 개념**과 **자주 출제되는 유형**을 효과적으로 정리

---

## 1. 데이터 필터링 규칙

### 1.1 must_know_core (핵심 개념)
**조건**: `education_level IN ('middle_1', 'middle_2', 'middle_3')`

- 중학교 1학년, 2학년, 3학년 범위만 포함
- 고등학교 개념(`high_1_basic`, `high_1_advanced`)은 **제외**
- 예외: 중학교 개념과의 연계설명이 필요한 경우에만 보조 자료로 활용

### 1.2 appearance_logic (출제 상황)

#### frequency_weight별 포함 규칙

| weight | 포함 여부 | 처리 방식 | 설명 |
|--------|---------|---------|------|
| **5** | 🔥 필수 | 상세 설명 + 예시 | 거의 항상 출제됨 |
| **4** | ✅ 필수 | 핵심만 정리 + 간단 예시 | 자주 출제됨 |
| **3** | 선택 | A등급과 연결시만 | 중간 정도 출제 |
| **1~2** | ❌ 제외 | importance=A만 간단히 언급 | 드물게 출제 |

**정렬 기준:**
1. 1순위: `frequency_weight DESC` (5 → 4 → 3 → 1)
2. 2순위: `importance DESC` (A → B → C)

---

## 2. 출력 형식 규칙

### 2.1 섹션 구성 (필수)

```
┌─────────────────────────────────────────┐
│  [수정단원 제목]                           │
├─────────────────────────────────────────┤
│ 🔥 자주 출제되는 유형                      │
│ (frequency_weight >= 4인 항목들)          │
│                                         │
│ 📚 핵심 개념                             │
│ (must_know_core 항목들)                   │
│                                         │
│ ⚠️ 주의: 자주 틀리는 포인트              │
│ (exam_trap_points 항목들)                │
│                                         │
│ 📊 그래프/표 해석                        │
│ (graph_patterns 항목들)                   │
│                                         │
│ 🔢 계산 문제                             │
│ (calculation_focus 항목들)                │
└─────────────────────────────────────────┘
```

### 2.2 "🔥 자주 출제되는 유형" 섹션

**위치**: 맨 상단 (가장 먼저 배치)

**내용**: appearance_logic 데이터 중 `frequency_weight >= 4`인 항목들

**구성**:
```
🔥 자주 출제되는 유형

[frequency_weight = 5 항목들]
- 제목: ...
- 상황(condition_context): ...
- 판단 유형(reasoning_required): ...
- 문제 형식(question_type): ...
- 상세 설명
- 최근 3년 기출 횟수: N회
- 예시: [구체적인 예시 포함]

[frequency_weight = 4 항목들]
- 제목: ...
- 핵심 내용 (간단히)
- 예시: [간단한 예시]
```

---

## 3. 중요도별 처리 규칙

### 3.1 importance = 'A' (반드시 출제 가능)
- **항상 포함**
- 모든 frequency_weight에서 우선 배치
- 상세 설명 + 다양한 출제 패턴 설명

### 3.2 importance = 'B' (자주 출제)
- frequency_weight 4 이상: 포함
- frequency_weight 3: 선택적 포함
- frequency_weight 1~2: 제외

### 3.3 importance = 'C' (가끔 출제)
- frequency_weight 5~4: 포함
- frequency_weight 3 이하: 제외

---

## 4. 연관 관계 활용 규칙

### 4.1 linked_concepts 활용
- 같은 문제에서 자주 함께 출제되는 개념끼리 그룹화
- "함께 학습하면 좋은 개념"으로 표시
- 예: "[개념A]와 함께 그룹화: [개념B], [개념C]"

### 4.2 related_concepts 활용
- 선행 학습이 필요한 개념 표시
- 심화 학습이 가능한 개념 표시

---

## 5. 쿼리 패턴 (개발자용)

### 5.1 기본 조회
```sql
SELECT mkc.* FROM must_know_core mkc
WHERE mkc.education_level IN ('middle_1', 'middle_2', 'middle_3')
AND mkc.unit_id = <unit_id>;
```

### 5.2 출제 유형 포함
```sql
SELECT 
  mkc.*,
  al.*
FROM must_know_core mkc
LEFT JOIN appearance_logic al ON mkc.id = al.concept_id
WHERE mkc.education_level IN ('middle_1', 'middle_2', 'middle_3')
AND (al.frequency_weight >= 4 OR al.frequency_weight IS NULL)
ORDER BY al.frequency_weight DESC, mkc.importance DESC;
```

### 5.3 함정 포인트 포함
```sql
SELECT 
  mkc.title,
  (SELECT array_agg(row_to_json(ep)) FROM exam_trap_points ep 
   WHERE ep.unit_id = mkc.unit_id) as traps
FROM must_know_core mkc
WHERE mkc.education_level IN ('middle_1', 'middle_2', 'middle_3');
```

---

## 6. AI 프롬프트 가이드라인

### 6.1 systemPrompt에 추가할 내용
```
- 고1 3월 전국연합 모의고사는 중학교 교육과정 범위를 벗어나지 않습니다.
- 반드시 education_level이 'middle_1', 'middle_2', 'middle_3'인 개념만 사용하세요.
- frequency_weight가 높을수록 시험에 자주 나오는 유형입니다.
- 출력 시 "🔥 자주 출제되는 유형" 섹션을 맨 먼저 배치하고, 내림차순(5→4→3)으로 정렬하세요.
```

### 6.2 appearance_logic 활용 팁
- frequency_weight = 5: "거의 항상 출제, 반드시 숙지"
- frequency_weight = 4: "시험에 자주 나옴, 꼭 알아두기"
- frequency_weight = 3: "추가 학습 시 함께 보면 좋음"
- frequency_weight = 1~2: "심화 학습용, 기본은 건너뛰어도 무방"

---

## 7. 예시 응답 구조

### 물리 - 1단원 "운동과 힘"

```
🔥 자주 출제되는 유형 (빈도 조사 결과)

1. 가속도 방향 판단 (frequency_weight: 5)
   - 상황: 물체가 정지해있고 외력이 작용할 때
   - 문제 형: 옳은_것_고르기
   - 최근 3년: 8회 출제
   
   상세 설명:
   뉴턴의 제2법칙(F=ma)에서 알짜힘의 방향 = 가속도의 방향입니다.
   [상세한 설명...]
   
   예시:
   - 2024년 모의고사 18번: 마찰력과 응력 합성
   - 2023년 모의고사 15번: 경사면에서의 가속도

2. 운동 그래프 해석 (frequency_weight: 4)
   - 상황: v-t 그래프가 주어진 경우
   - [핵심만 정리...]

📚 핵심 개념
- 속도와 속력
- 가속도
- [나머지 항목들...]

⚠️ 주의: 자주 틀리는 포인트
- 가속도 0이면 힘이 0이라고 착각
- [나머지 항목들...]
```

---

## 8. 검증 체크리스트

출력 전 다음을 반드시 확인:

- [ ] `education_level`이 `middle_1/2/3`만 포함되었는가?
- [ ] "🔥 자주 출제되는 유형" 섹션이 맨 상단에 있는가?
- [ ] frequency_weight 5 → 4 → 3 순서로 정렬되었는가?
- [ ] frequency_weight = 1~2 항목은 importance=A를 제외하고 제외되었는가?
- [ ] 각 섹션(출제유형, 핵심개념, 함정, 그래프, 계산)이 명확히 구분되었는가?
- [ ] frequency_weight >= 4인 항목에 상세 설명/예시가 포함되었는가?

---

## 9. 버전 관리

| 버전 | 날짜 | 변경 사항 |
|------|------|---------|
| 1.0 | 2026-02-13 | 초안 작성 |

