// TC-06-05 (FR-06-05, BR-10): 관리자가 지원서를 열어 본 뒤 학생이 철회하면, 관리자는 접수번호·제출일·철회일·철회 상태만 받는다.
// 이름·이메일·프로필·본문·첨부·개별 이력은 서버가 보내지 않고, 첨부의 새 서명 주소도 만들 수 없다.
const { test, expect } = require('@playwright/test');
const { open, settle, loginAs, confirmDialog, resetDemo, SAMPLE_PDF } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

const signCv = (page, path) => page.evaluate(async (p) => (await SB.storage.from('files').createSignedUrl(p, 60)).data !== null, path);
const appOf = (page, key) => page.evaluate((k) => S.apps[k], key);

test('TC-06-05 학생이 철회하면 관리자는 허용된 네 항목만 받고 첨부를 새로 열 수 없다', async ({ browser }) => {
  const student = await (await browser.newContext()).newPage();
  const admin = await (await browser.newContext()).newPage();

  await loginAs(student, '학생');
  await open(student, '#/lab/L1/R1');
  await student.click('#to-apply');
  await student.fill('#intro', '철회 열람 제한 시험용 지원서입니다.');
  await student.selectOption('#course', '미정');
  await student.setInputFiles('#cv-input', SAMPLE_PDF);
  await student.click('#submit');
  await confirmDialog(student);
  const key = new URL(student.url()).hash.match(/app=(A\d+)/)[1];
  const cvPath = await student.evaluate((k) => { const a = S.apps[k]; return `${a.studentId}/${a.fileKey}/cv.pdf`; }, key);

  // 철회 전: 관리자는 지원서 전체와 첨부를 연다
  await loginAs(admin, '연구실 관리자');
  await open(admin, `#/admin/applicants?rec=R1&app=${key}`);
  await expect(admin.locator('#view')).toContainText('철회 열람 제한 시험용 지원서입니다.');
  expect(await signCv(admin, cvPath)).toBe(true);

  await open(student, `#/my?app=${key}`);
  await student.click('#withdraw');
  await confirmDialog(student);
  await expect(student.locator('#toast')).toContainText('지원을 철회했어요');

  // 철회 뒤: 같은 주소로 다시 열면 네 항목만 남는다
  await admin.reload();
  await settle(admin);
  const a = await appOf(admin, key);
  expect(Object.keys(a).sort()).toEqual(['history', 'id', 'rec', 'submittedAt']);
  expect(a.history).toHaveLength(1);
  expect(a.history[0][0]).toBe('철회');
  const detail = admin.locator('#rv-detail');
  await expect(detail).toContainText('접수번호와 날짜만 볼 수 있어요');
  await expect(detail).not.toContainText('철회 열람 제한 시험용 지원서입니다.');
  await expect(detail).not.toContainText('가상 학생');
  await expect(detail).not.toContainText('student-a@g.skku.edu');
  expect(await signCv(admin, cvPath)).toBe(false);

  // 학생 본인은 제출 내용과 첨부를 그대로 본다 (FR-04-02)
  await student.reload();
  await settle(student);
  const mine = await appOf(student, key);
  expect(mine).toMatchObject({ student: '가상 학생', intro: '철회 열람 제한 시험용 지원서입니다.' });
  expect(await signCv(student, cvPath)).toBe(true);
});

test('TC-06-05 시연 데이터의 철회 지원서(A0100)도 관리자에게 식별정보를 보내지 않는다', async ({ page }) => {
  await loginAs(page, '연구실 관리자');
  await open(page, '#/admin/applicants?rec=R1&app=A0100');
  const a = await appOf(page, 'A0100');
  expect(a).toEqual({ id: 'A-0100', rec: 'R1', submittedAt: expect.any(String), history: [['철회', expect.any(String)]] });
  await expect(page.locator('#rv-detail')).toContainText('접수번호와 날짜만 볼 수 있어요');
  await expect(page.locator('#view')).not.toContainText('가상 학생 D');
  // 철회되지 않은 지원서는 그대로 받는다
  expect(await appOf(page, 'A0098')).toMatchObject({ student: '가상 학생 B', email: 'student-b@g.skku.edu' });
});
