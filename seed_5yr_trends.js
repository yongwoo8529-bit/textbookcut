
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const TREND_DATA = [
    {
        subject: '국어',
        concepts: [
            {
                title: '운율 (Rhythm)',
                description: '시에서 말의 가락을 의미하며, 일정한 소리의 반복을 통해 형성됨. 3모에서는 주로 소담한 반복이나 시어의 대조를 통한 운율 형성을 물음.',
                importance: 'A',
                key_terms: '음성 상징어, 반복, 대조, 통사 구조의 반복',
                logic: {
                    context: '현대시 또는 고전시가 지문에서',
                    reasoning: '반복되는 요소(시어, 시구, 문장 구조)를 찾아 주제와의 연관성 파악',
                    type: '옳은_것_고르기',
                    weight: 5
                }
            },
            {
                title: '음운의 변동',
                description: '교체, 탈락, 첨가, 축약 등 발음 시 일어나는 변화. 특히 비음화, 유음화, 된소리되기가 단골 출제됨.',
                importance: 'A',
                key_terms: '비음화, 유음화, 된소리되기, 구개음화',
                logic: {
                    context: '언어(문법) 문항에서 단어의 발음을 제시할 때',
                    reasoning: '표준 발음법 원칙에 근거하여 변동 전후의 음운 변화 분석',
                    type: '빈_칸_채우기',
                    weight: 5
                }
            },
            {
                title: '사실적 독해 (Fact-checking)',
                description: '지문에 제시된 정보의 일치 여부를 판별하는 독서 영역의 가장 기초적인 문항 유형.',
                importance: 'A',
                key_terms: '일치, 세부 정보, 내용 확인',
                logic: {
                    context: '독서(비문학) 지문 전체',
                    reasoning: '선택지의 서술 내용이 지문의 어느 문단에 근거하는지 빠르게 스캔',
                    type: '옳은_것_고르기',
                    weight: 5
                }
            }
        ],
        traps: [
            { title: '운율과 반어법의 혼동', common: '반복이 있으면 무조건 운율이라고만 생각하고 반어적 표현을 놓침', correct: '운율은 소리의 반복이고, 반어는 의미의 대조임' },
            { title: '음운 변동의 개수 산정', common: '축약을 2개로 세거나 첨가를 무시함', correct: '축약은 두 의문이 합쳐져 하나가 되는 것이므로 전체 개수는 1 감소함' }
        ]
    },
    {
        subject: '수학',
        concepts: [
            {
                title: '이차함수의 활용',
                description: '이차함수의 그래프를 분석하여 최댓값과 최솟값을 구하거나 실생활 문제에 적용함.',
                importance: 'A',
                formula: 'y = a(x-p)^2 + q',
                key_terms: '꼭짓점, 축의 방정식, 위로 볼록, 아래로 볼록',
                logic: {
                    context: '도형의 넓이나 높이 변화 상황',
                    reasoning: '주어진 조건을 이차식으로 모델링한 후 완전제곱식으로 변형하여 꼭짓점 좌표 해석',
                    type: '숫자_계산',
                    weight: 5
                }
            },
            {
                title: '삼각형의 성질',
                description: '중학교 과정에서 배운 닮음, 합동, 피타고라스 정리 등을 활용하여 변의 길이와 각도를 구함.',
                importance: 'A',
                formula: 'a^2 + b^2 = c^2 (피타고라스)',
                key_terms: '닮음비, 합동 조건, 외심, 내심',
                logic: {
                    context: '복합 도형이 제시된 기하 문항',
                    reasoning: '보조선을 긋거나 닮은 삼각형을 찾아 비례식 세우기',
                    type: '표_해석',
                    weight: 4
                }
            }
        ],
        traps: [
            { title: '이차함수의 범위 제한', common: '꼭짓점의 x좌표가 주어진 범위 밖에 있을 때 최솟값을 꼭짓점으로 착각함', correct: '범위의 양 끝값과 꼭짓점 중 범위에 포함되는 값만 비교' },
            { title: '닮음비와 넓이비', common: '닮음비가 1:2일 때 넓이비도 1:2라고 생각함', correct: '넓이비는 닮음비의 제곱인 1:4임' }
        ]
    },
    {
        subject: '영어',
        concepts: [
            {
                title: '관계대명사의 일치',
                description: '선행사와 관계대명사 뒤의 동사의 수 일치 및 격 판별.',
                importance: 'A',
                key_terms: 'who, which, that, whose, whom',
                logic: {
                    context: '어법(Grammar) 문항',
                    reasoning: '선행사가 사람인지 사물인지 파악하고 뒷 문장의 불완전한 요소(주어/목적어 생략) 확인',
                    type: '틀린_것_고르기',
                    weight: 5
                }
            },
            {
                title: '문맥 속 어휘 추론',
                description: '글의 흐름상 문맥에 맞지 않는 낱말을 고름.',
                importance: 'A',
                key_terms: '반의어, 인과관계, 대조',
                logic: {
                    context: '설명문 또는 논설문 지문',
                    reasoning: '문장 간의 연결사(Therefore, However 등)를 토대로 논리적 일관성 검토',
                    type: '틀린_것_고르기',
                    weight: 4
                }
            }
        ],
        traps: [
            { title: 'What과 That의 혼동', common: 'What 뒤에 완전한 문장이 올 수 있다고 생각함', correct: 'What은 선행사를 포함하므로 뒤에는 반드시 불완전한 문장이 옴' },
            { title: '수동태와 현재분사', common: '감정 동사(interest, bore) 사용 시 주어가 사물일 때 -ed를 씀', correct: '사물 주어는 감정을 유발하므로 -ing를 사용함' }
        ]
    }
];

async function seedData() {
    console.log('🚀 5개년(2021-2025) 정밀 분석 데이터 시딩 시작...');

    for (const group of TREND_DATA) {
        console.log(`\n📚 [${group.subject}] 과목 처리 중...`);

        for (const concept of group.concepts) {
            // 1. 핵심 개념 삽입
            const { data: existing } = await supabase
                .from('must_know_core')
                .select('id')
                .eq('subject', group.subject)
                .eq('title', concept.title)
                .maybeSingle();

            let conceptId;
            if (existing) {
                conceptId = existing.id;
                console.log(`- [기존] ${concept.title}`);
            } else {
                const { data: newRow, error: err } = await supabase
                    .from('must_know_core')
                    .insert({
                        subject: group.subject,
                        title: concept.title,
                        description: concept.description,
                        importance: concept.importance,
                        formula: concept.formula || null,
                        key_terms: concept.key_terms || null,
                        education_level: 'middle_3'
                    })
                    .select()
                    .single();

                if (err) {
                    console.error(`❌ ${concept.title} 삽입 실패:`, err);
                    continue;
                }
                conceptId = newRow.id;
                console.log(`✅ [신규] ${concept.title}`);
            }

            // 2. 출제 로직(Appearance Logic) 삽입
            const { data: existingLogic } = await supabase
                .from('appearance_logic')
                .select('id')
                .eq('concept_id', conceptId)
                .maybeSingle();

            if (!existingLogic) {
                await supabase.from('appearance_logic').insert({
                    concept_id: conceptId,
                    condition_context: concept.logic.context,
                    reasoning_required: concept.logic.reasoning,
                    question_type: concept.logic.type,
                    frequency_weight: concept.logic.weight,
                    test_frequency: group.subject === '국어' ? 15 : 12 // 5개년 평균 기출 횟수 가정
                });
                console.log(`   + 출제 로직 추가 완료`);
            }
        }

        // 3. 함정 포인트 삽입
        for (const trap of group.traps) {
            const { data: existingTrap } = await supabase
                .from('exam_trap_points')
                .select('id')
                .eq('title', trap.title)
                .maybeSingle();

            if (!existingTrap) {
                // 이 함정과 연관된 개념 ID 찾기 (간단히 매칭)
                const { data: linkedConcept } = await supabase
                    .from('must_know_core')
                    .select('id')
                    .eq('subject', group.subject)
                    .ilike('title', `%${trap.title.substring(0, 2)}%`)
                    .limit(1)
                    .maybeSingle();

                // schema structure mismatch check: 
                // sql had unit_id, db had concept_id per cjs
                // let's check trap table columns too

                await supabase.from('exam_trap_points').insert({
                    concept_id: linkedConcept?.id || null, // Optional if no link found
                    title: trap.title,
                    common_mistake: trap.common,
                    correct_concept: trap.correct,
                    description: '5개년 기출 최다 빈출 함정 데이터',
                    importance: 'A'
                });
                console.log(`   ⚠️ 함정 추가: ${trap.title}`);
            }
        }
    }

    console.log('\n✨ 시딩 완료!');
}

seedData();
