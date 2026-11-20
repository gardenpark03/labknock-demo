// TC-03-02 (FR-03-02, 표 6-1): 자기소개는 공백 제외 1~1,000자, 진학 희망 과정은 필수.
// 잘못된 입력은 항목별 오류를 보이고 다른 입력은 그대로 두며, 줄바꿈은 길이에서 빼고 저장·조회에는 남긴다.
const { test, expect } = require('@playwright/test');
const { open, loginAs, logout, confirmDialog, resetDemo, clientAs, DEMO, SAMPLE_PDF } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

test('TC-03-02 공백만·1,001자·과정 미선택은 항목별 오류를 보이고 다른 입력은 그대로 둔다', async ({ page }) => {
  await loginAs(page, '학생');
  await open(page, '#/apply/R1');
  await page.setInputFiles('#cv-input', SAMPLE_PDF);
  await expect(page.locator('#cv-box')).toContainText('sample-cv.pdf');

  // 공백만 입력 + 과정 미선택
  await page.fill('#intro', '   \n  ');
  await page.click('#submit');
  await expect(page.locator('#err-summary')).toContainText('2개 항목');
  await expect(page.locator('#intro-err')).toContainText('자기소개를 입력해주세요');
  await expect(page.locator('#course-err')).toContainText('진학 희망 과정을 선택해주세요');
  await expect(page.locator('#dialog')).toBeHidden();
  await expect(page.locator('#cv-box')).toContainText('sample-cv.pdf');   // 첨부는 그대로

  // 1,001자: 과정을 고르면 과정 오류만 사라지고 자기소개 초과 오류가 남는다
  await page.selectOption('#course', '석사');
  await page.fill('#intro', '가'.repeat(1001));
  await expect(page.locator('#intro-count')).toContainText('1자 초과');
  await page.click('#submit');
  await expect(page.locator('#intro-err')).toContainText('1,000자 이하로 줄여주세요');
  await expect(page.locator('#course-err')).toBeHidden();
  await expect(page.locator('#course')).toHaveValue('석사');
  await expect(page.locator('#dialog')).toBeHidden();
});

test('TC-03-02 줄바꿈이 든 1,000자 자기소개는 제출되고, 학생과 배정 관리자 화면에 줄바꿈이 남는다', async ({ page }) => {
  await loginAs(page, '학생');
  await open(page, '#/apply/R1');
  // "연구\n경험"은 4자로 센다
  await page.fill('#intro', '연구\n경험');
  await expect(page.locator('#intro-count')).toHaveText('공백 제외 4 / 1,000자');
  // 경계값: 공백 제외 정확히 1,000자 (4자 + 996자)
  const intro = `연구\n경험 ${'가'.repeat(996)}`;
  await page.fill('#intro', intro);
  await expect(page.locator('#intro-count')).toHaveText('공백 제외 1,000 / 1,000자');
  await page.selectOption('#course', '학석연계');
  await page.setInputFiles('#cv-input', SAMPLE_PDF);
  await page.click('#submit');
  await confirmDialog(page);
  await expect(page).toHaveURL(/#\/my\?app=A0103/);
  const mine = await page.locator('#my-detail .quote').innerText();
  expect(mine.startsWith('연구\n경험')).toBe(true);
  await logout(page);

  await loginAs(page, '연구실 관리자');
  await open(page, '#/admin/applicants?rec=R1&app=A0103');
  const theirs = await page.locator('#rv-detail .quote').innerText();
  expect(theirs.startsWith('연구\n경험')).toBe(true);
});

test('TC-03-02 화면을 건너뛰어도 서버가 공백만·1,001자·목록에 없는 과정을 거절한다', async () => {
  const c = await clientAs(DEMO.student);
  const base = { p_rec_id: 'R5', p_course: '석사', p_files: [{ slot: 'cv', name: 'CV.pdf' }], p_file_key: 'tc0302', p_shown_name: '가상 학생', p_shown_grade: 3 };
  for (const [intro, course] of [['   \n ', '석사'], ['가'.repeat(1001), '석사'], ['자기소개', '박사']]) {
    const { data } = await c.rpc('submit_application', { ...base, p_intro: intro, p_course: course });
    expect(data).toMatchObject({ ok: false, code: 'invalid' });
  }
});
