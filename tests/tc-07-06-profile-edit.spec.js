// TC-07-06 (FR-07-06, 4.7.1): 학생은 이름·학년, 관리자는 이름만 바꿀 수 있다. 운영 보조는 바꿀 수 없다.
// 이름·학년을 바꿔도 제출한 지원서·인증 신청의 스냅샷과 승인·배정은 그대로다.
const { test, expect } = require('@playwright/test');
const { open, loginAs, resetDemo, clientAs, DEMO } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

const state = async (c) => (await c.rpc('get_state')).data;

test('TC-07-06 학생이 화면에서 이름·학년을 바꿔도 제출한 지원서의 프로필은 그대로다', async ({ page }) => {
  await loginAs(page, '학생');
  await open(page, '#/account');
  await expect(page.locator('#pf-declaration')).toHaveCount(0);   // 최초 자기확인은 일반 수정에서 해제할 수 없다
  await page.fill('#pf-name', '바뀐 학생');
  await page.selectOption('#pf-grade', '4');
  await page.click('#pf-submit');
  await expect(page.locator('#toast')).toContainText('프로필을 저장했어요');

  const s = await state(await clientAs(DEMO.student));
  expect(s.users[s.me]).toMatchObject({ name: '바뀐 학생', grade: 4, declaration: true, department: '소프트웨어학과', role: 'student' });
  expect(s.apps.A0102).toMatchObject({ student: '가상 학생', year: 3 });
});

test('TC-07-06 관리자는 이름만 바뀌고 인증 신청 스냅샷·승인·배정은 그대로다', async () => {
  const applicant = await clientAs(DEMO.applicant);
  expect((await applicant.rpc('save_profile', { p_name: '바뀐 신청자', p_grade: 2, p_declaration: true })).data.ok).toBe(true);
  let s = await state(applicant);
  expect(s.users[s.me]).toMatchObject({ name: '바뀐 신청자', grade: null, declaration: false, role: 'admin' });
  expect(s.vreqs.V2).toMatchObject({ nameSnapshot: '가상 신청자', status: '승인 대기' });

  const admin = await clientAs(DEMO.admin);
  expect((await admin.rpc('save_profile', { p_name: '바뀐 관리자', p_grade: null, p_declaration: false })).data.ok).toBe(true);
  s = await state(admin);
  expect(s.users[s.me]).toMatchObject({ name: '바뀐 관리자', assignedLabId: 'L1', approvedReqId: 'V1' });
  expect(s.vreqs.V1).toMatchObject({ nameSnapshot: '가상 관리자', status: '승인' });
});

test('TC-07-06 운영 보조는 프로필을 바꿀 수 없고, 다른 항목은 일반 수정으로 바꿀 수 없다', async ({ page }) => {
  const ops = await clientAs(DEMO.operator);
  expect((await ops.rpc('save_profile', { p_name: '바뀐 운영', p_grade: null, p_declaration: false })).data.ok).toBe(false);
  const os = await state(ops);
  expect(os.users[os.me].name).toBe('가상 운영 보조');

  // 이메일·역할·학과·배정은 저장 함수에 받는 칸이 없고, 테이블 직접 수정은 막혀 있다
  const student = await clientAs(DEMO.student);
  const extra = await student.rpc('save_profile', { p_name: '가상 학생', p_grade: 3, p_declaration: true, p_role: 'operator' });
  expect(extra.error).toBeTruthy();
  const direct = await student.from('profiles').update({ role: 'operator', department: '다른학과', assigned_lab_id: 'L1' }).eq('email', DEMO.student).select();
  expect(direct.error).toBeTruthy();
  const s = await state(student);
  expect(s.users[s.me]).toMatchObject({ role: 'student', department: '소프트웨어학과', assignedLabId: null, email: DEMO.student });

  await loginAs(page, '운영 보조');
  await open(page, '#/account');
  await expect(page.locator('#pf')).toHaveCount(0);
  await expect(page.locator('#profile')).toContainText('수정할 수 없어요');
});
