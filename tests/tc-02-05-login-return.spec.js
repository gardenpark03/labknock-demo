// TC-02-05 (FR-02-05): 로그인하지 않은 방문자가 모집 중 공고에서 로그인하면 같은 공고 상세로 돌아와 조건을 다시 검사한다.
// 지원서는 자동으로 제출되지 않는다. (프로필이 덜 된 학생의 보완 뒤 복귀는 TC-07-05에서 확인한다)
const { test, expect } = require('@playwright/test');
const { open, settle, resetDemo, clientAs, DEMO } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

test('TC-02-05 로그인 후 지원을 누르면 로그인 뒤 같은 공고로 돌아오고 지원서는 제출되지 않는다', async ({ page }) => {
  await open(page, '#/lab/L1/R1');
  await page.click('#apply-area #login');
  await expect(page).toHaveURL(/#\/login\?next=/);
  await expect(page.locator('#view')).toContainText('로그인하면 보던 공고로 돌아가요');
  await page.fill('#li-email', DEMO.student);
  await page.fill('#li-password', 'labknock-demo-2026');
  await page.click('#li-submit');
  await expect(page).toHaveURL(/#\/lab\/L1\/R1$/);
  await settle(page);
  await expect(page.locator('#to-apply')).toBeVisible();

  const s = (await (await clientAs(DEMO.student)).rpc('get_state')).data;
  expect(Object.values(s.apps).filter((a) => a.rec === 'R1')).toHaveLength(0);
});
