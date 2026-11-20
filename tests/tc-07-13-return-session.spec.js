// TC-07-13 (FR-07-13, 3.1.8): 로그인 뒤에는 허용된 내부 목적지로만 돌아가고, 외부 주소·부적격 경로는 탐색으로 대체한다.
// 마지막 활동부터 30분이 되면 다시 로그인해야 하고, 로그아웃한 세션은 다시 쓸 수 없다.
const { test, expect } = require('@playwright/test');
const { open, settle, loginAs, logout, resetDemo, clientAs, createUser, API, PUBLISHABLE_KEY } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

async function loginStudentWithNext(page, next) {
  await open(page, `#/login?next=${encodeURIComponent(next)}`);
  await page.locator('.demo-account', { has: page.locator('.demo-account__role', { hasText: /^학생$/ }) }).click();
  await expect(page.locator('#account-btn')).toBeVisible();
  await settle(page);
}

for (const [label, next, expected] of [
  ['허용된 내 지원 현황', '#/my?app=A0102', /#\/my\?app=A0102$/],
  ['외부 주소', 'https://evil.example/phish', /#\/labs$/],
  ['스크립트 주소', 'javascript:alert(1)', /#\/labs$/],
  ['학생에게 부적격한 관리 화면', '#/admin/recruitments', /#\/labs$/],
]) {
  test(`TC-07-13 로그인 뒤 복귀: ${label}`, async ({ page }) => {
    await loginStudentWithNext(page, next);
    await expect(page).toHaveURL(expected);
  });
}

// 이 브라우저에 기록된 마지막 활동 시각을 minutes분 전으로 돌린다
async function setIdle(page, minutes) {
  await page.evaluate((ms) => {
    const s = JSON.parse(localStorage.getItem('labknock-local-v2'));
    s.lastActiveAt = new Date(Date.now() - ms).toISOString();
    localStorage.setItem('labknock-local-v2', JSON.stringify(s));
  }, minutes * 60 * 1000);
  await page.reload();
}

test('TC-07-13 마지막 활동 29분 뒤에는 그대로, 30분이 되면 다시 로그인해야 한다', async ({ page }) => {
  await loginAs(page, '학생');
  await setIdle(page, 29);
  await open(page, '#/my');
  await expect(page).toHaveURL(/#\/my/);
  await expect(page.locator('#account-btn')).toBeVisible();

  await setIdle(page, 30);
  await open(page, '#/my');
  await expect(page).toHaveURL(/#\/login/);
  await expect(page.locator('#view')).toContainText('30분 동안 활동이 없어 로그아웃됐어요');
  await expect(page.locator('#account-btn')).toHaveCount(0);
});

test('TC-07-13 로그아웃한 세션의 토큰으로는 보호 데이터를 받을 수 없다', async ({ page }) => {
  await loginAs(page, '학생');
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('labknock-auth')).access_token);
  await logout(page);
  const r = await fetch(`${API}/rest/v1/rpc/get_state`, { method: 'POST', headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' });
  const body = r.ok ? await r.json() : { me: null };
  expect(body.me).toBeNull();
  // 같은 토큰으로 본인 폴더에 파일을 올리거나 저장 함수를 부를 수도 없다
  const me = '00000000-0000-4000-8000-000000000001';
  const up = await fetch(`${API}/storage/v1/object/files/${me}/after-logout-${Date.now()}/cv.pdf`, { method: 'POST', headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/pdf' }, body: '%PDF-1.4' });
  expect(up.ok).toBeFalsy();
  const save = await fetch(`${API}/rest/v1/rpc/save_profile`, { method: 'POST', headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_name: '로그아웃 뒤', p_grade: 1, p_declaration: true }) });
  expect((await save.json()).ok).toBe(false);
});

test('TC-07-13 로그아웃한 세션의 토큰으로는 연구실 인증을 신청할 수 없다', async () => {
  const u = await createUser(`logout-vreq-${Date.now()}@skku.edu`, { role: 'admin' });
  const c = await clientAs(u.email, u.password);
  expect((await c.rpc('save_profile', { p_name: '로그아웃 신청', p_grade: null, p_declaration: true })).data.ok).toBe(true);
  expect((await c.storage.from('files').upload(`${u.id}/k1/proof.pdf`, Buffer.from('%PDF-1.4 test'), { contentType: 'application/pdf' })).error).toBeNull();
  const token = (await c.auth.getSession()).data.session.access_token;
  await c.auth.signOut();
  const r = await fetch(`${API}/rest/v1/rpc/request_verification`, { method: 'POST', headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_confirmed_name: '로그아웃 신청', p_lab_id: 'L1', p_description: '로그아웃 뒤 신청', p_proof: 'proof.pdf', p_file_key: 'k1' }) });
  expect((await r.json()).ok).toBe(false);
});
