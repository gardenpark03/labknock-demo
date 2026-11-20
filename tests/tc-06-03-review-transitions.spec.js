const { test, expect } = require('@playwright/test');
const { open, loginAs, resetDemo, confirmDialog, SAMPLE_PDF, clientAs, DEMO } = require('./helpers');

test.beforeEach(async () => { await resetDemo(); });

for (const finalState of ['합격', '불합격']) {
  test(`TC-06-03 · TC-04-05 금지 전이는 이력을 남기지 않고 ${finalState} 뒤 철회는 거절된다`, async ({ page }) => {
    await loginAs(page, '학생');
    await open(page, '#/lab/L1/R1');
    await page.click('#to-apply');
    await page.fill('#intro', '연구에 참여하고 싶습니다.');
    await page.selectOption('#course', '석사');
    await page.setInputFiles('#cv-input', SAMPLE_PDF);
    await page.click('#submit');
    await confirmDialog(page);
    await expect(page).toHaveURL(/#\/my\?app=A\d+$/);
    const key = new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('app');
    const admin = await clientAs(DEMO.admin);
    const student = await clientAs(DEMO.student);
    const history = async () => (await student.rpc('get_state').throwOnError()).data.apps[key].history;
    const decide = async (from, to) => (await admin.rpc('decide_application', {
      p_key: key, p_rec_id: 'R1', p_expected: from, p_next: to,
    }).throwOnError()).data.ok;

    const submitted = await history();
    expect(await decide('지원 완료', '합격')).toBe(false);
    expect(await history()).toEqual(submitted);
    expect(await decide('지원 완료', '검토 중')).toBe(true);
    expect(await decide('검토 중', '면담')).toBe(true);
    const interview = await history();
    expect(await decide('면담', '검토 중')).toBe(false);
    expect(await decide('검토 중', finalState)).toBe(false);
    expect(await history()).toEqual(interview);
    expect(await decide('면담', finalState)).toBe(true);

    const finalHistory = await history();
    expect(finalHistory.map(([status]) => status)).toEqual(['지원 완료', '검토 중', '면담', finalState]);
    const withdraw = await student.rpc('withdraw_application', { p_key: key, p_expected: finalState }).throwOnError();
    expect(withdraw.data.ok).toBe(false);
    expect(await history()).toEqual(finalHistory);
    await page.reload();
    await expect(page.locator('#my-detail .history li').last()).toContainText(finalState);
    await expect(page.locator('#withdraw')).toHaveCount(0);
  });
}
