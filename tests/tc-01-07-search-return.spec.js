const { test, expect } = require('@playwright/test');
const { open, settle, resetDemo, clientAs, DEMO, loginAs, logout } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

async function filterLabs(page) {
  await open(page, '#/labs');
  await page.fill('#q', '지능형');
  await page.selectOption('#field', '인공지능');
  await settle(page);
  await page.selectOption('#status', '모집 중');
  await settle(page);
  await expect(page.locator('#results .detail-link')).toHaveCount(1);
}

async function expectFilters(page, query, field, status) {
  await expect(page.locator('#q')).toHaveValue(query);
  await expect(page.locator('#field')).toHaveValue(field);
  await expect(page.locator('#status')).toHaveValue(status);
}

test('TC-01-07 뒤로 가기와 새로고침은 조건을 복원하고 메뉴·초기화는 전체 목록을 연다', async ({ page }) => {
  await filterLabs(page);
  await page.locator('#results .detail-link').click();
  await expect(page.locator('.back-link')).toBeVisible();
  await page.goBack();
  await expectFilters(page, '지능형', '인공지능', '모집 중');
  await page.reload();
  await expectFilters(page, '지능형', '인공지능', '모집 중');
  await expect(page.locator('#results .lab-name-link')).toHaveText('지능형시스템 연구실');
  await page.locator('#reset-filter').click();
  await expectFilters(page, '', '', '');
  await expect(page.locator('#results')).toContainText('컴퓨팅시스템 연구실');

  await filterLabs(page);
  await page.locator('#results .detail-link').click();
  await expect(page.locator('.back-link')).toBeVisible();
  await page.locator('#nav').getByRole('link', { name: '연구실 탐색' }).click();
  await expectFilters(page, '', '', '');
  await expect(page.locator('#results')).toContainText('컴퓨팅시스템 연구실');
});

test('TC-01-07 상세를 보는 사이 마감되면 복귀 후 같은 조건으로 최신 결과를 보여 준다', async ({ page }) => {
  await filterLabs(page);
  await page.locator('#results .detail-link').click();
  await expect(page.locator('.back-link')).toBeVisible();
  const admin = await clientAs(DEMO.admin);
  const state = await admin.rpc('get_state').throwOnError();
  const close = await admin.rpc('save_recruitment', {
    p_id: 'R1', p_saved_at: state.data.recs.R1.savedAt, p_action: 'close', p_data: {}, p_detail: '',
  }).throwOnError();
  expect(close.data.ok).toBe(true);

  await page.reload();
  await page.locator('.back-link').click();
  await expectFilters(page, '지능형', '인공지능', '모집 중');
  await expect(page.locator('#results')).toContainText('조건에 맞는 모집 공고가 없어요');
  await expect(page.locator('#results .lab-name-link')).toHaveCount(0);
});

test('TC-01-07 새 탭은 적용된 조건만 복원하며 잘못된 조건 주소는 안내한다', async ({ page, context }) => {
  await filterLabs(page);
  await page.fill('#q', '가'.repeat(51));
  await page.click('#search-btn');
  await expect(page.locator('#q-err')).toBeVisible();
  const tab = await context.newPage();
  await tab.goto(page.url());
  await expectFilters(tab, '지능형', '인공지능', '모집 중');
  await expect(tab.locator('#results .lab-name-link')).toHaveText('지능형시스템 연구실');
  await expect(tab.locator('#q-err')).toBeHidden();

  await open(tab, '#/labs?field=missing&status=missing');
  await expectFilters(tab, '', '', '');
  await expect(tab.locator('#view')).toContainText('연구 분야를 찾을 수 없어 전체로');
  await expect(tab.locator('#view')).toContainText('모집 상태가 올바르지 않아 전체로');
  await open(tab, '#/labs?q=' + 'a'.repeat(51));
  await expect(tab.locator('#q-err')).toBeVisible();
  await expect(tab.locator('#results .lab-row')).toHaveCount(0);
});

test('TC-01-07 로고 또는 로그아웃을 거쳐 탐색에 들어오면 기본 조건이다', async ({ page }) => {
  await loginAs(page, '학생');
  await filterLabs(page);
  await page.locator('header .lk-brand').click();
  await page.locator('#nav').getByRole('link', { name: '연구실 탐색' }).click();
  await expectFilters(page, '', '', '');
  await filterLabs(page);
  await logout(page);
  await page.locator('#nav').getByRole('link', { name: '연구실 탐색' }).click();
  await expectFilters(page, '', '', '');
});
