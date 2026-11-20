// TC-07-12 (FR-07-12): 운영 보조 두 창이 같은 대기 요청을 동시에 승인·반려하면 먼저 확정된 판정 하나만 남고,
// 배정 상태가 최종 판정과 어긋나지 않는다. 늦은 판정은 최신 결과를 안내받는다.
const { test, expect } = require('@playwright/test');
const { resetDemo, clientAs, DEMO } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

for (let round = 1; round <= 3; round += 1) {
  test(`TC-07-12 승인과 반려를 동시에 확정해도 판정은 하나다 (${round}회차)`, async () => {
    const [a, b] = await Promise.all([clientAs(DEMO.operator), clientAs(DEMO.operator)]);
    const [approve, reject] = await Promise.all([
      a.rpc('decide_verification', { p_id: 'V2', p_decision: 'approve', p_reason: '' }),
      b.rpc('decide_verification', { p_id: 'V2', p_decision: 'reject', p_reason: '증빙을 보완해주세요.' }),
    ]);
    const results = [approve.data, reject.data];
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ code: 'race' });

    const s = (await (await clientAs(DEMO.applicant)).rpc('get_state')).data;
    const me = s.users[s.me];
    if (approve.data.ok) {
      expect(s.vreqs.V2).toMatchObject({ status: '승인', rejectionReason: '' });
      expect(me).toMatchObject({ assignedLabId: 'L2', approvedReqId: 'V2' });
    } else {
      expect(s.vreqs.V2).toMatchObject({ status: '반려', rejectionReason: '증빙을 보완해주세요.' });
      expect(me).toMatchObject({ assignedLabId: null, approvedReqId: null });
    }
  });
}
