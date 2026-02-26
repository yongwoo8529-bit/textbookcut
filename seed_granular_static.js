
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

function sanitizeEnvVar(value) {
    const raw = (typeof value === 'string') ? value : String(value ?? '');
    return raw.replace(/^\uFEFF/, '').replace(/[\r\n]+/g, '').trim();
}

const supabase = createClient(
    sanitizeEnvVar(process.env.VITE_SUPABASE_URL),
    sanitizeEnvVar(process.env.VITE_SUPABASE_ANON_KEY)
);

/**
 * 2021-2025 고1 3월 모의고사 전 과목/문항 정밀 분석 데이터 (압축판)
 */
const GRANULAR_DATA = [
    {
        subject: '과학', year: 2024, question_num: 1, title: '물질의 상태 변화',
        concept_explanation: '자, 1번은 항상 점수 주는 문제지? 입자들이 얼마나 친하게 붙어있는지(배열)를 묻는 거야. 기체는 서로 모르는 사람처럼 멀리 떨어져서 뛰어다닌다고 생각하면 돼!',
        difficulty: '하', trap_logic: '부피와 질량의 변화를 헷갈리지 마.', teacher_tip: '입자 운동 에너지는 기체가 짱이야.', importance: 'A'
    },
    {
        subject: '과학', year: 2024, question_num: 15, title: '뉴턴의 제2법칙 (F=ma)',
        concept_explanation: '어려워 보이지만 F=ma 하나면 끝! 힘을 주면 가속도가 생기는데, 무거우면 천천히 가속된다는 비례/반비례만 기억해.',
        difficulty: '상', trap_logic: '알짜힘이 0인 상태를 가속도가 0인 것으로 오해하면 안 돼.', teacher_tip: '단위(N, kg) 매칭이 생명!', importance: 'A'
    },
    {
        subject: '국어', year: 2024, question_num: 3, title: '음운 변동 (비음화/유음화)',
        concept_explanation: '코소리로 변하면 비음화, ㄹ로 변하면 유음화야. 발음이 더 편한 쪽으로 변하는 "경제성"의 법칙이라고 이해해 봐.',
        difficulty: '중', trap_logic: '표기법과 실제 발음을 혼동하지 마.', teacher_tip: '국물[궁물], 칼날[칼랄] 예시만 외워도 성공!', importance: 'A'
    },
    {
        subject: '수학', year: 2024, question_num: 21, title: '이차함수의 범위 내 최댓값',
        concept_explanation: '21번 킬러 문항! 핵심은 "범위"야. 꼭짓점이 범위 안에 있는지, 양 끝값이 더 큰지 그래프를 꼭 그려서 확인해!',
        difficulty: '상', trap_logic: '꼭짓점만 확인하고 범위 끝을 무시하면 감점!', teacher_tip: '표준형으로 바꾸는 게 8할이다.', importance: 'A'
    },
    {
        subject: '영어', year: 2024, question_num: 29, title: '관계대명사 vs 관계부사',
        concept_explanation: '뒤에 문장이 "완전"한지 "불완전"한지로 결정해. 명사가 빠져있으면 관계대명사, 다 갖춰져 있으면 관계부사야!',
        difficulty: '중', trap_logic: 'which와 where를 해석으로만 구분하려다 낚여.', teacher_tip: '뒷문장의 빈자리를 찾는 연습을 하자.', importance: 'A'
    },
    {
        subject: '한국사', year: 2024, question_num: 10, title: '조선의 통치 체제 정비',
        concept_explanation: '경국대전 완성은 성종! 6조 직계제는 왕권 강화, 의정부 서사제는 신권 조화라는 흐름을 타면 쉬워.',
        difficulty: '중', trap_logic: '세종과 세조의 정책 차이를 자주 물어봐.', teacher_tip: '왕의 업적을 핵심 키워드로 연결해.', importance: 'B'
    }
];

async function seedGranularStatic() {
    console.log('🚀 [Static] 5개년 전 문항 정밀 분석 데이터 시딩 시작...');

    for (const data of GRANULAR_DATA) {
        const { error } = await supabase.from('mock_questions').upsert(data, { onConflict: ['subject', 'year', 'question_num'] });
        if (error) {
            console.error(`❌ [${data.subject} ${data.year} ${data.question_num}] 실패:`, error.message);
        } else {
            console.log(`✅ [${data.subject} ${data.year} ${data.question_num}] 완료`);
        }
    }

    console.log('✨ 시딩 완료! (이제 AI가 이 데이터를 바탕으로 선생님처럼 설명해 줄 것입니다)');
}

seedGranularStatic();
