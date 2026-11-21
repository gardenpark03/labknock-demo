// 시연 흐름 전체(데모 시나리오 장면 1~12)를 실제 서버(로컬 Supabase)로 확인한다.
const { test, expect } = require('@playwright/test');
const { open, loginAs, logout, confirmDialog, resetDemo, SAMPLE_PDF } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

test('학생 지원 → 관리자 심사·정원 초과 차단 → 학생 화면 합격 반영', async ({ page }) => {
  // 장면 4~6: 학생이 지능형 임베디드소프트웨어 연구실(R1)에 지원서 제출
  await loginAs(page, '학생');
  await open(page, '#/lab/L1/R1');
  await page.click('#to-apply');
  await page.fill('#intro', '머신러닝 프로젝트 경험이 있습니다.');
  await page.selectOption('#course', '석사');
  await page.setInputFiles('#cv-input', SAMPLE_PDF);
  await page.click('#submit');
  await confirmDialog(page);
  await expect(page).toHaveURL(/#\/my\?app=A0103/);
  await expect(page.locator('#my-detail')).toContainText('접수번호 A-0103');
  await expect(page.locator('#my-detail')).toContainText('지원 완료');

  // 장면 7: 컴퓨터시스템(A0102, 검토 중) 철회
  await open(page, '#/my?app=A0102');
  await page.click('#withdraw');
  await confirmDialog(page);
  await expect(page.locator('#my-detail')).toContainText('지원을 철회했어요');
  await logout(page);

  // 장면 9: 관리자가 새 지원서의 CV를 열고 검토 시작 → 합격
  await loginAs(page, '연구실 관리자');
  await open(page, '#/admin/applicants?rec=R1&app=A0103');
  const cv = page.locator('#rv-detail a', { hasText: 'sample-cv.pdf 보기' });
  await expect(cv).toHaveAttribute('href', /\/storage\/v1\/object\/sign\//);
  const pdf = await page.request.get(await cv.getAttribute('href'));
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');
  await page.click('[data-next="검토 중"]');
  await page.click('#rv-confirm');
  await confirmDialog(page);
  await expect(page.locator('#rv-detail')).toContainText('검토 중');
  await page.click('[data-next="합격"]');
  await page.click('#rv-confirm');
  await confirmDialog(page);
  await expect(page.locator('.capacity')).toContainText('합격 2명 / 모집 인원 2명');

  // 장면 10: 정원이 찬 뒤 면담 중인 가상 학생 C 합격은 막힌다 (FR-06-07)
  await open(page, '#/admin/applicants?rec=R1&app=A0099');
  await page.click('[data-next="합격"]');
  await page.click('#rv-confirm');
  await expect(page.locator('#rv-err')).toContainText('더 합격시킬 수 없어요');
  await logout(page);

  // 장면 11: 학생 홈에 합격이 보인다
  await loginAs(page, '학생');
  await open(page, '#/');
  await expect(page.locator('.home-me')).toContainText('합격');
});

test('정원 검사는 서버가 한다: 두 관리자 탭이 동시에 합격시켜도 정원을 넘지 않는다', async ({ browser }) => {
  // 정원 2명 중 1명 합격(A0097). 검토 중 B(A0098)와 면담 C(A0099)를 두 탭에서 동시에 합격 처리
  const ctx = await browser.newContext();
  const a = await ctx.newPage();
  await loginAs(a, '연구실 관리자');
  const b = await ctx.newPage();
  await open(b, '#/');
  const pickPass = async (p, key) => { await open(p, `#/admin/applicants?rec=R1&app=${key}`); await p.click('[data-next="합격"]'); await p.click('#rv-confirm'); await expect(p.locator('#dialog')).toBeVisible(); };
  await pickPass(a, 'A0098');
  await pickPass(b, 'A0099');
  await Promise.all([a.click('#dialog-ok'), b.click('#dialog-ok')]);
  await open(a, '#/admin/applicants?rec=R1');
  await expect(a.locator('.capacity')).toContainText('합격 2명 / 모집 인원 2명');
  await ctx.close();
});

test('공고 초안을 게시하면 학생 탐색에 나오고, 지원이 있는 공고는 고정된다', async ({ page }) => {
  await loginAs(page, '연구실 관리자');
  await open(page, '#/admin/recruitments?rec=R6');
  await page.fill('#f-topic', '거대 언어 모델 평가');
  await page.fill('#f-activity', '주 1회 미팅');
  await page.fill('#f-capacity', '2');
  await page.fill('#f-start', '2026-11-20');
  await page.fill('#f-end', '2026-12-31');
  await page.click('#publish');
  await confirmDialog(page);
  await expect(page.locator('#rec-detail')).toContainText('게시');
  // 지원이 있는 R1은 기간 연장·조기 마감만
  await open(page, '#/admin/recruitments?rec=R1');
  await expect(page.locator('#f-title')).toHaveAttribute('readonly', '');
  await expect(page.locator('#extend')).toBeVisible();
  await logout(page);
  await open(page, '#/labs');
  await expect(page.locator('#results')).toContainText('2027 봄 학부연구생 모집');
});

test('운영 보조가 인증 요청을 승인하면 관리자 신청자가 공고를 관리할 수 있다', async ({ page }) => {
  await loginAs(page, '운영 보조');
  await open(page, '#/ops/verifications?req=V2');
  await page.click('#ops-approve');
  await confirmDialog(page);
  await expect(page.locator('#ops-detail')).toContainText('승인');
  await logout(page);
  await open(page, '#/login');
  await page.fill('#li-email', 'admin-b@skku.edu');
  await page.fill('#li-password', 'labknock-demo-2026');
  await page.click('#li-submit');
  await open(page, '#/admin/recruitments');
  await expect(page.locator('#view')).toContainText('컴퓨터시스템 연구실');
  await expect(page.locator('#view')).toContainText('공고 목록');
});
