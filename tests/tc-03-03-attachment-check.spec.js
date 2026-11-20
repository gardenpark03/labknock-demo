// TC-03-03 (FR-03-03, 표 6-1): 첨부는 1~10,000,000바이트의 PDF만 받는다. 확장자만으로 승인하지 않는다.
// 부적합한 파일은 선택되지 않고 오류 항목 외 입력은 그대로 남는다.
// 암호화 PDF 거절(FR-03-03.2 '비암호화')은 아직 구현하지 않아 이 시험에 넣지 않았다 (#2 SRS 대조 댓글 참고).
const { test, expect } = require('@playwright/test');
const { open, loginAs, confirmDialog, resetDemo } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

/** 앞 5바이트가 %PDF-인 지정 크기의 파일 */
const pdfOf = (name, size) => { const b = Buffer.alloc(size); if (size >= 5) b.write('%PDF-'); return { name, mimeType: 'application/pdf', buffer: b }; };

test('TC-03-03 10,000,001바이트·0바이트·확장자만 PDF인 파일은 선택되지 않고 다른 입력은 그대로 남는다', async ({ page }) => {
  await loginAs(page, '학생');
  await open(page, '#/apply/R1');
  await page.fill('#intro', '첨부 검사 확인용 자기소개입니다.');
  await page.selectOption('#course', '미정');

  const cases = [
    [pdfOf('too-big.pdf', 10_000_001), '10MB 이하여야 해요'],
    [pdfOf('empty.pdf', 0), '10MB 이하여야 해요'],
    [{ name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('this is not a pdf') }, 'PDF 형식이 아닌 파일이에요'],
    [{ name: 'cv.txt', mimeType: 'text/plain', buffer: Buffer.from('%PDF-1.4') }, 'PDF 파일을 선택해주세요'],
  ];
  for (const [file, msg] of cases) {
    await page.setInputFiles('#cv-input', file);
    await expect(page.locator('#cv-err')).toContainText(msg);
    await expect(page.locator('#cv-box .file-box__name')).toHaveText('선택한 파일 없음');
  }
  await expect(page.locator('#intro')).toHaveValue('첨부 검사 확인용 자기소개입니다.');
  await expect(page.locator('#course')).toHaveValue('미정');

  // 부적합 파일만 고른 채 제출하면 CV 필수 오류로 막힌다
  await page.click('#submit');
  await expect(page.locator('#cv-err')).toContainText('CV PDF 파일을 선택해주세요');
  await expect(page.locator('#dialog')).toBeHidden();
});

test('TC-03-03 정확히 10,000,000바이트 PDF는 받아서 제출된다', async ({ page }) => {
  test.setTimeout(60_000);   // 10MB 업로드
  await loginAs(page, '학생');
  await open(page, '#/apply/R1');
  await page.fill('#intro', '경계 크기 파일 제출 확인용 자기소개입니다.');
  await page.selectOption('#course', '석사');
  await page.setInputFiles('#cv-input', pdfOf('limit-10mb.pdf', 10_000_000));
  await expect(page.locator('#cv-err')).toBeHidden();
  await expect(page.locator('#cv-box .file-box__name')).toContainText('limit-10mb.pdf · PDF');
  await page.click('#submit');
  await confirmDialog(page);
  await expect(page).toHaveURL(/#\/my\?app=A0103/);
  await expect(page.locator('#my-detail')).toContainText('limit-10mb.pdf');
});
