
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import { chromium, Page } from 'playwright';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

// 설정
const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

interface PageAnalysis {
    mainUnit: string;
    subUnit?: string;
    content: string;
    pageNumber: number;
}

/**
 * 이미지 분석 (Gemini Vision)
 */
async function analyzePageImage(imagePath: string, pageNum: number): Promise<PageAnalysis> {
    const imageData = fs.readFileSync(imagePath);

    const prompt = `
        이 이미지는 대한민국의 교과서 페이지입니다. 
        1. 이 페이지가 속한 '대단원' 제목을 찾아주세요.
        2. '소단원'이나 세부 주제가 있다면 제목을 찾아주세요.
        3. 페이지 내의 모든 학습 본문 내용을 텍스트로 추출해주세요. (표, 실험 과정 포함)
        4. 반드시 아래 JSON 형식으로만 응답하세요.
        {
            "mainUnit": "대단원명",
            "subUnit": "소단원명 또는 세부주제",
            "content": "추출된 본문 전체 내용",
            "pageNumber": ${pageNum}
        }
    `;

    const result = await visionModel.generateContent([
        prompt,
        {
            inlineData: {
                data: Buffer.from(imageData).toString("base64"),
                mimeType: "image/png"
            }
        }
    ]);

    const response = await result.response;
    const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
}

/**
 * 수파베이스에 분석 결과 저장
 */
async function saveToSupabase(textbookId: string, analysis: PageAnalysis) {
    // 1. 대단원 조회 또는 생성
    let { data: mainUnit } = await supabase
        .from('units')
        .select('id')
        .eq('textbook_id', textbookId)
        .eq('title', analysis.mainUnit)
        .eq('level', 0)
        .single();

    if (!mainUnit) {
        const { data: newMain } = await supabase
            .from('units')
            .insert({ textbook_id: textbookId, title: analysis.mainUnit, level: 0 })
            .select()
            .single();
        mainUnit = newMain;
    }

    let parentId = mainUnit?.id;

    // 2. 소단원이 있다면 조회 또는 생성
    if (analysis.subUnit && mainUnit) {
        let { data: subUnit } = await supabase
            .from('units')
            .select('id')
            .eq('textbook_id', textbookId)
            .eq('title', analysis.subUnit)
            .eq('parent_id', mainUnit.id)
            .single();

        if (!subUnit) {
            const { data: newSub } = await supabase
                .from('units')
                .insert({ textbook_id: textbookId, title: analysis.subUnit, level: 1, parent_id: mainUnit.id })
                .select()
                .single();
            subUnit = newSub;
        }
        parentId = subUnit?.id;
    }

    // 3. 본문 저장
    if (parentId) {
        await supabase.from('content_chunks').insert({
            unit_id: parentId,
            page_number: analysis.pageNumber,
            raw_text: analysis.content,
            content_type: 'main'
        });
    }
}

/**
 * 메인 크롤러 실행 함수
 */
async function startAutoCrawler(url: string, publisher: string, grade: string, subject: string) {
    console.log('🚀 자동 크롤러 시작...');

    // 교과서 ID 확보
    let { data: textbook } = await supabase
        .from('textbooks')
        .select('id')
        .eq('publisher', publisher)
        .eq('grade', grade)
        .eq('subject', subject)
        .single();

    if (!textbook) {
        const { data: newTextbook } = await supabase
            .from('textbooks')
            .insert({ publisher, grade, subject, school_level: '중학교', curriculum: '2015' })
            .select()
            .single();
        textbook = newTextbook;
    }

    if (!textbook) throw new Error('교과서 정보를 생성할 수 없습니다.');

    const browser = await chromium.launch({ headless: false }); // 눈으로 확인 가능하게
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 1600 });

    await page.goto(url);
    await page.waitForTimeout(10000); // 뷰어 로딩 대기

    // 임시 디렉토리 생성
    if (!fs.existsSync('./temp_pages')) fs.mkdirSync('./temp_pages');

    // 예시로 10페이지만 테스트
    for (let i = 1; i <= 10; i++) {
        const screenshotPath = `./temp_pages/page_${i}.png`;
        await page.screenshot({ path: screenshotPath });

        try {
            console.log(`Analyzing Page ${i}...`);
            const analysis = await analyzePageImage(screenshotPath, i);
            await saveToSupabase(textbook.id, analysis);
            console.log(`✅ Page ${i} 저장 완료: ${analysis.mainUnit} > ${analysis.subUnit || ''}`);
        } catch (err) {
            console.error(`❌ Page ${i} 분석 실패:`, err);
        }

        // 다음 페이지 버튼 클릭 (비상 뷰어 기준 - 실제 셀렉터 확인 필요)
        try {
            await page.keyboard.press('ArrowRight'); // 또는 특정 버튼 클릭
            await page.waitForTimeout(2000);
        } catch (err) { }
    }

    await browser.close();
    console.log('✨ 모든 작업이 완료되었습니다.');
}

// 사용법: npx ts-node scripts/autoCrawler.ts [URL] [출판사] [학년] [과목]
const [, , url, pub, gr, sub] = process.argv;
if (url && pub && gr && sub) {
    startAutoCrawler(url, pub, gr, sub);
} else {
    console.log('사용법: npx ts-node scripts/autoCrawler.ts [URL] [출판사] [학년] [과목]');
}
