// FR-X-06·4.9 공고 저장·심사의 처리 중 중복 동작 차단과 응답 유실(결과 미확인) 뒤 결과 확인.
// 응답 유실은 요청을 서버까지 보낸 뒤 브라우저에 응답만 전달하지 않는 방식(route.fetch → abort)으로 만든다.
const { test, expect } = require('@playwright/test');
const { open, loginAs, resetDemo } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

const lostResponse = async (route) => { await route.fetch(); await route.abort(); };

test('4.9 공고 저장 응답을 못 받았지만 서버에 저장됐으면 저장된 것으로 확인한다', async ({ page }) => {
  await loginAs(page, '연구실 관리자');
  await open(page, '#/admin/recruitments?rec=R6');
  await page.route('**/rest/v1/rpc/save_recruitment', lostResponse);
  await page.fill('#f-title', '응답 유실 뒤 저장된 제목');
  await page.click('#save-draft');
  await expect(page.locator('#toast')).toContainText('저장된 것으로 확인됐어요');
  await expect(page.locator('#rec-detail h2')).toHaveText('응답 유실 뒤 저장된 제목');
});

test('4.9 공고 저장 요청이 서버에 닿지 않았으면 입력을 유지하고 저장되지 않았다고 알린다', async ({ page }) => {
  await loginAs(page, '연구실 관리자');
  await open(page, '#/admin/recruitments?rec=R6');
  await page.route('**/rest/v1/rpc/save_recruitment', (route) => route.abort());
  await page.fill('#f-title', '보내지 못한 제목');
  await page.click('#save-draft');
  await expect(page.locator('#toast')).toContainText('저장되지 않은 것으로 확인됐어요');
  await expect(page.locator('#f-title')).toHaveValue('보내지 못한 제목');
});

test('4.9 결과 확인까지 실패하면 결과 확인 버튼을 남기고, 연결이 돌아오면 결과를 알려 준다', async ({ page }) => {
  await loginAs(page, '연구실 관리자');
  await open(page, '#/admin/recruitments?rec=R6');
  await page.route('**/rest/v1/rpc/save_recruitment', lostResponse);
  await page.route('**/rest/v1/rpc/get_state', (route) => route.abort());
  await page.fill('#f-title', '연결이 돌아온 뒤 확인한 제목');
  await page.click('#save-draft');
  await expect(page.locator('#rec-alert')).toContainText('저장 결과를 확인하지 못했어요');
  await page.unroute('**/rest/v1/rpc/get_state');
  await page.locator('#rec-alert button').click();
  await expect(page.locator('#toast')).toContainText('저장된 것으로 확인됐어요');
});

test('FR-X-06 기간 연장을 처리하는 동안 조기 마감 버튼도 누를 수 없다', async ({ page }) => {
  await loginAs(page, '연구실 관리자');
  await open(page, '#/admin/recruitments?rec=R1');
  await page.route('**/rest/v1/rpc/save_recruitment', async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
  await page.fill('#f-end', '2026-12-15');
  await page.click('#extend');
  await page.click('#dialog-ok');
  await expect(page.locator('#extend')).toHaveText('저장 중…');
  await expect(page.locator('#early-close')).toBeDisabled();
  await expect(page.locator('#toast')).toContainText('연장했어요');
});

test('4.9 심사 응답을 못 받았지만 서버에 저장됐으면 저장된 것으로 확인한다', async ({ page }) => {
  await loginAs(page, '연구실 관리자');
  await open(page, '#/admin/applicants?rec=R1&app=A0098');
  await page.route('**/rest/v1/rpc/decide_application', lostResponse);
  await page.click('[data-next="면담"]');
  await page.click('#rv-confirm');
  await page.click('#dialog-ok');
  await expect(page.locator('#toast')).toContainText('저장된 것으로 확인됐어요');
  await expect(page.locator('#rv-detail .lk-badge').first()).toHaveText('면담');
});

test('FR-X-06 심사를 처리하는 동안 다른 다음 단계 버튼도 누를 수 없다', async ({ page }) => {
  await loginAs(page, '연구실 관리자');
  await open(page, '#/admin/applicants?rec=R1&app=A0098');
  await page.route('**/rest/v1/rpc/decide_application', async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
  await page.click('[data-next="면담"]');
  await page.click('#rv-confirm');
  await page.click('#dialog-ok');
  await expect(page.locator('#rv-confirm')).toHaveText('저장 중…');
  await expect(page.locator('[data-next="불합격"]')).toBeDisabled();
  await expect(page.locator('#toast')).toContainText("'면담'(으)로 저장했어요");
});
