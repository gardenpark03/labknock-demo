// 관리자 신청자: 가입 → 메일 확인 → 이름 입력 → 소속 인증 신청(PDF) → 운영 보조 승인 → 공고 관리 (TC-07-05·08~11)
// 그리고 첨부 파일은 권한 있는 사람만 열 수 있다
const { test, expect } = require('@playwright/test');
const { open, loginAs, logout, confirmDialog, resetDemo, latestConfirmLink, settle, SAMPLE_PDF, API } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

test('TC-07-08~11 새 관리자 신청자가 인증을 신청하고 승인받으면 공고를 관리할 수 있다', async ({ page }) => {
  const email = `lab-${Date.now()}@skku.edu`;
  await open(page, '#/signup?role=admin');
  await page.fill('#su-email', email);
  await page.fill('#su-password', 'labknock-test-pass');
  await page.fill('#su-password2', 'labknock-test-pass');
  await page.click('#su-submit');
  await expect(page).toHaveURL(/#\/check-email/);
  await page.goto((await latestConfirmLink(email)).link);
  await expect(page.locator('#view')).toContainText('학교 이메일을 확인했어요');

  await open(page, '#/account');
  await page.fill('#pf-name', '새 신청자');
  await page.click('#pf-submit');
  await expect(page.locator('#toast')).toContainText('프로필을 저장했어요');
  await settle(page);

  await open(page, '#/verification');
  await page.selectOption('#vr-lab', 'L3');
  await page.fill('#vr-desc', 'Software Engineering 연구실 석사과정이며 공고 관리를 위임받았습니다.');
  await page.setInputFiles('#vr-proof-input', SAMPLE_PDF);
  await page.click('#vr-submit');
  await confirmDialog(page);
  await expect(page.locator('#view')).toContainText('승인 대기');
  await logout(page);

  await loginAs(page, '운영 보조');
  await open(page, '#/ops/verifications');
  await page.locator('.pick', { hasText: '새 신청자' }).click();
  await settle(page);
  const proof = page.locator('#ops-detail a', { hasText: 'sample-cv.pdf 보기' });
  await expect(proof).toHaveAttribute('href', /\/storage\/v1\/object\/sign\//);
  await page.click('#ops-approve');
  await confirmDialog(page);
  await logout(page);

  await open(page, '#/login');
  await page.fill('#li-email', email);
  await page.fill('#li-password', 'labknock-test-pass');
  await page.click('#li-submit');
  await settle(page);
  await open(page, '#/admin/recruitments');
  await expect(page.locator('#view')).toContainText('Software Engineering 연구실');
});

test('다른 학생은 남의 첨부 파일 주소를 받을 수 없다 (Storage 권한)', async ({ page, request }) => {
  // 데모 학생이 CV를 올려 제출한다
  await loginAs(page, '학생');
  await open(page, '#/lab/L1/R1');
  await page.click('#to-apply');
  await page.fill('#intro', '권한 시험용 지원서입니다.');
  await page.selectOption('#course', '미정');
  await page.setInputFiles('#cv-input', SAMPLE_PDF);
  await page.click('#submit');
  await confirmDialog(page);
  const path = await page.locator('#my-detail a[data-file], #my-detail a[href*="/sign/"]').first().evaluate((a) => a.dataset.file || decodeURIComponent(new URL(a.href).pathname.split('/sign/files/')[1]));
  expect(path).toMatch(/^00000000-0000-4000-8000-000000000001\//);
  // 로그인하지 않은 요청과 다른 계정(관리자 신청자)은 서명 주소를 만들 수 없다
  const key = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
  const anon = await request.post(`${API}/storage/v1/object/sign/files/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, data: { expiresIn: 60 } });
  expect(anon.ok()).toBeFalsy();
  const tok = await (await request.post(`${API}/auth/v1/token?grant_type=password`, { headers: { apikey: key }, data: { email: 'admin-b@skku.edu', password: 'labknock-demo-2026' } })).json();
  const other = await request.post(`${API}/storage/v1/object/sign/files/${path}`, { headers: { apikey: key, Authorization: `Bearer ${tok.access_token}` }, data: { expiresIn: 60 } });
  expect(other.ok()).toBeFalsy();
});
