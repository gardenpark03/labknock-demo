// TC-01-08 (FR-01-08): 50자는 검색되고, 51자는 입력칸 아래 안내와 함께 조회하지 않는다.
const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

test('TC-01-08 51자 검색어는 조회하지 않고 안내한다', async ({ page }) => {
  await open(page, '#/labs');
  await page.fill('#q', '가'.repeat(51));
  await page.click('#search-btn');
  await expect(page.locator('#q-err')).toHaveText('검색어는 50자 이하로 입력해주세요.');
  await expect(page).toHaveURL(/#\/labs$/);          // 주소(적용 조건)가 바뀌지 않았다
});

test('TC-01-08 50자 검색어는 조회한다', async ({ page }) => {
  await open(page, '#/labs');
  await page.fill('#q', '가'.repeat(50));
  await page.click('#search-btn');
  await expect(page).toHaveURL(/#\/labs\?q=/);
  await expect(page.locator('#q-err')).toBeHidden();
});
