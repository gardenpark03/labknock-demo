// TC-07-05 (FR-07-05): 이름·학년·학부생 자기확인이 빠진 학생은 지원할 수 없고, 보완하면 보던 공고로 돌아간다.
// 자기확인은 자기신고로만 표시하고 학적 검증 완료처럼 보이지 않는다.
const { test, expect } = require('@playwright/test');
const { open, settle, resetDemo, createUser, clientAs, loginWith } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

test('TC-07-05 프로필이 빈 학생은 지원 대신 보완 안내를 보고, 빠진 항목마다 오류를 본다', async ({ page }) => {
  const u = await createUser(`profile-${Date.now()}@g.skku.edu`);
  await loginWith(page, u.email, u.password);
  await open(page, '#/lab/L1/R1');
  await expect(page.locator('#apply-area')).toContainText('프로필을 먼저 완성해주세요');
  await expect(page.locator('#to-apply')).toHaveCount(0);
  await page.click('#apply-area a:has-text("프로필 완성하기")');
  await settle(page);

  // 하나도 채우지 않고 저장
  await page.click('#pf-submit');
  await expect(page.locator('#pf-name-err')).toBeVisible();
  await expect(page.locator('#pf-grade-err')).toContainText('학년을 선택해주세요');
  await expect(page.locator('#pf-declaration-err')).toContainText('학부생인지 확인해주세요');

  // 이름·학년만 채우면 자기확인 누락만 남는다
  await page.fill('#pf-name', '보완 학생');
  await page.selectOption('#pf-grade', '2');
  await page.click('#pf-submit');
  await expect(page.locator('#pf-declaration-err')).toBeVisible();
  await expect(page.locator('#pf-grade-err')).toBeHidden();
  await expect(page.locator('#pf-declaration-help')).toContainText('자기신고');

  await page.check('#pf-declaration');
  await page.click('#pf-submit');
  await expect(page).toHaveURL(/#\/lab\/L1\/R1/);
  await settle(page);
  await expect(page.locator('#to-apply')).toBeVisible();

  await open(page, '#/account');
  await expect(page.locator('#profile')).toContainText('(자기신고)');
  await expect(page.locator('#view')).not.toContainText(/학적.*(검증|확인) 완료/);
});

test('TC-07-05 화면을 건너뛰어도 프로필이 덜 된 학생의 제출은 서버가 거절한다', async () => {
  const u = await createUser(`profile-api-${Date.now()}@g.skku.edu`);
  const c = await clientAs(u.email, u.password);
  const { data } = await c.rpc('submit_application', { p_rec_id: 'R1', p_intro: '자기소개', p_course: '미정', p_files: [{ slot: 'cv', name: 'CV.pdf' }], p_file_key: 'k1', p_shown_name: '', p_shown_grade: null });
  expect(data).toMatchObject({ ok: false, code: 'profile' });

  // 이름·학년만 있고 자기확인이 없으면 저장도 거절된다
  const { data: saved } = await c.rpc('save_profile', { p_name: '보완 학생', p_grade: 2, p_declaration: false });
  expect(saved.ok).toBe(false);
  expect(JSON.stringify(saved.errors)).toContain('declaration');
});
