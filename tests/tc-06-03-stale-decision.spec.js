// TC-06-03 다른 창에서 먼저 바뀐 지원서의 오래된 심사 요청은 거절하고 최신 상태를 보여 준다 (FR-06-03.2, FR-06-08.5).
const { test, expect } = require('@playwright/test');
const { open, settle, loginAs, confirmDialog, resetDemo } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

const FILTER = encodeURIComponent('검토 중');

// b에서 A0098(검토 중) 합격 확인창을 띄워 둔 채, 다른 기기(a)에서 먼저 면담으로 바꾼다
// 같은 브라우저의 두 탭은 뒤쪽 탭 요청이 늦게 나가 순서가 흔들리므로 브라우저 세션을 나눈다
async function raceToInterview(browser, bHash) {
  const a = await (await browser.newContext()).newPage();
  await loginAs(a, '연구실 관리자');
  const b = await (await browser.newContext()).newPage();
  await loginAs(b, '연구실 관리자');
  await open(b, bHash);
  await b.click('[data-next="합격"]');
  await b.click('#rv-confirm');
  await expect(b.locator('#dialog')).toBeVisible();
  await open(a, '#/admin/applicants?rec=R1&app=A0098');
  await a.click('[data-next="면담"]');
  await a.click('#rv-confirm');
  await confirmDialog(a);
  await expect(a.locator('#rv-detail')).toContainText('면담');
  await b.click('#dialog-ok');
  await settle(b);
  return b;
}

test('TC-06-03 필터에서 빠진 지원서는 찾을 수 없음 대신 선택을 해제하고 이유를 알린다', async ({ browser }) => {
  const b = await raceToInterview(browser, `#/admin/applicants?rec=R1&filter=${FILTER}&app=A0098`);
  await expect(b.locator('#toast')).toContainText("지금은 '면담' 상태라 '검토 중' 필터에서 빠져 선택을 해제했어요");
  await expect(b).not.toHaveURL(/app=/);
  await expect(b.locator('#rv-detail')).not.toContainText('찾을 수 없거나');
  await expect(b.locator('.capacity')).toContainText('합격 1명');
});

test('TC-06-03 필터 전체에서는 최신 상태(면담)를 보여 주고 새 확인을 받는다', async ({ browser }) => {
  const b = await raceToInterview(browser, '#/admin/applicants?rec=R1&app=A0098');
  await expect(b.locator('#toast')).toContainText("지금은 '면담' 상태예요");
  await expect(b.locator('#rv-detail .lk-badge').first()).toHaveText('면담');
  await expect(b.locator('[data-next="합격"]')).toBeVisible();
  await expect(b.locator('[data-next="면담"]')).toHaveCount(0);
});
