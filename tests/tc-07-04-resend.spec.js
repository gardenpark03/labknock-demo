// TC-07-04 (FR-07-04): 확인 메일 재발송은 직전 발급부터 60초가 지나야 하고, 새 링크가 나가면 이전 링크는 쓸 수 없다.
const { test, expect } = require('@playwright/test');
const { open, resetDemo, latestConfirmLink, API, PUBLISHABLE_KEY } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

async function signup(page, email) {
  await open(page, '#/signup?role=student');
  await page.fill('#su-email', email);
  await page.fill('#su-password', 'labknock-test-pass');
  await page.fill('#su-password2', 'labknock-test-pass');
  await page.click('#su-submit');
  await expect(page).toHaveURL(/#\/check-email/);
}
// 화면을 거치지 않고 인증 서버에 재발송을 직접 요청한다
const resend = (email) => fetch(`${API}/auth/v1/resend`, { method: 'POST', headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'signup', email }) });

test('TC-07-04 가입 직후 60초 안에는 재발송이 화면과 서버 모두에서 거절된다', async ({ page }) => {
  const email = `resend-${Date.now()}@g.skku.edu`;
  await signup(page, email);
  await expect(page.locator('#resend')).toBeDisabled();
  await expect(page.locator('#resend-hint')).toContainText('초 뒤에 보낼 수 있어요');
  // 화면의 제한을 건너뛰어도 서버가 거절한다
  const r = await resend(email);
  expect(r.status).toBe(429);
});

test('TC-07-04 60초가 지나면 새 링크가 나가고, 이전 링크는 확인 상태를 바꾸지 않는다', async ({ page }) => {
  test.setTimeout(120_000);
  const email = `resend-old-${Date.now()}@g.skku.edu`;
  await signup(page, email);
  const first = (await latestConfirmLink(email)).link;

  await page.waitForTimeout(61_000);
  await page.reload();
  await expect(page.locator('#resend')).toBeEnabled();
  await page.click('#resend');
  await expect(page.locator('#toast')).toContainText('확인 메일을 다시 보냈어요');
  let second = first;
  for (let i = 0; i < 20 && second === first; i += 1) { second = (await latestConfirmLink(email)).link; if (second === first) await page.waitForTimeout(500); }
  expect(second).not.toBe(first);

  await page.goto(first);
  await expect(page.locator('#view')).toContainText('만료됐거나 이미 사용한 링크');
  await expect(page.locator('#account-btn')).toHaveCount(0);

  await page.goto(second);
  await expect(page.locator('#view')).toContainText('학교 이메일을 확인했어요');
});
