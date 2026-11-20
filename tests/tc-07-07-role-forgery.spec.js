// TC-07-07 (FR-07-07): 클라이언트가 보낸 역할 값으로 권한이 늘지 않고, 승인 전 관리자는 연구실 업무를 할 수 없다.
const { test, expect } = require('@playwright/test');
const { resetDemo, createUser, clientAs, DEMO } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

const draft = { p_id: null, p_saved_at: null, p_action: 'draft', p_data: { title: '위조 공고' }, p_detail: '' };

test('TC-07-07 가입 때 역할을 운영 보조로 보내도 학생 계정으로 만들어진다', async () => {
  const u = await createUser(`forge-${Date.now()}@g.skku.edu`, { role: 'operator' });
  const c = await clientAs(u.email, u.password);
  const s = (await c.rpc('get_state')).data;
  expect(s.users[s.me].role).toBe('student');
  expect((await c.rpc('decide_verification', { p_id: 'V2', p_decision: 'approve', p_reason: '' })).data.ok).toBe(false);
});

test('TC-07-07 승인 전 관리자 신청자는 공고 작성·심사·자기 승인을 할 수 없다', async () => {
  const c = await clientAs(DEMO.applicant);
  expect((await c.rpc('save_recruitment', draft)).data).toMatchObject({ ok: false, code: 'login' });
  expect((await c.rpc('decide_application', { p_key: 'A0102', p_rec_id: 'R2', p_expected: '검토 중', p_next: '합격' })).data).toMatchObject({ ok: false });
  expect((await c.rpc('decide_verification', { p_id: 'V2', p_decision: 'approve', p_reason: '' })).data.ok).toBe(false);

  const s = (await c.rpc('get_state')).data;
  expect(s.users[s.me]).toMatchObject({ assignedLabId: null });
  expect(s.vreqs.V2.status).toBe('승인 대기');
  expect(Object.keys(s.apps)).toHaveLength(0);
  expect(s.recs.R6).toBeUndefined();   // 승인된 연구실의 초안은 보이지 않는다
});
