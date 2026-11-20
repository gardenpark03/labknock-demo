// TC-07-09 (FR-07-09, 6.4): 운영 보조는 소관 학과의 인증 요청만 보고 판정한다.
// 지원서·CV·심사·공고 편집은 할 수 없다.
// 시연 데이터의 연구실은 모두 소프트웨어학과라서, 다른 학과 요청 사례는 이 시험에 없다.
const { test, expect } = require('@playwright/test');
const { resetDemo, clientAs, DEMO } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

test('TC-07-09 운영 보조는 인증 요청만 받고 지원서·공고 초안은 받지 않는다', async () => {
  const c = await clientAs(DEMO.operator);
  const s = (await c.rpc('get_state')).data;
  expect(Object.keys(s.vreqs).sort()).toEqual(['V1', 'V2']);
  expect(Object.keys(s.apps)).toHaveLength(0);
  expect(s.recs.R6).toBeUndefined();
});

test('TC-07-09 운영 보조의 심사·공고 변경 요청은 거절되고 기존 상태는 그대로다', async () => {
  const c = await clientAs(DEMO.operator);
  expect((await c.rpc('decide_application', { p_key: 'A0102', p_rec_id: 'R2', p_expected: '검토 중', p_next: '합격' })).data.ok).toBe(false);
  expect((await c.rpc('save_recruitment', { p_id: null, p_saved_at: null, p_action: 'draft', p_data: { title: '운영 보조 공고' }, p_detail: '' })).data.ok).toBe(false);
  // 판정이 끝난 요청은 다시 판정할 수 없다
  expect((await c.rpc('decide_verification', { p_id: 'V1', p_decision: 'reject', p_reason: '다시 판정' })).data).toMatchObject({ ok: false, code: 'race' });

  const st = (await (await clientAs(DEMO.student)).rpc('get_state')).data;
  expect(st.apps.A0102.history.at(-1)[0]).toBe('검토 중');
  const admin = (await (await clientAs(DEMO.admin)).rpc('get_state')).data;
  expect(admin.users[admin.me]).toMatchObject({ assignedLabId: 'L1', approvedReqId: 'V1' });
});

test('TC-07-09 운영 보조는 학생 지원 파일의 서명 주소를 만들 수 없다', async () => {
  const student = await clientAs(DEMO.student);
  const { data: { user } } = await student.auth.getUser();
  const path = `${user.id}/scope-${Date.now()}/cv.pdf`;   // 초기화가 Storage는 비우지 않으므로 매번 새 경로
  const up = await student.storage.from('files').upload(path, new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), { contentType: 'application/pdf' });
  expect(up.error).toBeNull();
  const ops = await clientAs(DEMO.operator);
  const signed = await ops.storage.from('files').createSignedUrl(path, 60);
  expect(signed.data).toBeNull();
});
