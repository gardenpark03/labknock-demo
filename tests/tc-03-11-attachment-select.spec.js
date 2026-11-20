// TC-03-11 (FR-03-11): 선택한 파일의 이름·형식·크기와 선택 취소를 보여 준다.
// 선택을 취소하면 그 항목만 비고, CV가 비면 필수 오류, 정상 CV만 있으면 제출할 수 있다. 항목마다 파일은 하나만 남는다.
const { test, expect } = require('@playwright/test');
const { open, loginAs, confirmDialog, resetDemo, SAMPLE_PDF } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

test('TC-03-11 CV·성적증명서 선택 취소와 재선택 뒤 CV만으로 제출된다', async ({ page }) => {
  await loginAs(page, '학생');
  await open(page, '#/apply/R1');
  await page.fill('#intro', '첨부 선택 관리 확인용 자기소개입니다.');
  await page.selectOption('#course', '석박통합');

  // 선택하면 이름·PDF·크기와 선택 취소가 보이고, 파일 선택 버튼은 숨는다(항목당 한 파일)
  await page.setInputFiles('#cv-input', SAMPLE_PDF);
  await expect(page.locator('#cv-box .file-box__name')).toHaveText(/^sample-cv\.pdf · PDF · \d+ KB$/);
  await expect(page.locator('#cv-box .clear-btn')).toBeVisible();
  await expect(page.locator('#cv-box .pick-btn')).toBeHidden();
  await page.setInputFiles('#grade-input', SAMPLE_PDF);
  await expect(page.locator('#grade-box .file-box__name')).toContainText('sample-cv.pdf · PDF');

  // CV 선택 취소: CV만 비고 성적증명서·다른 입력은 그대로
  await page.click('#cv-box .clear-btn');
  await expect(page.locator('#cv-box .file-box__name')).toHaveText('선택한 파일 없음');
  await expect(page.locator('#cv-box .pick-btn')).toBeVisible();
  await expect(page.locator('#grade-box .file-box__name')).toContainText('sample-cv.pdf');
  await expect(page.locator('#intro')).toHaveValue('첨부 선택 관리 확인용 자기소개입니다.');
  await page.click('#submit');
  await expect(page.locator('#cv-err')).toContainText('CV PDF 파일을 선택해주세요');
  await expect(page.locator('#dialog')).toBeHidden();

  // 비운 뒤 부적합 파일을 고르면 여전히 비어 있고, 정상 CV를 다시 고르면 오류가 사라진다
  await page.setInputFiles('#cv-input', { name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a pdf') });
  await expect(page.locator('#cv-box .file-box__name')).toHaveText('선택한 파일 없음');
  await page.setInputFiles('#cv-input', SAMPLE_PDF);
  await expect(page.locator('#cv-err')).toBeHidden();

  // 성적증명서를 제거하고 제출하면 CV 하나만 첨부된다
  await page.click('#grade-box .clear-btn');
  await expect(page.locator('#grade-box .file-box__name')).toHaveText('선택한 파일 없음');
  await page.click('#submit');
  await expect(page.locator('#dialog')).toContainText('CV · sample-cv.pdf');
  await expect(page.locator('#dialog')).not.toContainText('성적증명서');
  await confirmDialog(page);
  await expect(page).toHaveURL(/#\/my\?app=A0103/);
  await expect(page.locator('#my-detail a[data-file]')).toHaveCount(1);
  await expect(page.locator('#my-detail a[data-file]')).toContainText('sample-cv.pdf');
});
