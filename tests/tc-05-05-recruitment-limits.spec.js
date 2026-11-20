const { test, expect } = require('@playwright/test');
const { resetDemo, clientAs, DEMO, open, loginAs, confirmDialog, SAMPLE_PDF } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

function day(offset) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

async function readRec(admin) {
  return (await admin.rpc('get_state').throwOnError()).data.recs.R6;
}

async function save(admin, rec, action, data = {}) {
  return (await admin.rpc('save_recruitment', {
    p_id: 'R6', p_saved_at: rec.savedAt, p_action: action, p_data: data, p_detail: '',
  }).throwOnError()).data;
}

async function publish(admin, start) {
  const fields = { title: '공고 변경 시험', topic: '연구 주제', activity: '세미나', skills: '통계',
    capacity: 2, start, end: day(10) };
  expect((await save(admin, await readRec(admin), 'publish', fields)).ok).toBe(true);
  return fields;
}

async function apply(page) {
  await loginAs(page, '학생');
  await open(page, '#/lab/L1/R6');
  await page.click('#to-apply');
  await page.fill('#intro', '세미나에 참여하고 싶습니다.');
  await page.selectOption('#course', '석사');
  await page.setInputFiles('#cv-input', SAMPLE_PDF);
  await page.click('#submit');
  await confirmDialog(page);
  await expect(page).toHaveURL(/#\/my\?app=A\d+$/);
}

test('TC-05-05 첫 지원과 전원 철회 뒤에도 일반 항목은 고정되고, 마감 전 연장만 허용된다', async ({ page }) => {
  const admin = await clientAs(DEMO.admin);
  const fields = await publish(admin, day(-2));
  await apply(page);
  const initial = await readRec(admin);
  const changes = { title: '새 제목', topic: '새 주제', activity: '면담', skills: '수학', capacity: 3, start: day(-3) };
  async function expectLocked() {
    for (const [field, value] of Object.entries(changes)) {
      const result = await save(admin, initial, 'edit', { ...fields, [field]: value });
      expect(result.ok, field).toBe(false);
    }
    expect(await readRec(admin)).toEqual(initial);
  }
  await expectLocked();
  await page.click('#withdraw');
  await confirmDialog(page);
  await expect(page.locator('#my-detail .history li').last()).toContainText('철회');
  await expectLocked();

  for (const end of [day(9), initial.end]) {
    const result = await save(admin, initial, 'extend', { end });
    expect(result.errors[0][0]).toBe('end');
    expect(await readRec(admin)).toEqual(initial);
  }
  const end = day(12);
  expect((await save(admin, initial, 'extend', { end })).ok).toBe(true);
  const extended = await readRec(admin);
  expect(extended.end).toBe(end);
  expect(extended.log.slice(0, -1)).toEqual(initial.log);
  expect(extended.log.at(-1)[0]).toBe('기간 연장');
});

test('TC-05-05 · TC-04-04 조기 마감 후 공고 수정은 거절되고 진행 지원은 철회할 수 있다', async ({ page }) => {
  const admin = await clientAs(DEMO.admin);
  const fields = await publish(admin, day(-2));
  await apply(page);
  const before = await readRec(admin);
  expect((await save(admin, before, 'close')).ok).toBe(true);
  const closed = await readRec(admin);
  expect(closed.earlyClosedAt).toBeTruthy();
  expect(closed.log.slice(0, -1)).toEqual(before.log);
  expect(closed.log.at(-1)[0]).toBe('조기 마감');
  expect((await save(admin, closed, 'edit', { ...fields, title: '수정' })).ok).toBe(false);
  expect((await save(admin, closed, 'extend', { end: day(12) })).ok).toBe(false);
  expect((await save(admin, closed, 'close')).ok).toBe(false);
  expect(await readRec(admin)).toEqual(closed);

  await page.reload();
  await page.click('#withdraw');
  await confirmDialog(page);
  await expect(page.locator('#my-detail .history li').last()).toContainText('철회');
});

test('TC-05-05 모집 예정이면 조기 마감은 거절하고 기간 연장은 허용한다', async () => {
  const admin = await clientAs(DEMO.admin);
  await publish(admin, day(3));
  const planned = await readRec(admin);
  expect((await save(admin, planned, 'close')).ok).toBe(false);
  expect(await readRec(admin)).toEqual(planned);
  const end = day(12);
  expect((await save(admin, planned, 'extend', { end })).ok).toBe(true);
  expect((await readRec(admin)).end).toBe(end);
});
