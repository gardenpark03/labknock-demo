// 계정: 실제 확인 메일로 가입(TC-07-01~03), 학교 메일만(TC-07-02), 로그인 5회 실패 제한(NFR-06)
const { test, expect } = require('@playwright/test');
const { open, resetDemo, latestConfirmLink } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

test('TC-07-01~03 학교 메일로 가입하면 확인 메일이 오고, 링크를 누르면 확인과 로그인이 끝난다', async ({ page }) => {
  const email = `new-${Date.now()}@g.skku.edu`;
  await open(page, '#/signup?role=student');
  await page.fill('#su-email', email);
  await page.fill('#su-password', 'labknock-test-pass');
  await page.fill('#su-password2', 'labknock-test-pass');
  await page.click('#su-submit');
  await expect(page).toHaveURL(/#\/check-email/);
  // 확인 전에는 로그인할 수 없고 확인 안내로 간다
  await open(page, '#/login');
  await page.fill('#li-email', email);
  await page.fill('#li-password', 'labknock-test-pass');
  await page.click('#li-submit');
  await expect(page).toHaveURL(/#\/check-email\?.*from=login/);

  const { subject, link } = await latestConfirmLink(email);
  expect(subject).toContain('[랩노크]');
  await page.goto(link);
  await expect(page.locator('#view')).toContainText('학교 이메일을 확인했어요');
  expect(page.url()).not.toContain('token_hash');
  await expect(page.locator('#account-btn')).toBeVisible();

  // 같은 링크는 다시 쓸 수 없다
  await page.goto(link);
  await expect(page.locator('#view')).toContainText('만료됐거나 이미 사용한 링크');
});

test('TC-07-02 학교 메일이 아니면 가입할 수 없다', async ({ page }) => {
  await open(page, '#/signup?role=student');
  await page.fill('#su-email', 'someone@skku.edu.example.com');
  await page.fill('#su-password', 'labknock-test-pass');
  await page.fill('#su-password2', 'labknock-test-pass');
  await page.click('#su-submit');
  await expect(page.locator('#su-email-err')).toContainText('학교 이메일만');
});

test('NFR-06 5번 연속 틀리면 맞는 비밀번호도 15분 동안 거절한다', async ({ page }) => {
  await open(page, '#/login');
  for (let i = 0; i < 5; i += 1) {
    await page.fill('#li-email', 'student-a@g.skku.edu');
    await page.fill('#li-password', `wrong-password-${i}`);
    await page.click('#li-submit');
    await expect(page.locator('#li-form-err')).toBeVisible();
  }
  await page.fill('#li-email', 'student-a@g.skku.edu');
  await page.fill('#li-password', 'labknock-demo-2026');
  await page.click('#li-submit');
  await expect(page.locator('#li-form-err')).toContainText('5번 연속 틀리면');
  await expect(page.locator('#account-btn')).toHaveCount(0);
});
