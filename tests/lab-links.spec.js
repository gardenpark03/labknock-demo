// 연구실·교수 홈페이지 바깥 링크(DEC-27, SRS 밖 추가): 소프트웨어학과 교수소개의 공개 링크를 새 창으로 연다
const { test, expect } = require('@playwright/test');
const { open, resetDemo } = require('./helpers');

test.beforeAll(async () => { await resetDemo(); });

test('연구실 상세에서 연구실·교수 홈페이지를 새 창으로 연다', async ({ page }) => {
  await open(page, '#/lab/L7/R8');
  const links = page.locator('.ext-links a');
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toContainText('연구실 홈페이지');
  await expect(links.nth(0)).toHaveAttribute('href', 'https://nlplab.skku.edu/');
  await expect(links.nth(1)).toContainText('교수 홈페이지');
  await expect(links.nth(1)).toHaveAttribute('href', 'https://nlp.skku.edu/');
  for (const i of [0, 1]) {
    await expect(links.nth(i)).toHaveAttribute('target', '_blank');
    await expect(links.nth(i)).toHaveAttribute('rel', /noopener/);
  }
});

test('연구실 링크만 있으면 하나만, 열리지 않는 주소는 보이지 않는다', async ({ page }) => {
  await open(page, '#/lab/L1/R1');
  await expect(page.locator('.ext-links a')).toHaveCount(1);
  await expect(page.locator('.ext-links a')).toHaveAttribute('href', 'https://nyx.skku.ac.kr/lab/');
  await open(page, '#/lab/L3/R3');
  await expect(page.locator('#view h1')).toContainText('Software Engineering');
  await expect(page.locator('.ext-links')).toHaveCount(0);
});

test('홈 연구실 목록에서 연구실 홈페이지로 바로 간다', async ({ page }) => {
  await open(page, '#/');
  await expect(page.locator('.lab-dir li')).toHaveCount(14);
  await expect(page.locator('.lab-dir__ext')).toHaveCount(13);
  const nlp = page.locator('.lab-dir li', { hasText: 'Natural Language Processing' }).locator('.lab-dir__ext');
  await expect(nlp).toHaveAttribute('href', 'https://nlplab.skku.edu/');
  await expect(nlp).toHaveAttribute('target', '_blank');
  await expect(page.locator('.lab-dir li', { hasText: 'Software Engineering' }).locator('.lab-dir__ext')).toHaveCount(0);
});
