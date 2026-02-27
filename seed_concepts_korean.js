
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

const GROQ_API_KEY = sanitizeEnvVar(process.env.VITE_GROQ_API_KEY);

const CONCEPT_CATEGORIES = {
    '시': ['화자', '청자', '시적 상황', '정서', '심상', '운율', '시어의 함축 의미', '상징', '비유', '의인법', '설의법', '반복', '대조', '역설'],
    '형태소': ['형태소', '자립 형태소', '의존 형태소', '어근', '접사', '파생어', '합성어'],
    '품사': ['체언', '명사', '대명사', '수사', '용언', '동사', '형용사', '수식언', '관형사', '부사', '관계언', '조사', '독립언', '감탄사'],
    '문법': ['주어', '서술어', '목적어', '보어', '관형어', '부사어', '독립어'],
    '문장구조': ['홑문장', '겹문장', '이어진 문장', '안은 문장', '능동문 / 피동문', '사동문', '부정문'],
    '음운': ['음절', '자음/모음', '음운 변동', '교체', '탈락', '첨가', '축약']
};

async function getFormalDefinition(concept, category) {
    const prompt = `당신은 국어 교육 전문가입니다. [${category}] 범주에 속하는 '${concept}'에 대해 고등학생이 학습하기 적합한 수준의 정교하고 학술적인 정의를 작성하십시오.
말투는 반드시 '~입니다', '~함'과 같은 문어체를 사용하며, '선생님', '말이야' 같은 구어체 표현은 절대 사용하지 마십시오.
또한, 다른 개념과 겹치지 않게 '${concept}'만의 고유한 특성을 중심으로 설명하십시오.

응답은 반드시 다음 JSON 형식을 유지하십시오:
{
  "description": "[${category}] ${concept}에 대한 명확하고 학술적인 설명 (4-5문장)",
  "importance": "A",
  "key_terms": "${category}, ${concept}, 연관학술용어1, 연관학술용어2",
  "trap": {
    "title": "${concept} 판단 시 주의사항",
    "mistake": "학습자가 '${concept}'에 대해 흔히 범하는 오개념",
    "correct": "오류를 방지하기 위한 올바른 판단 기준"
  }
}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.2
        })
    });

    const result = await response.json();
    if (!response.ok) {
        console.error(`\n[Groq Error] ${JSON.stringify(result)}`);
        throw new Error(`API_ERROR: ${result.error?.message || 'Unknown'}`);
    }
    return JSON.parse(result.choices[0].message.content);
}

async function seedConcepts() {
    console.log('🚀 [Concept Master] 국어 개념 정밀 시딩 시작...');

    for (const [category, concepts] of Object.entries(CONCEPT_CATEGORIES)) {
        console.log(`\n--- 카테고리: ${category} ---`);
        for (const concept of concepts) {
            try {
                // 이미 존재하는지 확인 (중복 방지)
                const { data: existing } = await supabase
                    .from('must_know_core')
                    .select('id')
                    .eq('subject', '국어')
                    .eq('title', concept)
                    .maybeSingle();

                if (existing) {
                    console.log(`⏭️ [${concept}] 이미 존재함 (스킵)`);
                    continue;
                }

                process.stdout.write(`⏳ [${concept}] 분석 중... `);
                const data = await getFormalDefinition(concept, category);

                // 1. must_know_core 저장
                const { data: newRow, error: inErr } = await supabase
                    .from('must_know_core')
                    .insert({
                        subject: '국어',
                        title: concept,
                        description: data.description,
                        importance: data.importance || 'A',
                        key_terms: data.key_terms || category,
                        education_level: 'high_1'
                    })
                    .select()
                    .single();

                if (inErr) throw inErr;

                // 2. trap 저장
                await supabase.from('exam_trap_points').insert({
                    concept_id: newRow.id,
                    title: data.trap.title,
                    common_mistake: data.trap.mistake,
                    correct_concept: data.trap.correct,
                    explanation: `${category} 분야의 학술적 분석에 기반한 함정 포인트입니다.`
                });

                console.log(`✅ 완료`);
                await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 지연
            } catch (err) {
                console.error(`\n❌ [${concept}] 실패:`, err.message);
            }
        }
    }

    console.log('\n✨ 국어 개념 정밀 시딩 완료!');
}

seedConcepts();
