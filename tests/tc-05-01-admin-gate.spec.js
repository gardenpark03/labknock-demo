// TC-05-01 (FR-05-01): 소속 인증이 승인되기 전의 관리자 신청자는 공고를 만들 수 없고 인증 안내를 본다.
const { test, expect } = require('@playwright/test');
const { open, loginAs } = require('./helpers');

test('TC-05-01 승인 대기 신청자는 모집 공고 관리 대신 인증 안내를 본다', async ({ page }) => {
  await loginAs(page, '관리자 신청자');
  await open(page, '#/admin/recruitments');
  await expect(page.locator('#view')).toContainText('연구실 소속 인증');
  await expect(page.locator('#view')).toContainText('승인 대기');
  await expect(page.locator('#view')).toContainText('승인 전에는 공고 초안도 만들 수 없어요');
});
