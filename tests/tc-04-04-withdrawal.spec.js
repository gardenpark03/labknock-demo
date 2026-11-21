const { test, expect } = require('@playwright/test');
const { resetDemo, loginAs, open, clientAs, DEMO } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

test('TC-04-04 · TC-X-06 철회 확인을 취소하면 요청과 이력이 생기지 않는다', async ({ page }) => {
  await loginAs(page, '학생');
  await open(page, '#/my?app=A0102');
  const history = page.locator('#my-detail .history li');
  const before = await history.allTextContents();
  let requests = 0;
  page.on('request', request => {
    if (request.url().endsWith('/rpc/withdraw_application')) requests++;
  });
  await page.click('#withdraw');
  const dialog = page.locator('#dialog');
  await expect(dialog).toContainText('컴퓨터시스템 연구실');
  await expect(dialog).toContainText('다시 지원할 수 없어요');
  await page.click('#dialog-cancel');
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(history).toHaveText(before);
  await expect(page.locator('#withdraw')).toBeVisible();
  expect(requests).toBe(0);
});

test('TC-X 철회 요청이 서버에 닿지 않으면 실패 안내 후 최신 상태를 다시 볼 수 있다', async ({ page }) => {
  await loginAs(page, '학생');
  await open(page, '#/my?app=A0102');
  const before = await page.locator('#my-detail .history li').allTextContents();
  await page.route('**/rpc/withdraw_application', route => route.abort());
  await page.click('#withdraw');
  await page.click('#dialog-ok');
  await expect(page.locator('#toast')).toContainText('서버에 연결하지 못했어요');
  await expect(page.locator('#toast')).toContainText('새로 열어 확인');
  await page.reload();
  await expect(page.locator('#my-detail .history li')).toHaveText(before);
  await expect(page.locator('#withdraw')).toBeVisible();
});

test('TC-04-04 철회는 한 번만 기록하고 철회 상태에서는 다시 철회할 수 없다', async () => {
  const student = await clientAs(DEMO.student);
  const history = async () => (await student.rpc('get_state').throwOnError()).data.apps.A0102.history;
  const before = await history();
  const withdraw = expected => student.rpc('withdraw_application', { p_key: 'A0102', p_expected: expected }).throwOnError();
  expect((await withdraw('검토 중')).data.ok).toBe(true);
  const after = await history();
  expect(after.slice(0, -1)).toEqual(before);
  expect(after.at(-1)[0]).toBe('철회');
  expect((await withdraw('철회')).data.ok).toBe(false);
  expect(await history()).toEqual(after);
});
