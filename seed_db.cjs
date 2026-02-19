
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function seed() {
    const envPath = path.join(process.cwd(), '.env');
    const envText = fs.readFileSync(envPath, 'utf8');
    const url = envText.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
    const key = envText.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim().replace(/\s+/g, '');

    const supabase = createClient(url, key);

    const rawData = fs.readFileSync('과학영역_핵심개념.json', 'utf8');
    const data = JSON.parse(rawData);

    const subjects = ['physics', 'chemistry', 'biology', 'earth_science'];
    const subjectMap = {
        'physics': '물리',
        'chemistry': '화학',
        'biology': '생물',
        'earth_science': '지구과학'
    };

    for (const key of subjects) {
        const sData = data[key];
        const subjectName = subjectMap[key];
        console.log(`Processing subject: ${subjectName}...`);

        for (const conceptTitle of sData.core_concepts) {
            // Check if exists first since we can't use upsert without constraint
            const { data: existing } = await supabase
                .from('must_know_core')
                .select('id')
                .eq('title', conceptTitle)
                .eq('subject', subjectName)
                .maybeSingle();

            let conceptId;
            if (existing) {
                conceptId = existing.id;
                console.log(`Concept ${conceptTitle} already exists. Skipping.`);
            } else {
                const { data: conceptRow, error: cError } = await supabase
                    .from('must_know_core')
                    .insert({
                        title: conceptTitle,
                        subject: subjectName,
                        education_level: 'middle_3',
                        description: `${conceptTitle}에 대한 핵심 요약입니다.`,
                        importance: 'A'
                    })
                    .select()
                    .single();

                if (cError) {
                    console.error(`Error inserting concept ${conceptTitle}:`, cError);
                    continue;
                }
                conceptId = conceptRow.id;
            }

            // 2. Insert Traps (Simple insert if not exist)
            for (const mistake of sData.common_mistakes) {
                if (mistake.includes(conceptTitle.slice(0, 3))) {
                    const { data: eTrap } = await supabase.from('exam_trap_points').select('id').eq('concept_id', conceptId).eq('common_mistake', mistake).maybeSingle();
                    if (!eTrap) {
                        await supabase.from('exam_trap_points').insert({
                            concept_id: conceptId,
                            title: '자주 틀리는 함정',
                            common_mistake: mistake,
                            correct_concept: '정확한 개념 숙지가 필요합니다.',
                            explanation: '출제자가 자주 함정을 파는 포인트입니다.'
                        });
                    }
                }
            }

            // 3. Insert Calculations
            for (const calc of sData.calculation_concepts) {
                if (calc.concept === conceptTitle || conceptTitle.includes(calc.concept)) {
                    const { data: eCalc } = await supabase.from('calculation_focus').select('id').eq('concept_id', conceptId).eq('formula', calc.formulas.join(', ')).maybeSingle();
                    if (!eCalc) {
                        await supabase.from('calculation_focus').insert({
                            concept_id: conceptId,
                            title: calc.concept,
                            description: '계산형 문제 대비 공식 및 절차',
                            formula: calc.formulas.join(', '),
                            calculation_steps: '1. 공식 확인, 2. 자릿수 및 단위 변환, 3. 값 대입 및 계산'
                        });
                    }
                }
            }
        }
    }
    console.log('Seeding completed!');
}

seed();
