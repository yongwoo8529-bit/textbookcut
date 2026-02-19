
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// --- TREND DATA 2021-2025 ---

const KOREAN_DATA = {
    subject: '국어',
    concepts: [
        { title: '어간과 어미', description: '용언이 활용할 때 변하지 않는 부분(어간)과 변하는 부분(어미)의 결합 원리.', importance: 'A' },
        { title: '체언과 조사', description: '명사, 대명사, 수사(체언) 뒤에 붙어 문법적 관계를 나타내는 조사.', importance: 'A' },
        { title: '음운 변동', description: '교체, 탈락, 첨가, 축약 등 발음 시 일어나는 변화.', importance: 'A' },
        { title: '문장 성분', description: '주어, 서술어, 목적어, 보어 등 문장을 구성하는 요소들.', importance: 'A' },
        { title: '비문학 독해(인문)', description: '철학, 역사 등 인문 사회 지문의 논리적 구조 분석.', importance: 'B' }
    ],
    traps: [
        { title: '용언의 불규칙 활용', mistake: '어간과 어미의 구분을 고정적으로만 생각함', correct: '활용 시 탈락하거나 변하는 불규칙 사례(ㄹ 탈락 등) 주의' },
        { title: '조사의 생략', mistake: '조사가 생략된 문장에서 성분을 오판함', correct: '생략된 격 조사를 넣어 의미 파악' }
    ]
};

const MATH_DATA = {
    subject: '수학',
    concepts: [
        { title: '다항식의 연산', description: '다항식의 덧셈, 뺄셈, 곱셈 및 곱셈 공식의 활용.', importance: 'A' },
        { title: '인수분해', description: '다항식을 일차식이나 이차식의 곱으로 분해하는 과정.', importance: 'A' },
        { title: '이차방정식과 판별식', description: '이차방정식 실근의 개수를 판별하는 D = b^2 - 4ac 사용법.', importance: 'A' },
        { title: '이차함수의 그래프', description: '꼭짓점과 축의 방정식을 이용한 위치 관계 파악.', importance: 'A' }
    ],
    traps: [
        { title: '이차함수의 범위 제한', mistake: '전체 범위에서 최솟값을 구함', correct: '제한된 범위(A <= x <= B) 내에서 최댓값/최솟값 확인' },
        { title: '판별식 부호', mistake: '실근을 가질 조건을 D > 0만 생각함', correct: '서로 다른 두 실근은 D > 0, 중근 포함 시 D >= 0' }
    ]
};

const ENGLISH_DATA = {
    subject: '영어',
    concepts: [
        { title: '관계대명사의 활용', description: 'Who, Which, That을 이용한 명사 수식 및 격의 구분.', importance: 'A' },
        { title: '현재완료 시제', description: 'Have + p.p. 형태의 완료, 경험, 계속, 결과 용법.', importance: 'A' },
        { title: '수동태의 구조', description: 'Be + p.p. 형태를 통한 행위 대상 강조 문장.', importance: 'A' }
    ],
    traps: [
        { title: '사역동사의 목적보어', mistake: 'Make 뒤에 to-부정사를 사용함', correct: 'Make/Have/Let 뒤에는 동사원형 사용' }
    ]
};

const HISTORY_DATA = {
    subject: '한국사',
    concepts: [
        { title: '고려의 건국과 정비', description: '918년 태조 왕건의 건국과 광종, 성종의 체제 정비.', importance: 'A' },
        { title: '조선의 통치 체제', description: '6조 직계제와 의정부 서사제, 경국대전 완성.', importance: 'A' },
        { title: '강화도 조약', description: '1876년 일본과 체결한 최초의 근대적 불평등 조약.', importance: 'A' },
        { title: '3.1 운동', description: '1919년 전 민족적 독립 운동과 대한민국 임시 정부 수립.', importance: 'A' }
    ],
    traps: [
        { title: '개항기 개혁의 선후 관계', mistake: '갑신정변과 갑오개혁의 순서를 혼동함', correct: '1884 갑신정변 -> 1894 갑오개혁 순서 기억' }
    ]
};

const SOCIAL_DATA = {
    subject: '사회',
    concepts: [
        { title: '기본권의 종류', description: '자유권, 평등권, 참정권, 사회권, 청구권의 특징.', importance: 'A' },
        { title: '민주 정치의 원리', description: '국민 주권, 권력 분립, 법치주의의 원리.', importance: 'A' },
        { title: '시장 경제의 원리', description: '수요와 공급의 법칙 및 가격 결정 메커니즘.', importance: 'A' }
    ],
    traps: [
        { title: '사회권의 성격', mistake: '사회권을 소극적 권리로 오해함', correct: '국가에 대한 적극적 요구권임(복지)' }
    ]
};

const SUBJECTS_LIST = [KOREAN_DATA, MATH_DATA, ENGLISH_DATA, HISTORY_DATA, SOCIAL_DATA];

async function seed() {
    const envPath = path.join(process.cwd(), '.env');
    const envText = fs.readFileSync(envPath, 'utf8');
    const url = envText.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
    const key = envText.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim().replace(/\s+/g, '');

    const supabase = createClient(url, key);

    console.log('Seeding 5 additional subjects...');

    for (const sData of SUBJECTS_LIST) {
        console.log(`Processing ${sData.subject}...`);
        for (const concept of sData.concepts) {
            // 1. Double check before insert
            const { data: existing } = await supabase.from('must_know_core')
                .select('id').eq('title', concept.title).eq('subject', sData.subject).maybeSingle();

            let conceptId;
            if (existing) {
                conceptId = existing.id;
                console.log(`- Concept ${concept.title} already exists. Skipping core insert.`);
            } else {
                const { data: cRow, error: cErr } = await supabase.from('must_know_core').insert({
                    title: concept.title,
                    subject: sData.subject,
                    description: concept.description,
                    importance: concept.importance,
                    education_level: 'middle_3'
                }).select().single();

                if (cErr) {
                    console.error(`- Error inserting ${concept.title}:`, cErr);
                    continue;
                }
                conceptId = cRow.id;
                console.log(`+ Inserted concept ${concept.title}`);
            }

            // 2. Logic (Direct insert if not exists)
            const { data: eLogic } = await supabase.from('appearance_logic').select('id').eq('concept_id', conceptId).maybeSingle();
            if (!eLogic) {
                await supabase.from('appearance_logic').insert({
                    concept_id: conceptId,
                    condition_context: `${sData.subject} 영역 고득점을 위한 필수 문항 상황`,
                    reasoning_required: `개념의 정의를 상황에 대입하여 판단`,
                    question_type: `객관식 / 5지 선다`,
                    frequency_weight: concept.importance === 'A' ? 5 : 4,
                    test_frequency: concept.importance === 'A' ? 12 : 5
                });
            }

            // 3. Traps
            const relatedTraps = sData.traps.filter(t => t.title.includes(concept.title.slice(0, 2)));
            for (const trap of relatedTraps) {
                const { data: eTrap } = await supabase.from('exam_trap_points').select('id').eq('concept_id', conceptId).eq('common_mistake', trap.mistake).maybeSingle();
                if (!eTrap) {
                    await supabase.from('exam_trap_points').insert({
                        concept_id: conceptId,
                        title: trap.title,
                        common_mistake: trap.mistake,
                        correct_concept: trap.correct,
                        explanation: '5개년 기출 분석 결과 다수 발견된 함정 포인트입니다.'
                    });
                }
            }
        }
    }
    console.log('Seeding Done!');
}

seed();
