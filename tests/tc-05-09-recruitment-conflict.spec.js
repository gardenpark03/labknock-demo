// TC-05-09 공고 동시 수정 충돌: 오래된 저장은 덮어쓰지 않고, 입력을 유지한 채 이유와 최신 내용 보기를 안내한다.
const { test, expect } = require('@playwright/test');
const { open, settle, loginAs, logout, confirmDialog, resetDemo, SAMPLE_PDF, clientAs, DEMO } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

test('TC-05-09 다른 곳에서 먼저 저장한 공고는 덮어쓰지 않고, 최신 내용을 불러올 수 있다', async ({ browser }) => {
  // 같은 연구실 관리자가 두 기기에서 같은 공고를 연 상황 (같은 브라우저의 두 탭은 뒤쪽 탭 요청이 늦게 나가므로 세션을 나눈다)
  const a = await (await browser.newContext()).newPage();
  await loginAs(a, '연구실 관리자');
  const b = await (await browser.newContext()).newPage();
  await loginAs(b, '연구실 관리자');
  await open(b, '#/admin/recruitments?rec=R6');
  await b.fill('#f-topic', 'B창에서 입력한 주제');

  await open(a, '#/admin/recruitments?rec=R6');
  await a.fill('#f-title', 'A창에서 먼저 바꾼 제목');
  await a.click('#save-draft');
  await expect(a.locator('#toast')).toContainText('초안을 저장했어요');

  // 재조회 연결이 끊겨도 저장 응답만으로 버전 충돌을 알려야 한다.
  await b.route('**/rpc/get_state', route => route.abort());
  await b.click('#save-draft');
  await expect(b.locator('#rec-alert')).toContainText('다른 곳에서 이 공고를 먼저 저장했어요');
  await expect(b.locator('#f-topic')).toHaveValue('B창에서 입력한 주제');
  await b.unroute('**/rpc/get_state');

  // 최신 내용 불러오기: 입력을 버린다는 확인 뒤 서버 값으로 다시 그린다
  await b.locator('#rec-alert button').click();
  await expect(b.locator('#dialog')).toBeVisible();
  await b.click('#dialog-ok');
  await settle(b);
  await expect(b.locator('#f-title')).toHaveValue('A창에서 먼저 바꾼 제목');
  await expect(b.locator('#f-topic')).toHaveValue('');
});

test('TC-05-09 수정하는 사이 첫 지원이 들어오면 일반 수정은 거절되고 고정 이유를 알린다 (B.4.2)', async ({ page, browser }) => {
  // 지원 0건인 모집 중 공고를 만든다
  await loginAs(page, '연구실 관리자');
  await open(page, '#/admin/recruitments?rec=R6');
  await page.fill('#f-topic', '거대 언어 모델 평가');
  await page.fill('#f-activity', '주 1회 미팅');
  await page.fill('#f-capacity', '2');
  await page.fill('#f-start', '2026-11-01');
  await page.fill('#f-end', '2026-12-31');
  await page.click('#publish');
  await confirmDialog(page);
  await expect(page.locator('#save-edit')).toBeVisible();
  await page.fill('#f-topic', '지원 전에 바꾸려던 주제');

  // 다른 브라우저에서 학생이 먼저 지원한다
  const ctx = await browser.newContext();
  const s = await ctx.newPage();
  await loginAs(s, '학생');
  await open(s, '#/lab/L1/R6');
  await s.click('#to-apply');
  await s.fill('#intro', '언어 모델 평가에 관심이 있습니다.');
  await s.selectOption('#course', '석사');
  await s.setInputFiles('#cv-input', SAMPLE_PDF);
  await s.click('#submit');
  await confirmDialog(s);
  await expect(s).toHaveURL(/#\/my\?app=/);
  await ctx.close();

  await page.click('#save-edit');
  await expect(page.locator('#rec-alert')).toContainText('첫 지원이 들어와 공고 항목이 고정됐어요');
  await expect(page.locator('#f-topic')).toHaveValue('지원 전에 바꾸려던 주제');
  await page.locator('#rec-alert button').click();
  await page.click('#dialog-ok');
  await settle(page);
  await expect(page.locator('#f-topic')).toHaveAttribute('readonly', '');
  await expect(page.locator('#extend')).toBeVisible();
  await logout(page);
});

test('TC-05-05 기간 연장 칸은 현재 마감일 다음 날부터 고를 수 있다', async ({ page }) => {
  await loginAs(page, '연구실 관리자');
  await open(page, '#/admin/recruitments?rec=R1');
  await expect(page.locator('#f-end')).toHaveAttribute('min', '2026-12-01');
});

test('TC-05-09 서버가 첫 지원 고정·게시 상태 불일치·마감 거절을 구분한다', async () => {
  const admin = await clientAs(DEMO.admin);
  const { data: state } = await admin.rpc('get_state').throwOnError();
  const save = async (id, action) => (await admin.rpc('save_recruitment', {
    p_id: id, p_saved_at: state.recs[id].savedAt, p_action: action, p_data: {}, p_detail: '',
  }).throwOnError()).data;
  expect(await save('R1', 'edit')).toMatchObject({ ok: false, code: 'conflict', reason: 'locked' });
  expect(await save('R6', 'close')).toMatchObject({ ok: false, code: 'conflict', reason: 'state' });
  expect((await save('R1', 'close')).ok).toBe(true);
  expect(await save('R1', 'extend')).toMatchObject({ ok: false, code: 'conflict', reason: 'closed' });
});
