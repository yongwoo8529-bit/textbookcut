
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

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
const GROQ_MODEL = "llama-3.3-70b-versatile"; // 대량 분석을 위해 고성능 모델 사용

const SUBJECTS = ['과학'];
const YEARS = [2024, 2025];

/**
 * 특정 연도/과목의 문항별 분석 생성
 * AI가 실제 5개년 기출 트렌드를 기반으로 가상의 "초정밀 분석"을 생성합니다.
 */
async function generateGranularAnalysis(subject, year) {
    console.log(`[AI] Generating analysis for ${year} ${subject}...`);

    const prompt = `
당신은 대한민국 고1 3월 모의고사(전국연합학력평가) 20년 경력의 베테랑 일타 강사입니다.
${year}년 ${subject} 시험지 전체를 문항별(1번부터 해당 과목 끝번호까지)로 심층 분석하여 
학생들에게 "선생님이 직접 설명해주듯" 친절하고 깊이 있는 개념 안내서를 작성해야 합니다.

**요청 사항:**
1. ${year}년 ${subject} 실제 출제 경향을 반영하여 최소 10개 이상의 주요 문항을 선정해 분석하세요.
2. 결과는 반드시 객체 배열 형태의 JSON으로 응답하세요.
3. 각 객체는 다음 필드를 포함해야 합니다:
   - question_num: 문항 번호
   - title: 문항의 핵심 주제 (예: "고전 시가의 화자의 정서", "뉴턴의 제2법칙과 가속도")
   - concept_explanation: 선생님이 칠판 앞에서 설명하듯 구어체와 비유를 섞은 풍부한 개념 설명 (최소 5문장 이상)
   - difficulty: 상, 중, 하 중 하나
   - trap_logic: 학생들이 이 문제에서 가장 많이 낚이는 부분이나 오개념
   - teacher_tip: 이 유형을 정복하기 위한 일타 강사의 비법 (암기법, 접근 순서 등)
   - importance: A(필수), B(자주), C(가끔) 중 하나

JSON 응답 형식:
[
  {
    "question_num": 1,
    "title": "...",
    "concept_explanation": "...",
    "difficulty": "중",
    "trap_logic": "...",
    "teacher_tip": "...",
    "importance": "A"
  },
  ...
]`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: "당신은 고1 3월 모의고사 5개년 트렌드를 꿰뚫고 있는 초정밀 전략 분석가이자 친절한 선생님입니다." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7
            })
        });

        const result = await response.json();
        if (result.error) {
            console.error(`[AI Error] ${result.error.message}`);
            return [];
        }
        const contentText = result.choices[0].message.content;
        console.log(`[AI Raw Output] ${contentText.substring(0, 100)}...`);
        const content = JSON.parse(contentText);
        return Array.isArray(content) ? content : (content.questions || []);
    } catch (error) {
        console.error(`Error generating analysis for ${year} ${subject}:`, error);
        return [];
    }
}

async function seedGranularData() {
    console.log('🚀 Starting Granular Seeding (2021-2025)...');

    for (const subject of SUBJECTS) {
        for (const year of YEARS) {
            const questions = await generateGranularAnalysis(subject, year);

            if (questions.length === 0) continue;

            const dataToInsert = questions.map(q => ({
                subject,
                year,
                question_num: q.question_num,
                title: q.title,
                concept_explanation: q.concept_explanation,
                difficulty: q.difficulty,
                trap_logic: q.trap_logic,
                teacher_tip: q.teacher_tip,
                importance: q.importance
            }));

            const { error } = await supabase
                .from('mock_questions')
                .upsert(dataToInsert, { onConflict: ['subject', 'year', 'question_num'] });

            if (error) {
                console.error(`[DB] Error inserting ${year} ${subject}:`, error.message);
            } else {
                console.log(`[DB] Successfully seeded ${dataToInsert.length} questions for ${year} ${subject}`);
            }

            // TPM 제한을 피하기 위한 간격
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.log('✅ Granular Seeding Completed!');
}

seedGranularData();
