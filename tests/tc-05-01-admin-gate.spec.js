// TC-05-01 (FR-05-01): 소속 인증이 승인되기 전의 관리자 신청자는 공고를 만들 수 없고 인증 안내를 본다.
const { test, expect } = require('@playwright/test');
const { open, loginAs, loginWith, resetDemo, clientAs, createUser, DEMO } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

test('TC-05-01 승인 대기 신청자는 모집 공고 관리 대신 인증 안내를 본다', async ({ page }) => {
  await loginAs(page, '관리자 신청자');
  await open(page, '#/admin/recruitments');
  await expect(page.locator('#view')).toContainText('연구실 소속 인증');
  await expect(page.locator('#view')).toContainText('승인 대기');
  await expect(page.locator('#view')).toContainText('승인 전에는 공고 초안도 만들 수 없어요');
});

test('TC-05-01 인증을 신청하지 않은 신청자는 인증 신청 안내를 본다', async ({ page }) => {
  const u = await createUser(`gate-${Date.now()}@skku.edu`, { role: 'admin' });
  await loginWith(page, u.email, u.password);
  await open(page, '#/admin/recruitments');
  await expect(page.locator('#view')).toContainText('신청 전');
  await expect(page.locator('#view a[href="#/verification"]')).toHaveText('연구실 인증 신청');
});

test('TC-05-01 반려된 신청자는 반려 사유와 재신청 안내를 보고, 초안을 만들 수 없다', async ({ page }) => {
  const reason = '위임 근거에 연구실 이름이 없어요.';
  await (await clientAs(DEMO.operator)).rpc('decide_verification', { p_id: 'V2', p_decision: 'reject', p_reason: reason });
  const draft = await (await clientAs(DEMO.applicant)).rpc('save_recruitment', { p_id: null, p_saved_at: null, p_action: 'draft', p_data: { title: '반려 뒤 공고' }, p_detail: '' });
  expect(draft.data.ok).toBe(false);

  await loginAs(page, '관리자 신청자');
  await open(page, '#/admin/recruitments');
  await expect(page.locator('#view')).toContainText('요청(V2)이 반려됐어요');
  await expect(page.locator('#view')).toContainText(reason);
  await expect(page.locator('#view a[href="#/verification"]')).toHaveText('보완해서 다시 신청');
});
