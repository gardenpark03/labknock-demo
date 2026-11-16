// 시험 공통 도구. 시험마다 새 브라우저 저장소에서 시작하므로 가상 데이터는 항상 처음 상태다.
const { expect } = require('@playwright/test');

/** 주소(#/…)로 연다. */
async function open(page, hash = '#/') {
  await page.goto(`/index.html${hash}`);
  await expect(page.locator('#view')).not.toBeEmpty();
}

/** 로그인 화면의 발표용 데모 계정으로 로그인한다. role: '학생' | '연구실 관리자' | '관리자 신청자' | '운영 보조' */
async function loginAs(page, role) {
  await open(page, '#/login');
  await page.locator('.demo-account', { has: page.locator('.demo-account__role', { hasText: new RegExp(`^${role}$`) }) }).first().click();
  await expect(page).not.toHaveURL(/#\/login/);
}

module.exports = { open, loginAs };
