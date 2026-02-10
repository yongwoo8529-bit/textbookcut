
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { chromium } from 'playwright';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '' // 크롤러는 서비스 롤 키 필요
);

/**
 * 비상교육 이북 크롤러 툴
 * @param url 이북 뷰어 URL
 * @param textbookId 텍스트북 테이블 ID
 */
async function crawlVisangEbook(url: string, textbookId: string) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log(`접속 중: ${url}`);
    await page.goto(url);

    // 뷰어 로딩 대기
    await page.waitForTimeout(5000);

    // TODO: 비상교육 뷰어의 특정 DOM 구조에 따라 텍스트 추출 로직 구현
    // 현재는 예시로 페이징 처리 및 텍스트 추출 프레임워크만 구성

    const totalPages = 300; // 대략적인 페이지 수 (스크립트에서 동적 파악 필요)

    for (let i = 1; i <= totalPages; i++) {
        console.log(`${i} 페이지 분석 중...`);

        // 텍스트 추출 (뷰어 내부의 텍스트 레이어 혹은 이미지를 OCR)
        const pageText = await page.evaluate(() => {
            // 비상 뷰어는 보통 canvas나 svg로 텍스트를 렌더링함
            // 실제 DOM 구조에 맞게 수정 필요
            return document.querySelector('.text-layer')?.textContent || '';
        });

        if (pageText) {
            // Supabase에 저장
            await supabase.from('content_chunks').insert({
                unit_id: '...', // 현재 페이지에 해당하는 단원 ID 매핑 필요
                page_number: i,
                raw_text: pageText
            });
        }

        // 다음 페이지로 이동 버튼 클릭
        // await page.click('.btn-next');
        // await page.waitForTimeout(1000);
    }

    await browser.close();
    console.log('크롤링 완료');
}

// 실행 예시: npx ts-node scripts/crawlTextbook.ts
// crawlVisangEbook('http://ebook.visang.com/...', 'uuid');
