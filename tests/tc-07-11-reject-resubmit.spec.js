// TC-07-11 (FR-07-11): 반려에는 1~500자 사유가 필요하다. 반려 뒤 새로 신청하면 별도 ID와 이전 요청 연결이 생기고 과거 반려 내용은 그대로다.
const { test, expect } = require('@playwright/test');
const { open, settle, loginAs, logout, confirmDialog, resetDemo, clientAs, DEMO, SAMPLE_PDF } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

const REASON = '위임 확인서에 지도교수 서명이 없어요. 서명된 확인서로 다시 신청해주세요.';

test('TC-07-11 사유 없는 반려는 실패하고, 반려 뒤 보완 신청은 이전 요청과 연결된다', async ({ page }) => {
  // 서버도 빈 사유·501자 사유를 거절한다
  const ops = await clientAs(DEMO.operator);
  for (const reason of ['   ', '가'.repeat(501)]) {
    const { data } = await ops.rpc('decide_verification', { p_id: 'V2', p_decision: 'reject', p_reason: reason });
    expect(data.ok).toBe(false);
    expect(JSON.stringify(data.errors)).toContain('reason');
  }

  await loginAs(page, '운영 보조');
  await open(page, '#/ops/verifications?req=V2');
  await page.click('#ops-reject');
  await expect(page.locator('#ops-reason-err')).toContainText('반려 사유를 입력해주세요');
  await expect(page.locator('#dialog')).toBeHidden();
  await page.fill('#ops-reason', REASON);
  await page.click('#ops-reject');
  await confirmDialog(page);
  await expect(page.locator('#ops-detail')).toContainText(REASON);
  await logout(page);

  await loginAs(page, '관리자 신청자');
  await open(page, '#/verification');
  await expect(page.locator('#vr')).toContainText('이전 요청(V2)이 반려됐어요');
  await expect(page.locator('#vr')).toContainText(REASON);
  await page.selectOption('#vr-lab', 'L2');
  await page.fill('#vr-desc', '서명된 위임 확인서로 다시 신청합니다.');
  await page.setInputFiles('#vr-proof-input', SAMPLE_PDF);
  await page.click('#vr-submit');
  await confirmDialog(page);
  await settle(page);
  await expect(page.locator('#view')).toContainText('검토를 기다리고 있어요');

  const s = (await (await clientAs(DEMO.applicant)).rpc('get_state')).data;
  const added = Object.values(s.vreqs).find((v) => v.id !== 'V2');
  expect(added).toMatchObject({ status: '승인 대기', previousRequestId: 'V2', nameSnapshot: '가상 신청자' });
  expect(s.vreqs.V2).toMatchObject({ status: '반려', rejectionReason: REASON });
});
