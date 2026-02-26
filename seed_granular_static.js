
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
        concept_explanation: '자, 음운 변동은 말이야, 우리가 말을 할 때 입을 더 편하게 하려는 "경제성" 때문에 일어나. "국물"을 [궁물]로 발음하는 건 뒤에 나오는 "ㅁ" 소리를 닮아가기 때문이지. 이걸 비음화라고 해. 유음화는 "ㄴ"이 "ㄹ"을 만나서 [ㄹ]로 변하는 건데, "칼날"이 [칼랄]이 되는 게 대표적이야. 시험에서는 이 두 가지가 섞여서 나오거나, 구개음화랑 헷갈리게 나오니까 꼭 발음해보면서 원리를 파악해야 해!',
        difficulty: '중', trap_logic: '표기법대로 읽는 습관 때문에 실제 발음 변화를 놓칠 수 있어.', teacher_tip: '입천장을 울리는 소리인지, 코로 나오는 소리인지 직접 소리 내며 느껴봐!', importance: 'A'
    },
    {
        subject: '국어', year: 2023, question_num: 11, title: '체언과 조사의 특징',
        concept_explanation: '국어의 중심, 체언(명사, 대명사, 수사)이야! 체언은 혼자서도 잘 놀지만, 문장에서 제 역할을 하려면 "조사"라는 친구가 꼭 붙어야 해. 주격 조사 "이/가"가 붙으면 주어가 되고, 목적격 조사 "을/를"이 붙으면 목적어가 되지. "나는 밥을 먹었다"에서 "나"와 "밥"은 체언이고, "는"과 "을"은 조사라는 걸 바로 구분할 수 있어야 해. 특히 보조사 "은/는"이 주격 조사랑 어떻게 다른지 묻는 문제가 단골이야.',
        difficulty: '중', trap_logic: '보조사(은, 는, 도, 만)를 주격 조사로만 착각하면 성분 분석에서 틀릴 수 있어.', teacher_tip: '조사는 앞말에 붙여 쓴다는 것, 그리고 생략될 수도 있다는 점을 기억하자!', importance: 'A'
    },
    {
        subject: '국어', year: 2022, question_num: 15, title: '용언의 활용 (어간과 어미)',
        concept_explanation: '자, 용언(동사, 형용사)의 활용이야! "먹다, 먹고, 먹으니"처럼 변하지 않는 부분인 "어간(먹-)"과 자꾸 바뀌는 꼬리인 "어미(-다, -고, -으니)"를 나누는 게 핵심이야. 특히 "ㄹ 탈락"이나 "ㅡ 탈락"처럼 모양이 살짝 변하는 불규칙 활용을 조심해야 해. "만들다"가 "만드니"가 될 때 "ㄹ"이 어디 갔는지 찾아내는 게 시험의 묘미지!',
        difficulty: '상', trap_logic: '기본형을 먼저 생각하지 않고 변한 형태만 보면 어간을 잘못 찾을 수 있어.', teacher_tip: '무조건 "-다"를 붙여서 기본형부터 만든 다음, 변하지 않는 부분을 찾아봐!', importance: 'A'
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
        subject: '국어', year: 2023, question_num: 24, title: '시적 화자의 태도와 정서',
        concept_explanation: '시를 읽을 때 가장 먼저 해야 할 건 "지금 누가 어떤 상황에서 무슨 말을 하는가"를 찾는 거야. 이걸 "시적 화자"라고 하지. 2023년 24번 지문 같은 고전 시가에서는 현대어와 달라서 감정을 찾기 힘들 수 있어. 하지만 "슬프다", "반갑다" 같은 직접적인 단어뿐만 아니라, "임이 그리워 잠 못 든다" 같은 행동을 통해서도 주관적 정서를 파악할 수 있지. 화자의 태도는 예찬적(칭찬), 낙관적(긍정), 비판적(부정) 등으로 나뉘니까 맥락을 보고 판단해 봐!',
        difficulty: '중', trap_logic: '글자 그대로의 뜻만 보고 반어법이나 역설법 속에 숨겨진 진짜 화자의 의도를 놓치기 쉬워.', teacher_tip: '시의 제목과 마지막 행을 먼저 봐! 거기에 화자의 결론이 담겨있을 확률이 높거든.', importance: 'A'
    },
    {
        subject: '국어', year: 2022, question_num: 31, title: '비문학 독서 - 인과 관계 추론',
        concept_explanation: '자, 비문학 지문에서 가장 무서운 게 뭔 줄 아니? 바로 "그래서 결과가 어떻게 되는데?"를 묻는 인과 관계야. 과학이나 경제 지문에서는 어떤 조건이 변할 때 결과가 어떻게 바뀌는지 화살표(↑, ↓)를 그려가며 읽어야 해. 예를 들어 "금리가 오르면 소비가 줄어든다"는 문장이 있다면, 2022년 31번 문제처럼 그 반대 상황(금리가 내릴 때)을 보기에 놓고 낚시를 하기도 해. 인과 관계의 선후를 뒤집어 놓는 함정을 조심해야 해!',
        difficulty: '상', trap_logic: 'A가 B의 원인인데, 보기에서는 B가 A의 원인이라고 교묘하게 바꿔놓는 선지에 주의!', teacher_tip: '지문에 "때문에", "까닭에", "말미암아" 같은 접속어가 나오면 무조건 밑줄 긋고 화살표 표시를 해!', importance: 'A'
    },
    {
        subject: '수학', year: 2023, question_num: 15, title: '확률 - 여사건의 활용',
        concept_explanation: '확률 문제를 풀 때 "적어도 하나는 ~일 확률"이라는 말이 나오면 100% 여사건이야! 전체(1)에서 정반대 상황을 빼는 게 훨씬 빠르고 정확하거든. 2023년 15번에서도 직접 구하려면 경우의 수가 너무 많아지지만, 반대 경우를 빼면 단 두 줄 만에 풀 수 있었어. "적어도"라는 키워드에 반응하는 연습이 필요해!',
        difficulty: '중', trap_logic: '정반대의 경우를 설정할 때, 빠뜨리는 케이스가 없도록 주의해야 해. (전부 다 안되는 경우 등)', teacher_tip: '문제를 읽고 "아, 너무 복잡한데?" 싶으면 일단 반대 상황을 생각해 봐!', importance: 'B'
    },
    {
        subject: '수학', year: 2022, question_num: 29, title: '중학 도형의 성질 (삼각형의 닮음)',
        concept_explanation: '고등학교 기하 문제의 8할은 중학교 때 배운 "닮음"과 "피타고라스"야! 2022년 29번 문제를 봐. 원 안에 삼각형이 그려져 있다면 원주각의 성질을 이용해서 같은 각을 가진 삼각형을 찾아야 해. 각 두 개만 같으면 AA 닮음이 성립하니까, 닮음비를 써서 변의 길이를 구할 수 있지. 고1 시험은 중학 도형을 얼마나 기억하느냐가 승부처란다.',
        difficulty: '상', trap_logic: '눈으로만 보지 말고, 보조선을 그어서 숨어있는 닮음 삼각형을 끄집어내야 해.', teacher_tip: '각이 같은 지점에는 점(●)이나 가위(x) 표시를 해서 시각화하는 습관을 들여보렴!', importance: 'A'
    },
    {
        subject: '영어', year: 2023, question_num: 38, title: '문장 삽입 (Connecting Words)',
        concept_explanation: '문장 삽입 문제는 "논리적 단절"을 찾는 게임이야. 글을 읽다가 갑자기 뚝 끊기는 느낌이 드는 곳이 정답이지! 특히 "However", "In addition", "Instead" 같은 연결사(Linkers)가 결정적인 힌트가 돼. 2023년 38번 지문에서도 주어진 문장에 "However"가 있었다면 앞의 내용과 반대되는 지점을 찾으면 끝! 인칭대명사(they, this, these)가 무엇을 가리키는지도 꼼꼼히 체크해 봐.',
        difficulty: '중', trap_logic: '해석은 대충 되는데 앞뒤 문장과의 논리적 연결고리를 못 잡으면 엉뚱한 번호를 고르게 돼.', teacher_tip: '주어진 문장을 먼저 읽고, "이 앞에는 어떤 내용이 나왔을까?"를 미리 추측해 보는 게 중요해!', importance: 'B'
    },
    {
        subject: '영어', year: 2022, question_num: 21, title: '함축 의미 추론 (Underlined phrases)',
        concept_explanation: '밑줄 친 부분이 의미하는 바를 고르는 21번 문제는 사실 빈칸 추론 문제랑 똑같아! 밑줄 친 단어 그 자체의 사전적 의미에 집착하지 마. 그 문장이 주제문과 어떤 관련이 있는지를 봐야 해. 2022년 21번에서는 은유적인 표현이 나왔지만, 글 전체의 요지가 "실패를 두려워하지 마라"였다면 밑줄도 결국 그 메시지를 담고 있는 법이거든.',
        difficulty: '중', trap_logic: '비유적인 표현을 곧이곧대로 해석하면 매력적인 오답 선지에 낚이기 딱 좋아.', teacher_tip: '제목(Title) 찾기 문제라고 생각하고 지문의 핵심 요지부터 파악해 봐!', importance: 'A'
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
