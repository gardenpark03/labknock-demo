// TC-07-08 (FR-07-08, 4.7.3): 위임 근거 PDF는 서버가 확인한다. 파일을 올리지 않았거나 5,000,000바이트를 넘으면
// 화면을 건너뛰고 직접 요청해도 접수되지 않는다.
const { test, expect } = require('@playwright/test');
const { open, loginAs, logout, resetDemo } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

// 관리자 신청자 브라우저에서 근거 파일을 (선택적으로) 올리고 인증 신청 함수를 직접 부른다
const request = (page, bytes) => page.evaluate(async (n) => {
  const { data: { user } } = await SB.auth.getUser();
  const key = `proof-${Date.now()}`;
  if (n) {
    const body = new Uint8Array(n); body.set(new TextEncoder().encode('%PDF-1.4'));
    const up = await SB.storage.from('files').upload(`${user.id}/${key}/proof.pdf`, new Blob([body], { type: 'application/pdf' }), { contentType: 'application/pdf' });
    if (up.error) throw new Error(up.error.message);
  }
  const { data } = await SB.rpc('request_verification', { p_confirmed_name: '가상 신청자', p_lab_id: 'L3', p_description: '근거 확인 시험', p_proof: 'proof.pdf', p_file_key: key });
  return data;
}, bytes);

test('TC-07-08 근거 파일이 없거나 5MB를 넘으면 서버가 접수하지 않고, 정상 파일만 접수한다', async ({ page }) => {
  // 데모 신청자의 대기 요청(V2)을 반려해 새로 신청할 수 있게 한다
  await loginAs(page, '운영 보조');
  expect(await page.evaluate(async () => (await SB.rpc('decide_verification', { p_id: 'V2', p_decision: 'reject', p_reason: '시험용 반려' })).data.ok)).toBe(true);
  await logout(page);
  await loginAs(page, '관리자 신청자');

  const missing = await request(page, 0);
  expect(missing.ok).toBe(false);
  expect(missing.errors).toContainEqual(['proof', '위임 근거 PDF를 선택해주세요.']);

  const big = await request(page, 5_000_001);
  expect(big.ok).toBe(false);
  expect(big.errors).toContainEqual(['proof', '위임 근거는 5MB 이하의 PDF 파일이어야 해요.']);

  const ok = await request(page, 5_000_000);
  expect(ok).toMatchObject({ ok: true });
  await open(page, '#/verification');
  await expect(page.locator('#view')).toContainText('검토를 기다리고 있어요');
});
