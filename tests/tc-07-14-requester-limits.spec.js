// TC-07-14 (FR-07-14): 신청자는 본인 인증 요청만 본다. 승인된 관리자는 다른 연구실을 추가로 신청하거나 배정을 바꿀 수 없다.
const { test, expect } = require('@playwright/test');
const { resetDemo, createUser, clientAs, DEMO } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

const request = (c, name, lab) => c.rpc('request_verification', { p_confirmed_name: name, p_lab_id: lab, p_description: '추가 신청', p_proof: 'proof.pdf', p_file_key: 'k1' });

test('TC-07-14 신청자는 다른 사람의 인증 요청을 받지 못한다', async () => {
  const applicant = (await (await clientAs(DEMO.applicant)).rpc('get_state')).data;
  expect(Object.keys(applicant.vreqs)).toEqual(['V2']);
  expect(Object.keys(applicant.users)).toEqual([applicant.me]);

  // 요청이 없는 새 신청자는 아무 요청도 받지 않는다
  const u = await createUser(`limits-${Date.now()}@skku.edu`, { role: 'admin' });
  const fresh = (await (await clientAs(u.email, u.password)).rpc('get_state')).data;
  expect(fresh.vreqs).toEqual({});
});

test('TC-07-14 승인된 관리자의 추가 신청과 대기 중 중복 신청은 거절되고 배정은 그대로다', async () => {
  const admin = await clientAs(DEMO.admin);
  expect((await request(admin, '가상 관리자', 'L2')).data).toMatchObject({ ok: false, message: expect.stringContaining('이미 연구실이 배정된') });
  const direct = await admin.from('profiles').update({ assigned_lab_id: 'L2' }).eq('email', DEMO.admin).select();
  expect(direct.error).toBeTruthy();
  const s = (await admin.rpc('get_state')).data;
  expect(s.users[s.me]).toMatchObject({ assignedLabId: 'L1', approvedReqId: 'V1' });

  const applicant = await clientAs(DEMO.applicant);
  expect((await request(applicant, '가상 신청자', 'L3')).data).toMatchObject({ ok: false, message: expect.stringContaining('승인 대기 중인 요청') });
  const a = (await applicant.rpc('get_state')).data;
  expect(Object.keys(a.vreqs)).toEqual(['V2']);
});
