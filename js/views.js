/* LabKnock · 화면
 * 공개(탐색·상세) / 학생(지원서·내 지원 현황) / 계정(로그인·가입·이메일 확인·내 정보)
 * 연구실 관리자(인증·공고·심사) / 운영 보조(인증 검토) */
'use strict';

// ---------- 공통 조각 ----------
const head = (title, desc = '') => `<div class="page-head"><h1 class="lk-title">${title}</h1>${desc ? `<p class="lk-description">${desc}</p>` : ''}</div>`;
const panelMsg = (title, desc = '', actions = '') => `<div class="lk-panel lk-empty"><p class="lk-item-title">${title}</p>${desc ? `<p class="lk-description" style="margin-top:8px">${desc}</p>` : ''}${actions ? `<div class="empty-actions">${actions}</div>` : ''}</div>`;
function notAllowed(view, u) {
  view.innerHTML = panelMsg('이 계정으로는 볼 수 없는 화면이에요.', u ? `${roleLabel(u)} 계정은 이 화면을 쓸 수 없어요.` : '', `<a class="lk-button lk-button--secondary" href="${homeOf(u)}">첫 화면으로</a>`);
}
function viewNotFound(view, u) {
  view.innerHTML = panelMsg('페이지를 찾을 수 없어요.', '주소가 바뀌었거나 없는 페이지예요.', `<a class="lk-button lk-button--secondary" href="${homeOf(u)}">첫 화면으로</a>`);
}
function on(sel, fn) { const el = $(sel); if (el) el.addEventListener('click', fn); }

// 입력칸: label은 입력 위에, 필수·선택 표시와 오류 문구를 입력과 연결한다 (3.1.9)
function field({ id, label, type = 'text', value = '', req = true, note = '', attrs = '', help = '' }) {
  const mark = req === null ? '' : req === true ? '<span class="req">필수</span>' : req ? `<span class="req">${req}</span>` : '<span class="opt">선택</span>';
  return `<div class="lk-field"><label class="lk-label" for="${id}">${label}${mark}${note ? `<span class="opt">${note}</span>` : ''}</label>
    <input class="lk-input" id="${id}" type="${type}" value="${esc(value)}" aria-describedby="${help ? `${id}-help ` : ''}${id}-err" ${attrs}>
    ${help ? `<p class="lk-help" id="${id}-help">${help}</p>` : ''}
    <p class="lk-error" id="${id}-err" hidden></p></div>`;
}
// 서버가 돌려준 칸별 오류를 각 칸 아래에 보여 주고 첫 오류 칸으로 이동한다 (InlineError)
function applyErrors(prefix, errors) {
  $$(`.lk-error[id^="${prefix}-"]`).forEach((e) => { if (e.id.endsWith('-err')) { e.hidden = true; e.textContent = ''; } });
  $$(`[id^="${prefix}-"][aria-invalid]`).forEach((x) => x.removeAttribute('aria-invalid'));
  errors.forEach(([k, msg]) => {
    const err = $(`#${prefix}-${k}-err`);
    const ctl = $(`#${prefix}-${k}`) || $(`#${prefix}-${k}-box`);
    if (err) { err.textContent = msg; err.hidden = false; }
    if (ctl) ctl.setAttribute('aria-invalid', 'true');
  });
  if (!errors.length) return;
  const first = $(`#${prefix}-${errors[0][0]}`) || $(`#${prefix}-${errors[0][0]}-box`);
  if (!first) return;
  const target = first.matches('fieldset, .file-box, .readonly-value') ? (first.querySelector('input, button, a') || first) : first;
  target.focus();
  target.scrollIntoView({ block: 'center' });
}
function clearFieldError(el) {
  if (!el || !el.id) return;
  el.removeAttribute('aria-invalid');
  const er = $(`#${el.id}-err`); if (er) { er.hidden = true; er.textContent = ''; }
}
function showErr(el, box, msg) { el.textContent = msg; el.hidden = false; box.setAttribute('aria-invalid', 'true'); }
function clearErr(el, box) { el.hidden = true; el.textContent = ''; box.removeAttribute('aria-invalid'); }

function progress(steps, current, label) {
  return `<ol class="stepper" aria-label="${label}">${steps.map((s, i) => {
    const cls = i < current ? 'is-done' : i === current ? 'is-current' : '';
    const sr = i < current ? '완료' : i === current ? '현재 단계' : '아직 아님';
    return `<li class="stepper__item ${cls}"><span class="stepper__bar"></span><span class="stepper__label">${s}</span><span class="sr-only">${sr}</span></li>`;
  }).join('')}</ol>`;
}
// 지원서 진행 단계: 면담은 거치지 않을 수 있고, 철회는 종료 상태다 (부록 B.2)
function stepper(a) {
  const hist = a.history.map(([st]) => st);
  const s = appStatus(a);
  const withdrawn = s === '철회';
  const result = hist.find((x) => x === '합격' || x === '불합격');
  const current = { '지원 완료': 0, '검토 중': 1, '면담': 2, '합격': 3, '불합격': 3, '철회': 3 }[s];
  const steps = [
    ['지원 완료', hist.includes('지원 완료'), ''],
    ['검토 중', hist.includes('검토 중'), ''],
    ['면담', hist.includes('면담'), hist.includes('면담') || withdrawn ? '' : result ? '생략' : '해당 시'],
    withdrawn ? ['철회', true, '지원 종료'] : ['최종 결과', !!result, result || ''],
  ];
  return `<ol class="stepper" aria-label="진행 단계">${steps.map(([label, reached, sub], i) => {
    const cls = i === current ? (withdrawn ? 'is-ended' : 'is-current') : reached ? 'is-done' : '';
    const sr = i === current ? (withdrawn ? '종료' : '현재 단계') : reached ? '완료' : '아직 아님';
    return `<li class="stepper__item ${cls}"><span class="stepper__bar"></span><span class="stepper__label">${label}</span>${sub ? `<span class="stepper__sub">${sub}</span>` : ''}<span class="sr-only">${sr}</span></li>`;
  }).join('')}</ol>`;
}

// 파일 선택 칸
function fileField(key, label, required, { bare = false, help = '' } = {}) {
  return `<div class="lk-field">${bare ? '' : `<span class="lk-label" id="${key}-label">${label}${required ? '<span class="req">필수</span>' : '<span class="opt">선택</span>'}</span>`}
    <div class="file-box" id="${key}-box" tabindex="-1" role="group" ${bare ? `aria-label="${label}"` : `aria-labelledby="${key}-label"`} aria-describedby="${help ? `${key}-help ` : ''}${key}-err">
      <span class="file-box__name empty">선택한 파일 없음</span>
      <button type="button" class="lk-button lk-button--secondary small-btn pick-btn">파일 선택</button>
      <button type="button" class="lk-button lk-button--secondary small-btn clear-btn" hidden>선택 취소</button>
    </div>
    <input type="file" id="${key}-input" accept="application/pdf,.pdf" hidden>
    ${help ? `<p class="lk-help" id="${key}-help">${help}</p>` : ''}
    <p class="lk-error" id="${key}-err" hidden></p></div>`;
}
// 파일 칸 동작: PDF 형식·크기를 고를 때 바로 검사한다 (6.1)
function wireFileField(key, maxBytes, state, onChange) {
  const box = $(`#${key}-box`); const input = $(`#${key}-input`); const errEl = $(`#${key}-err`);
  const paint = () => {
    const file = state[key];
    $('.file-box__name', box).textContent = file ? `${file.name} · PDF · ${fmtSize(file.size)}` : '선택한 파일 없음';
    $('.file-box__name', box).classList.toggle('empty', !file);
    $('.pick-btn', box).hidden = !!file;
    $('.clear-btn', box).hidden = !file;
  };
  input.addEventListener('change', async () => {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) { showErr(errEl, box, 'PDF 파일을 선택해주세요.'); return; }
    if (file.size < 1 || file.size > maxBytes) { showErr(errEl, box, `파일은 ${maxBytes / 1e6}MB 이하여야 해요. 용량을 줄여 다시 선택해주세요.`); return; }
    // 확장자만 바꾼 파일을 거르기 위해 실제 내용이 PDF로 시작하는지 확인한다
    let head = '';
    try { head = await file.slice(0, 5).text(); } catch { head = ''; }
    if (head !== '%PDF-') { showErr(errEl, box, 'PDF 형식이 아닌 파일이에요. 실제 PDF 파일을 선택해주세요.'); return; }
    if (!box.isConnected) return;
    state[key] = file; clearErr(errEl, box); paint(); onChange();
    $('.clear-btn', box).focus(); // 누른 버튼이 사라지므로 바로 옆 버튼으로 포커스를 옮긴다
  });
  $('.pick-btn', box).addEventListener('click', () => input.click());
  $('.clear-btn', box).addEventListener('click', () => { state[key] = null; paint(); onChange(); $('.pick-btn', box).focus(); });
  paint();
}

// 첨부 링크: 미리 넣은 가상 지원서는 예시 PDF로, 새로 제출한 지원서는 서버(Storage)에 올린 파일로 연다
const SAMPLE_FILES = { 'CV.pdf': 'assets/samples/sample-cv.pdf', '성적증명서.pdf': 'assets/samples/sample-transcript.pdf' };
function fileLinks(key, a) {
  if (!a.files.length) return '없음';
  return a.files.map((f) => {
    const name = typeof f === 'string' ? f : f.name;
    if (/^https:/.test(name)) return `<a class="lk-link" href="${esc(name)}" target="_blank" rel="noopener noreferrer">포트폴리오 링크 열기</a>`;
    if (a.sample && SAMPLE_FILES[name]) return `<a class="lk-link" href="${SAMPLE_FILES[name]}" target="_blank" rel="noopener">${esc(name)} 보기</a>`;
    const slot = typeof f === 'string' ? f : f.slot;
    if (!a.fileKey || !a.studentId) return esc(name);
    return `<a class="lk-link" href="#" data-file="${esc(filePath(a.studentId, a.fileKey, slot))}" data-name="${esc(name)}" aria-disabled="true">${esc(name)} 보기</a>`;
  }).join(' · ');
}
const proofLink = (r) => (r.sample
  ? `<a class="lk-link" href="${r.sample}" target="_blank" rel="noopener">${esc(r.proof)} 보기</a>`
  : r.fileKey ? `<a class="lk-link" href="#" data-file="${esc(filePath(r.requesterId, r.fileKey, 'proof'))}" data-name="${esc(r.proof)}" aria-disabled="true">${esc(r.proof)} 보기</a>` : esc(r.proof));

// ---------- 홈 (SRS 화면 목록 밖의 소개 화면) ----------
// 처음 온 사람이 서비스와 진행 방식을 이해하고 탐색(UI-01)으로 들어가게 한다.
// 모집 정보는 탐색과 같은 데이터·규칙(게시된 공고, 모집 상태, D-day)으로만 보여 주고 새 업무 규칙은 만들지 않는다.
const HOW_STEPS = [
  ['가입과 이메일 확인', '학교 이메일로 가입하고 메일로 받은 링크를 눌러 확인해요. 이름·학년과 학부생 자기확인으로 프로필도 완성해요.'],
  ['연구실 찾기', '연구 분야와 모집 상태로 공고를 찾고, 연구 주제와 요구 역량, 모집기간을 살펴봐요.'],
  ['지원서 제출', '자기소개를 쓰고 진학 희망 과정을 고른 뒤 CV를 PDF로 첨부해요. 성적증명서와 포트폴리오는 선택이에요.'],
  ['진행 상황 확인', '내 지원 현황에서 진행 단계와 상태 이력을 확인해요. 제출한 내용도 다시 볼 수 있어요.'],
];
const LAB_STEPS = [
  ['관리자 신청자로 가입', '학교 이메일로 가입해 이메일을 확인하고 이름을 입력해요.'],
  ['연구실 소속 인증 신청', '관리할 연구실을 고르고, 소속 설명과 관리 위임을 확인할 수 있는 PDF를 올려요.'],
  ['운영 보조 검토', '운영 보조가 자료를 확인해 승인하거나 사유와 함께 반려해요. 반려되면 다시 신청할 수 있어요.'],
  ['공고 게시와 지원자 심사', '승인되면 배정된 연구실의 공고를 올리고, 지원서를 검토해 면담이나 합격·불합격으로 처리해요.'],
];
const HOME_FAQ = [
  ['누가 지원할 수 있나요?', '소프트웨어학과 학부생이 대상이에요. 학교 이메일(skku.edu·g.skku.edu)로 가입해 이메일을 확인하고, 이름·학년과 학부생 자기확인으로 프로필을 완성하면 지원할 수 있어요.'],
  ['제출한 지원서를 고치거나 취소할 수 있나요?', '제출한 내용은 고칠 수 없어요. 지원 완료·검토 중·면담 단계에서는 내 지원 현황에서 철회할 수 있어요. 철회는 되돌릴 수 없고, 철회한 공고에는 다시 지원할 수 없어요.'],
  ['결과는 어떻게 알 수 있나요?', '내 지원 현황에서 진행 단계와 상태 이력을 확인해요. 면담은 연구실이 필요할 때만 진행하고, 일정은 연구실이 따로 안내해요. 랩노크는 따로 알림을 보내지 않아요.'],
  ['모집 공고는 누가 올리나요?', '연구실 소속 인증을 승인받은 연구실 관리자만 자기 연구실의 공고를 올리고 지원자를 심사해요. 제출한 지원서는 본인과 해당 연구실 관리자만 볼 수 있어요.'],
  ['실제로 운영하는 서비스인가요?', '소프트웨어공학개론 팀 프로젝트의 시연용 서비스예요. 모든 인물·연구실·공고는 가상이고, 입력한 내용은 지금 쓰는 브라우저에만 저장돼요. 실제 메일도 보내지 않아요.'],
];
const CHEVRON = '<svg class="chev" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function viewHome(view, q, u) {
  const recs = publicRecs();
  const count = (s) => recs.filter((r) => r.status === s).length;
  // 마감이 가까운 순: 모집 중인 공고만, 마감일 → 연구실 이름 순
  const soon = recs.filter((r) => r.status === '모집 중')
    .sort((a, b) => a.end.localeCompare(b.end) || S.labs[a.lab].name.localeCompare(S.labs[b.lab].name, 'ko') || a.id.localeCompare(b.id))
    .slice(0, 3);
  const isStudent = !!u && u.role === 'student';
  const howActions = !u
    ? '<a class="lk-button" href="#/signup?role=student">학생으로 가입하기</a><a class="lk-button lk-button--secondary" href="#/labs">연구실 먼저 둘러보기</a>'
    : isStudent ? '<a class="lk-button" href="#/labs">연구실 탐색</a><a class="lk-button lk-button--secondary" href="#/my">내 지원 현황</a>' : '';
  const labAction = !u ? '<a class="lk-button" href="#/signup?role=admin">관리자 신청자로 가입하기</a>'
    : isApprovedAdmin(u) ? '<a class="lk-button" href="#/admin/recruitments">모집 공고 관리</a>'
    : isAdmin(u) ? '<a class="lk-button" href="#/verification">연구실 소속 인증</a>' : '';
  const step = ([t, d], i) => `<li><span class="step-num" aria-hidden="true">${i + 1}</span><div class="step-text"><h3>${t}</h3><p>${d}</p></div></li>`;
  const statusLink = (s) => `<a class="status-link" href="#/labs?${new URLSearchParams({ status: s })}">${s} <span class="lk-tabular">${count(s)}건</span></a>`;

  view.innerHTML = `
    ${meStrip(u)}
    <div class="home-hero">
      <section class="home-intro" aria-labelledby="home-title">
        <p class="eyebrow">소프트웨어학과 학부연구생 모집·지원</p>
        <h1 class="lk-title" id="home-title">관심 있는 연구실을 찾고,<br>지원까지 한 곳에서</h1>
        <p class="home-lead">연구실이 직접 올린 학부연구생 모집 공고를 한곳에서 보고, 지원서 제출부터 결과 확인까지 랩노크에서 이어서 할 수 있어요.</p>
        <form class="home-search" id="home-search" role="search" novalidate>
          <label class="lk-label" for="home-q">연구실 이름 또는 연구 분야로 찾기</label>
          <div class="home-search__row">
            <input class="lk-input" id="home-q" placeholder="예: 인공지능" autocomplete="off" aria-describedby="home-q-err">
            <button class="lk-button" type="submit">검색</button>
          </div>
          <p class="lk-error" id="home-q-err" hidden></p>
        </form>
        <div class="home-browse">
          <p class="lk-label" id="home-fields">연구 분야</p>
          <ul class="chip-list" aria-labelledby="home-fields">${recFields().map((f) => `<li><a class="chip" href="#/labs?${new URLSearchParams({ field: f })}">${esc(f)}</a></li>`).join('')}</ul>
        </div>
      </section>
      <aside class="lk-panel soon" aria-labelledby="soon-title">
        <h2 class="lk-item-title" id="soon-title">마감이 가까운 공고</h2>
        ${soon.length ? `<ol class="soon__list">${soon.map((r) => `
          <li><a class="soon__item" href="#/lab/${r.lab}/${r.id}?back=">
            <span class="soon__lab">${esc(S.labs[r.lab].name)}</span>
            <span class="soon__title">${esc(r.title)}</span>
            <span class="soon__due lk-tabular"><span class="dday">${dday(r)}</span>${fmtDate(r.end)}까지</span>
          </a></li>`).join('')}</ol>` : '<p class="lk-description">지금 모집 중인 공고가 없어요.</p>'}
        <div class="soon__status" role="group" aria-label="모집 상태별 공고">${['모집 중', '모집 예정', '마감'].map(statusLink).join('')}</div>
        <a class="detail-link" href="#/labs">모집 공고 전체 보기 ›</a>
      </aside>
    </div>
    <section class="home-section" id="home-how" aria-labelledby="how-title">
      <div class="home-section__head">
        <h2 class="lk-section-title" id="how-title">학생은 이렇게 지원해요</h2>
        <p class="lk-description">가입부터 결과 확인까지 랩노크 안에서 이어져요.</p>
      </div>
      <ol class="steps">${HOW_STEPS.map(step).join('')}</ol>
      ${howActions ? `<div class="section-actions">${howActions}</div>` : ''}
    </section>
    <section class="home-section" id="home-lab" aria-labelledby="lab-title">
      <div class="lab-guide">
        <div class="lab-guide__intro">
          <h2 class="lk-section-title" id="lab-title">연구실 관리자라면</h2>
          <p class="lk-description">교수 또는 연구실을 대표하는 대학원생이 연구실 소속 인증을 받으면, 자기 연구실의 모집 공고를 올리고 지원자를 심사할 수 있어요.</p>
          <p class="lk-help">인증이 승인되기 전에는 공고를 만들거나 지원자를 볼 수 없어요.</p>
          ${labAction ? `<div class="section-actions">${labAction}</div>` : ''}
        </div>
        <ol class="vsteps">${LAB_STEPS.map(step).join('')}</ol>
      </div>
    </section>
    <section class="home-section" id="home-faq" aria-labelledby="faq-title">
      <div class="home-section__head"><h2 class="lk-section-title" id="faq-title">자주 묻는 질문</h2></div>
      <div class="lk-panel faq">${HOME_FAQ.map(([qq, a], i) => `<details id="faq-${i + 1}"><summary id="faq-${i + 1}-q"><span>${qq}</span>${CHEVRON}</summary><p class="faq__a">${a}</p></details>`).join('')}</div>
    </section>`;

  // 검색: 탐색 화면과 같은 50자 기준으로 검사하고, 통과하면 그 조건으로 탐색을 연다 (FR-01-08)
  const input = $('#home-q');
  const err = $('#home-q-err');
  $('#home-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (chars(v) > 50) { err.textContent = '검색어는 50자 이하로 입력해주세요.'; err.hidden = false; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
    go(v ? `#/labs?${new URLSearchParams({ q: v })}` : '#/labs');
  });
  input.addEventListener('input', () => { if (chars(input.value.trim()) <= 50) { err.hidden = true; err.textContent = ''; input.removeAttribute('aria-invalid'); } });
}

// 로그인한 사람에게만 보이는 바로 가기: 지금 해야 할 일과 그 화면 링크
function meStrip(u) {
  if (!u) return '';
  // 홈 맨 위에 두되 제목 순서(h1 먼저)를 지키려고 제목은 문단으로 쓴다
  const box = (title, body, actions) => `
    <section class="lk-panel home-me" aria-labelledby="me-title">
      <div class="home-me__text"><p class="lk-item-title" id="me-title">${title}</p>${body}</div>
      <div class="home-me__actions">${actions}</div>
    </section>`;
  const btn = (href, label, secondary = false) => `<a class="lk-button${secondary ? ' lk-button--secondary' : ''}" href="${href}">${label}</a>`;
  const p = (t) => `<p class="lk-description">${t}</p>`;
  if (!u.emailVerifiedAt) {
    return box('학교 이메일 확인이 필요해요', p(u.role === 'student' ? '확인을 마쳐야 공고에 지원할 수 있어요.' : '확인을 마쳐야 연구실 소속 인증을 신청할 수 있어요.'), btn('#/account/email', '이메일 확인하기'));
  }
  if (u.role === 'student') {
    if (!profileComplete(u)) return box('프로필을 완성해주세요', p('이름·학년과 학부생 자기확인을 입력하면 공고에 지원할 수 있어요.'), btn('#/account', '프로필 완성하기'));
    const mine = Object.entries(S.apps).filter(([, a]) => a.studentId === u.id).sort((x, y) => y[1].submittedAt.localeCompare(x[1].submittedAt));
    if (!mine.length) return box('아직 지원한 공고가 없어요', p('마감이 가까운 공고부터 살펴보세요.'), btn('#/labs', '연구실 탐색'));
    const active = mine.filter(([, a]) => !TERMINAL.includes(appStatus(a))).length;
    const list = `<ul class="me-apps">${mine.slice(0, 3).map(([key, a]) => { const r = S.recs[a.rec]; return `<li><a href="#/my?app=${key}"><span class="strong">${esc(S.labs[r.lab].name)}</span><span class="muted">${esc(r.title)}</span>${badge(appStatus(a))}</a></li>`; }).join('')}</ul>`;
    const more = mine.length > 3 ? `<p class="lk-caption">외 ${mine.length - 3}건은 내 지원 현황에서 볼 수 있어요.</p>` : '';
    const done = mine.length - active;
    const summary = !active ? '모든 지원이 끝났어요.' : done ? `진행 중 ${active}건 · 끝난 지원 ${done}건` : `진행 중 ${active}건`;
    return box(`내 지원 ${mine.length}건`, `${p(summary)}${list}${more}`, btn('#/my', '내 지원 현황'));
  }
  if (u.role === 'operator') {
    const pending = Object.values(S.vreqs).filter((r) => r.status === '승인 대기' && S.labs[r.labId] && S.labs[r.labId].dept === u.department).length;
    return box('연구실 인증 요청', p(pending ? `승인을 기다리는 요청이 ${pending}건 있어요.` : '승인을 기다리는 요청이 없어요.'), btn('#/ops/verifications', '인증 요청 검토'));
  }
  if (isApprovedAdmin(u)) {
    const fresh = Object.values(S.apps).filter((a) => S.recs[a.rec] && S.recs[a.rec].lab === u.assignedLabId && appStatus(a) === '지원 완료').length;
    return box(`${esc(S.labs[u.assignedLabId].name)} 관리자`, p(fresh ? `아직 검토를 시작하지 않은 지원(지원 완료)이 ${fresh}건 있어요.` : '아직 검토를 시작하지 않은 지원(지원 완료)은 없어요.'), btn('#/admin/applicants', '지원자 관리') + btn('#/admin/recruitments', '모집 공고 관리', true));
  }
  const pend = pendingReqOf(u);
  if (pend) return box('연구실 소속 인증 승인 대기', p(`${esc(S.labs[pend.labId].name)} 인증 요청을 운영 보조가 검토하고 있어요. 승인되면 공고를 올릴 수 있어요.`), btn('#/verification', '신청 내용 보기', true));
  const last = vreqsOf(u)[0];
  if (last && last.status === '반려') return box('인증 요청이 반려됐어요', p('반려 사유를 확인하고 보완해서 다시 신청할 수 있어요.'), btn('#/verification', '보완해서 다시 신청'));
  return box('연구실 소속 인증을 신청해주세요', p('승인되면 배정된 연구실의 공고를 올리고 지원자를 심사할 수 있어요.'), btn('#/verification', '연구실 인증 신청'));
}

// ---------- UI-01 연구실 탐색 ----------
function publicRecs() { return Object.entries(S.recs).filter(([, r]) => r.published).map(([id, r]) => ({ id, ...r, status: recStatus(r) })); }
// 게시된 공고의 연구실이 가진 연구 분야 (탐색 필터와 홈의 분야 바로 가기가 같은 목록을 쓴다)
function recFields() { return [...new Set(publicRecs().flatMap((r) => S.labs[r.lab].fields))].sort((a, b) => a.localeCompare(b, 'ko')); }
function viewLabs(view, q) {
  const allFields = recFields();
  const statuses = ['모집 중', '모집 예정', '마감'];
  const qText = (q.get('q') || '').trim();
  let field = q.get('field') || '';
  let status = q.get('status') || '';
  const notes = [];
  if (field && !allFields.includes(field)) { notes.push('선택했던 연구 분야를 찾을 수 없어 전체로 표시해요.'); field = ''; }
  if (status && !statuses.includes(status)) { notes.push('선택했던 모집 상태가 올바르지 않아 전체로 표시해요.'); status = ''; }
  const tooLong = chars(qText) > 50;

  view.innerHTML = `
    ${head('연구실 탐색', '연구 분야와 모집기간을 확인하고 공고를 살펴보세요.')}
    <form class="search" id="search" role="search" novalidate>
      <label class="lk-label" for="q" style="grid-column:1/-1">연구실 이름 또는 연구 분야</label>
      <div class="search__input lk-field">
        <input class="lk-input" id="q" name="q" value="${esc(qText)}" placeholder="예: 인공지능" aria-describedby="q-err" autocomplete="off">
        <p class="lk-error" id="q-err" ${tooLong ? '' : 'hidden'}>${tooLong ? '검색어는 50자 이하로 입력해주세요.' : ''}</p>
      </div>
      <button class="lk-button" type="submit" id="search-btn">검색</button>
      <button class="lk-button lk-button--secondary" type="button" id="reset-filter">필터 초기화</button>
    </form>
    <div class="filters">
      <label class="lk-field"><span class="lk-label">연구 분야</span>
        <select class="lk-input" id="field"><option value="">전체</option>${allFields.map((f) => `<option ${f === field ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label>
      <label class="lk-field"><span class="lk-label">모집 상태</span>
        <select class="lk-input" id="status"><option value="">전체</option>${statuses.map((s) => `<option ${s === status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
    </div>
    ${notes.map((n) => `<p class="notice" style="margin-top:16px">${esc(n)}</p>`).join('')}
    <div id="results"></div>`;

  const input = $('#q');
  const err = $('#q-err');
  const apply = (over = {}) => {
    const v = input.value.trim();
    if (chars(v) > 50) { err.textContent = '검색어는 50자 이하로 입력해주세요.'; err.hidden = false; input.setAttribute('aria-invalid', 'true'); input.focus(); $('#field').value = field; $('#status').value = status; return; }
    const p = new URLSearchParams();
    const nq = over.q ?? v; const nf = over.field ?? $('#field').value; const ns = over.status ?? $('#status').value;
    if (nq) p.set('q', nq); if (nf) p.set('field', nf); if (ns) p.set('status', ns);
    go(`#/labs${p.toString() ? '?' + p : ''}`);
  };
  $('#search').addEventListener('submit', (e) => { e.preventDefault(); apply(); });
  $('#field').addEventListener('change', () => apply());
  $('#status').addEventListener('change', () => apply());
  $('#reset-filter').addEventListener('click', () => go('#/labs'));
  input.addEventListener('input', () => { if (chars(input.value.trim()) <= 50) { err.hidden = true; err.textContent = ''; input.removeAttribute('aria-invalid'); } });

  if (tooLong) {
    input.setAttribute('aria-invalid', 'true');
    $('#results').innerHTML = '<p class="lk-description" style="margin-top:24px">검색어를 고친 뒤 다시 검색하세요.</p>';
    return;
  }
  const nq = norm(qText);
  const rows = publicRecs()
    .filter((r) => { const lab = S.labs[r.lab]; return !nq || norm(lab.name).includes(nq) || lab.fields.some((f) => norm(f).includes(nq)); })
    .filter((r) => !field || S.labs[r.lab].fields.includes(field))
    .filter((r) => !status || r.status === status)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || S.labs[a.lab].name.localeCompare(S.labs[b.lab].name, 'ko') || a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
  const back = encodeURIComponent(location.hash.split('?')[1] || '');
  $('#results').innerHTML = rows.length ? `
    <p class="result-count">모집 공고 ${rows.length}건<span class="lk-caption">모집 중 → 모집 예정 → 마감 순</span></p>
    <ul class="lk-lab-list">${rows.map((r) => { const lab = S.labs[r.lab]; const href = `#/lab/${r.lab}/${r.id}?back=${back}`; return `
      <li class="lk-lab-row lab-row">
        <div class="lab-row__title"><div><h2 class="lk-item-title"><a class="lab-name-link" href="${href}">${esc(lab.name)}</a></h2><p>${esc(r.title)}</p></div>${badge(r.status)}</div>
        <div class="lab-row__meta"><span><b>연구 분야</b>${esc(lab.fields.join(' · '))}</span><span><b>요구 역량</b>${esc(r.skills || '별도 요구 없음')}</span></div>
        <div class="lab-row__foot"><span class="lab-row__meta lk-tabular"><span><b>모집기간</b>${period(r)}</span></span>
          <a class="detail-link" href="${href}" aria-label="${esc(lab.name)} 상세 보기">상세 보기 ›</a></div>
      </li>`; }).join('')}</ul>`
    : panelMsg('조건에 맞는 모집 공고가 없어요.', '검색어나 필터를 바꾸거나 초기화해보세요.', '<button class="lk-button lk-button--secondary" type="button" id="empty-reset">필터 초기화</button>');
  const er = $('#empty-reset'); if (er) er.addEventListener('click', () => go('#/labs'));
}

// ---------- UI-02 연구실 상세 ----------
function viewDetail(view, labId, recId, q, u) {
  const r = S.recs[recId];
  if (!r || !r.published || r.lab !== labId) {
    view.innerHTML = panelMsg('공고를 찾을 수 없어요.', '삭제됐거나 아직 게시되지 않은 공고예요.', '<a class="lk-button lk-button--secondary" href="#/labs">연구실 탐색</a>');
    return;
  }
  const lab = S.labs[labId];
  const st = recStatus(r);
  const back = q.get('back') || ''; // 탐색 화면의 적용 조건을 그대로 돌려준다 (FR-01-07)
  view.innerHTML = `
    <a class="back-link" href="#/labs${back ? '?' + esc(back) : ''}">← 연구실 탐색</a>
    ${head(esc(lab.name), `${esc(r.title)} · ${esc(lab.dept)}`)}
    <div class="split">
      <article class="lk-panel">
        <section class="section"><h3>연구실 소개</h3><p>${esc(lab.intro)}</p>
          <dl class="kv" style="margin-top:8px"><dt>담당 교수</dt><dd>${esc(lab.professor)}</dd><dt>연구 분야</dt><dd>${esc(lab.fields.join(' · '))}</dd></dl></section>
        <section class="section"><h3>연구 주제</h3><p>${esc(r.topic)}</p></section>
        <section class="section"><h3>요구 역량</h3><p>${esc(r.skills || '별도 요구 없음')}</p></section>
        <section class="section"><h3>활동 방식</h3><p>${esc(r.activity)}</p></section>
      </article>
      <aside class="lk-panel apply-panel" aria-label="지원">
        ${badge(st)}
        <div><p class="strong">모집기간</p><p class="lk-tabular">${period(r)}</p></div>
        <p class="strong">모집 인원 ${esc(r.capacity)}명</p>
        <hr class="divider" style="margin:0">
        <div><p class="strong">제출 자료</p><p>CV 필수</p><p>성적증명서·포트폴리오 선택</p></div>
        <div id="apply-area"></div>
      </aside>
    </div>`;
  // 3.1.7 상세 지원 영역의 판단 순서
  const area = $('#apply-area');
  const here = encodeURIComponent(location.hash);
  const mine = u && u.role === 'student' ? myAppFor(u, recId) : null;
  const disabledBtn = (label) => `<button class="lk-button" disabled>${label}</button>`;
  const until = `<p class="lk-help deadline"><span class="dday">${dday(r)}</span>${fmtDate(r.end)}까지 지원할 수 있어요</p>`;
  if (mine) {
    const s = appStatus(mine);
    const key = Object.keys(S.apps).find((k) => S.apps[k] === mine);
    area.innerHTML = `<div class="stack"><p>이미 지원한 공고예요. 현재 상태 ${badge(s)}</p>${s === '철회' ? '<p class="lk-help">철회한 공고에는 다시 지원할 수 없어요.</p>' : ''}<a class="lk-button lk-button--secondary" href="#/my?app=${key}">내 지원 현황 보기</a></div>`;
  } else if (u && u.role !== 'student') {
    area.innerHTML = '<p class="lk-help">지원은 학생 계정 전용 기능이에요. 이 계정은 공고를 조회만 할 수 있어요.</p>';
  } else if (st === '모집 예정') {
    area.innerHTML = `<div class="stack">${disabledBtn('지원서 작성')}<p class="lk-help">${fmtDate(r.start)}부터 지원할 수 있어요.</p></div>`;
  } else if (st === '마감') {
    area.innerHTML = `<div class="stack">${disabledBtn('지원서 작성')}<p class="lk-help">${r.earlyClosedAt ? '연구실이 모집을 조기 마감했어요.' : '모집기간이 끝났어요.'}</p></div>`;
  } else if (!u) {
    area.innerHTML = `<div class="stack">${until}<p class="lk-help">학교 이메일로 가입한 학생만 지원할 수 있어요.</p><a class="lk-button" id="login" href="#/login?next=${here}">로그인 후 지원</a></div>`;
  } else if (!u.emailVerifiedAt) {
    area.innerHTML = `<div class="stack">${until}<p class="lk-help">지원하려면 학교 이메일 확인이 필요해요.</p><a class="lk-button" href="#/account/email?next=${here}">이메일 확인하기</a></div>`;
  } else if (!profileComplete(u)) {
    area.innerHTML = `<div class="stack">${until}<p class="lk-help">지원하려면 이름·학년과 학부생 자기확인으로 프로필을 먼저 완성해주세요.</p><a class="lk-button" href="#/account?next=${here}">프로필 완성하기</a></div>`;
  } else {
    area.innerHTML = `<div class="stack">${until}<button class="lk-button" id="to-apply">지원서 작성</button></div>`;
    $('#to-apply').addEventListener('click', () => {
      // 클릭 직전 최신 상태를 다시 검사한다 (3.1.7-8)
      if (recStatus(S.recs[recId]) !== '모집 중' || myAppFor(u, recId)) { render(); toast('공고 상태가 바뀌었어요. 최신 정보를 확인하세요.', true); return; }
      go(`#/apply/${recId}`);
    });
  }
}

// ---------- UI-03 지원서 작성 ----------
function viewApply(view, recId, u) {
  const r = S.recs[recId];
  const here = encodeURIComponent(`#/apply/${recId}`);
  const existing = myAppFor(u, recId);
  if (existing) {
    const key = Object.keys(S.apps).find((k) => S.apps[k] === existing);
    view.innerHTML = panelMsg('이미 지원한 공고예요.', '같은 공고에는 한 번만 지원할 수 있어요. 제출한 지원서와 진행 상태를 확인하세요.', `<a class="lk-button" href="#/my?app=${key}">내 지원 현황 보기</a>`);
    return;
  }
  if (!r || !r.published || recStatus(r) !== '모집 중') {
    view.innerHTML = panelMsg('지금은 이 공고에 지원할 수 없어요.', '모집 기간이 아니거나 마감된 공고예요.', '<a class="lk-button lk-button--secondary" href="#/labs">연구실 탐색</a>');
    return;
  }
  if (!u.emailVerifiedAt) { view.innerHTML = panelMsg('학교 이메일을 먼저 확인해주세요.', '이메일을 확인해야 지원서를 제출할 수 있어요.', `<a class="lk-button" href="#/account/email?next=${here}">이메일 확인하기</a>`); return; }
  if (!profileComplete(u)) { view.innerHTML = panelMsg('프로필을 먼저 완성해주세요.', '이름·학년과 학부생 자기확인이 있어야 지원할 수 있어요.', `<a class="lk-button" href="#/account?next=${here}">프로필 완성하기</a>`); return; }
  const lab = S.labs[r.lab];
  const f = { cv: null, grade: null, pfMode: 'none', pf: null, link: '' };
  let shown = { name: u.name, grade: u.grade };   // 화면에 보여 준 제출 당시 프로필
  view.innerHTML = `
    ${head('지원서 작성', `${esc(lab.name)} · ${esc(r.title)}`)}
    <div class="profile-box"><span class="strong">내 프로필</span><div><p id="profile-line">${esc(u.name)} · ${esc(u.department)} · ${u.grade}학년</p><p class="lk-caption">${esc(u.email)} · 확인 완료 · 제출 당시 정보가 지원서에 함께 저장돼요</p></div></div>
    <div id="err-summary" class="error-summary" role="alert" hidden></div>
    <form id="apply" novalidate>
      <div class="form-grid">
        <div class="form-col">
          <div class="lk-field"><label class="lk-label" for="intro">자기소개<span class="req">필수</span><span class="opt">공백 제외 1~1,000자</span></label>
            <textarea class="lk-input" id="intro" aria-describedby="intro-count intro-err"></textarea>
            <p class="lk-caption counter" id="intro-count">공백 제외 0 / 1,000자</p>
            <p class="lk-error" id="intro-err" hidden></p></div>
          <div class="lk-field"><label class="lk-label" for="course">진학 희망 과정<span class="req">필수</span></label>
            <select class="lk-input" id="course" aria-describedby="course-err"><option value="">선택하세요</option>${['학석연계', '석사', '석박통합', '미정', '진학 계획 없음'].map((c) => `<option>${c}</option>`).join('')}</select>
            <p class="lk-error" id="course-err" hidden></p></div>
        </div>
        <div class="form-col">
          <h2 class="lk-item-title">첨부 자료</h2>
          ${fileField('cv', 'CV', true)}
          ${fileField('grade', '성적증명서', false)}
          <fieldset class="lk-field" style="border:0;padding:0;margin:0"><legend class="lk-label">포트폴리오<span class="opt">선택</span></legend>
            <div class="radio-row">${[['none', '없음'], ['pdf', 'PDF'], ['link', 'https 링크']].map(([v, l]) => `<label><input type="radio" name="pf" value="${v}" ${v === 'none' ? 'checked' : ''}> ${l}</label>`).join('')}</div>
            <div id="pf-area"></div></fieldset>
          <p class="lk-help">PDF는 항목별 1개 · 각 10MB 이하</p>
        </div>
      </div>
      <div class="form-actions">
        <a class="lk-button lk-button--secondary" href="#/lab/${r.lab}/${recId}">연구실 상세 보기</a>
        <button class="lk-button" type="submit" id="submit">지원서 제출</button>
      </div>
    </form>`;

  const intro = $('#intro');
  // 작성 내용이나 파일이 있을 때만 이탈을 확인하고(FR-03-09), 오류를 고치면 요약의 항목 수를 다시 센다
  const markDirty = () => {
    const dirty = intro.value.trim() || $('#course').value || f.cv || f.grade || f.pf || f.link.trim();
    guard = dirty ? { title: '작성 중인 지원서가 있어요', body: '<p>지금 이동하면 입력한 내용과 선택한 파일이 저장되지 않아요.</p>' } : null;
    const sum = $('#err-summary');
    if (!sum.hidden) {
      const n = $$('#apply .lk-error').filter((x) => !x.hidden).length;
      if (n) sum.textContent = `입력을 확인해주세요 · ${n}개 항목`; else sum.hidden = true;
    }
  };
  intro.addEventListener('input', () => {
    clearErr($('#intro-err'), intro);
    const n = chars(intro.value.replace(/\s/gu, ''));
    const counter = $('#intro-count');
    counter.textContent = n > 1000 ? `공백 제외 ${n.toLocaleString()} / 1,000자 · ${(n - 1000).toLocaleString()}자 초과` : `공백 제외 ${n.toLocaleString()} / 1,000자`;
    counter.classList.toggle('is-over', n > 1000);
    markDirty();
  });
  $('#course').addEventListener('change', () => { clearErr($('#course-err'), $('#course')); markDirty(); });
  wireFileField('cv', 10_000_000, f, markDirty);
  wireFileField('grade', 10_000_000, f, markDirty);

  function paintPf() {
    const area = $('#pf-area');
    if (f.pfMode === 'pdf') { area.innerHTML = fileField('pf', '포트폴리오 PDF', false, { bare: true }); wireFileField('pf', 10_000_000, f, markDirty); }
    else if (f.pfMode === 'link') {
      area.innerHTML = `<div class="lk-field"><label class="lk-label" for="link">포트폴리오 링크<span class="opt">https 주소 · 2,048자 이하</span></label><input class="lk-input" id="link" type="url" placeholder="https://" value="${esc(f.link)}" aria-describedby="link-err"><p class="lk-error" id="link-err" hidden></p></div>`;
      $('#link').addEventListener('input', (e) => { f.link = e.target.value; clearErr($('#link-err'), e.target); markDirty(); });
    } else area.innerHTML = '';
  }
  $$('input[name="pf"]').forEach((radio) => radio.addEventListener('change', async () => {
    const had = (f.pfMode === 'pdf' && f.pf) || (f.pfMode === 'link' && f.link.trim());
    if (had) {
      const ok = await confirmDialog({ title: '포트폴리오 방식을 바꿀까요?', body: '<p>지금 선택한 포트폴리오는 제출되지 않아요.</p>', ok: '방식 변경', cancel: '그대로 두기' });
      if (!ok) { $(`input[name="pf"][value="${f.pfMode}"]`).checked = true; return; }
      f.pf = null; f.link = '';
    }
    f.pfMode = radio.value; paintPf(); markDirty();
  }));

  $('#apply').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errors = [];
    const introLen = chars(intro.value.replace(/\s/gu, ''));
    const check = (cond, id, box, msg) => { const el = $(`#${id}-err`); if (cond) { showErr(el, box, msg); errors.push([box, msg]); } else clearErr(el, box); };
    check(introLen < 1 || introLen > 1000, 'intro', intro, introLen < 1 ? '자기소개를 입력해주세요.' : '자기소개는 공백 제외 1,000자 이하로 줄여주세요.');
    check(!$('#course').value, 'course', $('#course'), '진학 희망 과정을 선택해주세요.');
    check(!f.cv, 'cv', $('#cv-box'), 'CV PDF 파일을 선택해주세요.');
    if (f.pfMode === 'pdf') check(!f.pf, 'pf', $('#pf-box'), '포트폴리오 PDF를 선택하거나 방식을 ‘없음’으로 바꿔주세요.');
    if (f.pfMode === 'link') {
      let bad = false;
      try { const url = new URL(f.link.trim()); bad = url.protocol !== 'https:' || !url.hostname || !!url.username || !!url.password || f.link.length > 2048; } catch { bad = true; }
      check(bad, 'link', $('#link'), 'https://로 시작하는 올바른 주소를 입력해주세요.');
    }
    const sum = $('#err-summary');
    if (errors.length) {
      sum.hidden = false; sum.textContent = `입력을 확인해주세요 · ${errors.length}개 항목`;
      const first = errors[0][0];
      first.scrollIntoView({ block: 'center' });
      (first.classList.contains('file-box') ? $('.pick-btn', first) : first).focus();
      return;
    }
    sum.hidden = true;
    const attach = [f.cv && `CV · ${f.cv.name}`, f.grade && `성적증명서 · ${f.grade.name}`, f.pfMode === 'pdf' && `포트폴리오 · ${f.pf.name}`, f.pfMode === 'link' && `포트폴리오 링크 · ${f.link}`].filter(Boolean);
    const ok = await confirmDialog({
      title: '지원서를 제출할까요?',
      body: `<p><b>${esc(lab.name)}</b> · ${esc(r.title)}</p><p>제출 후에는 내용을 수정할 수 없어요. 철회는 내 지원 현황에서 할 수 있어요.</p><ul style="margin:0;padding-left:18px">${attach.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`,
      ok: '지원서 제출',
    });
    if (!ok) return;
    // 입력값은 기다리기 전에 읽어 둔다. 처리 중에 화면을 떠나도 요청은 취소되지 않는다 (FR-X-06.2)
    const introVal = intro.value.trim();
    const courseVal = $('#course').value;
    const pick = { cv: f.cv, grade: f.grade, pf: f.pfMode === 'pdf' ? f.pf : null };
    const linkVal = f.pfMode === 'link' ? f.link.trim() : '';
    const applyHash = location.hash;
    // 파일을 올린 뒤 서버가 자격·중복·모집 상태·프로필을 다시 검사하고, 접수번호 발급과 저장을 한 번에 확정한다
    // 제출 당시 프로필(이름·학교 이메일·학과·학년)을 함께 저장한다 (6.2.4 profileSnapshot)
    const res = await busy($('#submit'), '제출 중…', () => api.submitApplication({ recId, intro: introVal, course: courseVal, pick, link: linkVal, shown }));
    const outcome = res.ok ? 'ok' : res.code;
    const newKey = res.key;
    const latest = res.latest;
    if (outcome === 'ok') {
      guard = null;
      if (location.hash === applyHash) go(`#/my?app=${newKey}`);
      toast(`지원서를 제출했어요. 접수번호 ${res.id}`);
    } else if (outcome === 'dup') {
      guard = null; go(`#/my?app=${newKey}`); toast('이미 이 공고에 지원했어요. 제출한 지원서를 확인하세요.', true);
    } else if (outcome === 'changed') {
      shown = { name: latest.name, grade: latest.grade };
      const line = $('#profile-line'); if (line) line.textContent = `${latest.name} · ${latest.department} · ${latest.grade}학년`;
      toast('프로필이 바뀌었어요. 바뀐 내용을 확인한 뒤 다시 제출해주세요. 입력 내용은 그대로 있어요.', true);
    } else if (outcome === 'login') {
      toast('로그인 상태가 바뀌어 제출하지 못했어요. 다시 로그인해주세요.', true);
    } else if (outcome === 'network' || outcome === 'upload' || outcome === 'invalid') {
      toast(outcome === 'invalid' ? '입력한 내용을 서버에서 받지 못했어요. 입력을 확인하고 다시 제출해주세요.' : outcome === 'upload' ? '첨부 파일을 올리지 못했어요. 연결을 확인하고 다시 제출해주세요. 입력 내용은 그대로 있어요.' : res.message, true);
    } else {
      toast(outcome === 'closed' ? '공고 상태가 바뀌어 제출하지 못했어요. 입력 내용은 그대로 있어요.' : '이메일 확인이나 프로필 상태가 바뀌어 제출하지 못했어요.', true);
    }
  });
}

// ---------- UI-04 내 지원 현황 ----------
function viewMy(view, q, u) {
  const mine = Object.entries(S.apps).filter(([, a]) => a.studentId === u.id).sort((x, y) => y[1].submittedAt.localeCompare(x[1].submittedAt));
  const sel = q.get('app');
  const cur = sel && S.apps[sel] && S.apps[sel].studentId === u.id ? S.apps[sel] : null;
  const denied = sel && !cur; // 없는 ID와 타인 ID는 같은 접근 불가 결과 (FR-04-03.2)
  view.innerHTML = `
    ${head('내 지원 현황', '본인이 제출한 지원서와 상태 이력을 확인하세요.')}
    <div class="split split--list">
      <section class="lk-panel"><h2 class="lk-item-title" style="margin-bottom:12px">지원 목록</h2>
        ${mine.length ? `<ul class="pick-list">${mine.map(([k, a]) => { const r = S.recs[a.rec]; return `<li><a class="pick" href="#/my?app=${k}" aria-current="${k === sel}">
          <span class="pick__title"><span>${esc(S.labs[r.lab].name)}</span></span><span>${esc(r.title)}</span>
          <span class="lk-caption lk-tabular">제출 ${localDay(a.submittedAt)}</span><span>${badge(appStatus(a))}</span></a></li>`; }).join('')}</ul>
          <p class="lk-caption" style="margin-top:12px">최신 제출순</p>` : '<p class="lk-description">아직 제출한 지원서가 없어요.</p><p style="margin-top:12px"><a class="lk-button lk-button--secondary" href="#/labs">연구실 탐색</a></p>'}
      </section>
      <section class="lk-panel" id="my-detail"></section>
    </div>`;
  const box = $('#my-detail');
  if (!cur) {
    box.innerHTML = denied
      ? '<div class="empty-detail"><p class="lk-item-title">지원서를 찾을 수 없거나 볼 수 없어요.</p><p class="lk-description" style="margin-top:8px">목록에서 본인 지원서를 선택하세요.</p></div>'
      : `<p class="empty-detail">${mine.length ? '목록에서 지원서를 선택하세요.' : '제출한 지원서가 생기면 여기에서 확인할 수 있어요.'}</p>`;
    return;
  }
  const r = S.recs[cur.rec];
  const s = appStatus(cur);
  const canWithdraw = ['지원 완료', '검토 중', '면담'].includes(s);
  box.innerHTML = `
    <div class="row"><div><h2 class="lk-item-title">${esc(r.title)}</h2><p class="lk-description">${esc(S.labs[r.lab].name)} · 접수번호 ${cur.id}</p></div><span class="spacer"></span>${badge(s)}</div>
    ${stepper(cur)}
    <p class="status-note">${STATUS_NOTE[s]}</p>
    <section class="section"><h3>제출 내용 <span class="lk-caption">제출 당시 기준 · 읽기 전용</span></h3>
      <dl class="kv"><dt>지원자</dt><dd>${esc(cur.student)} · ${esc(cur.dept)} · ${cur.year}학년</dd><dt>학교 이메일</dt><dd>${esc(cur.email)}</dd><dt>진학 희망</dt><dd>${esc(cur.course)}</dd><dt>첨부</dt><dd>${fileLinks(sel, cur)}</dd></dl>
      <p class="quote" style="margin-top:8px">${esc(cur.intro)}</p></section>
    <section class="section"><h3>상태 이력</h3><ol class="history">${cur.history.map(([st, at]) => `<li><time>${fmtDateTime(at)}</time><span>${st}</span></li>`).join('')}</ol></section>
    <div class="form-actions" style="margin-top:24px">
      <a class="lk-button lk-button--secondary" href="#/lab/${r.lab}/${cur.rec}">현재 모집 공고 보기</a>
      ${canWithdraw ? '<button class="lk-button lk-button--secondary danger-outline" id="withdraw">지원 철회</button>' : ''}
    </div>`;
  hydrateFiles(box);
  on('#withdraw', async (e) => {
    const btn = e.currentTarget;
    const ok = await confirmDialog({ title: '지원을 철회할까요?', body: `<p><b>${esc(S.labs[r.lab].name)}</b> · ${esc(r.title)}</p><p>현재 상태 ${esc(s)}에서 철회해요. 철회하면 되돌릴 수 없고 같은 공고에 다시 지원할 수 없어요.</p>`, ok: '지원 철회', danger: true });
    if (!ok) return;
    // 확인창에서 본 상태와 달라졌으면 서버가 저장하지 않는다 (B.2)
    const res = await busy(btn, '철회 중…', () => api.withdraw(sel, s));
    const outcome = res.ok ? 'ok' : res.code;
    render();
    if (outcome === 'ok') toast('지원을 철회했어요.');
    else toast(outcome === 'network' ? res.message : outcome === 'login' ? '로그인 상태가 바뀌어 철회하지 못했어요. 다시 로그인해주세요.' : '상태가 이미 바뀌어 철회하지 못했어요. 최신 상태를 확인하고 다시 시도하세요.', true);
  });
}

// ---------- 로그인 ----------
// 발표용 데모 계정 4개 (서버가 역할·연구실 상태를 함께 알려 준다)
const DEMO_ORDER = ['student-a@g.skku.edu', 'admin-a@skku.edu', 'admin-b@skku.edu', 'ops@skku.edu'];
function demoDesc(d) {
  if (d.role === 'student') return `${d.name} · ${d.department || DEPT}${d.grade ? ` ${d.grade}학년` : ''}`;
  if (d.role === 'operator') return `${d.department} 인증 검토`;
  if (d.approved) return `${d.lab} · 승인됨`;
  return d.lab ? `${d.lab} · 인증 신청함` : '연구실 인증 신청 전';
}
function viewLogin(view, q) {
  const next = safeReturn(q.get('next') || '');
  // 3.1.8: 돌아갈 곳이 외부 주소·허용되지 않은 내부 화면이었다면 로그인 뒤 탐색으로 대체한다
  const fallback = q.get('next') && !next ? '#/labs' : '';
  const notice = sessionNotice || (next.startsWith('#/lab/') ? '지원하려면 로그인이 필요해요. 로그인하면 보던 공고로 돌아가요.' : next ? '로그인하면 하던 작업으로 돌아가요.' : '');
  sessionNotice = '';
  const nq = next ? `?next=${encodeURIComponent(next)}` : '';
  view.innerHTML = `
    <div class="auth">
      <section class="lk-panel auth__card">
        <h1 class="lk-title">로그인</h1>
        <p class="lk-description">학교 이메일과 랩노크 전용 비밀번호로 로그인하세요.</p>
        ${notice ? `<p class="notice notice--info" role="status">${esc(notice)}</p>` : ''}
        <form id="li" class="auth__form" novalidate>
          ${field({ id: 'li-email', label: '학교 이메일', type: 'email', req: null, attrs: 'autocomplete="username" inputmode="email" placeholder="example@g.skku.edu"' })}
          ${field({ id: 'li-password', label: '비밀번호', type: 'password', req: null, attrs: 'autocomplete="current-password"' })}
          <p class="form-error" id="li-form-err" role="alert" hidden></p>
          <button class="lk-button auth__submit" type="submit" id="li-submit">로그인</button>
        </form>
        <p class="auth__alt">처음이신가요? <a class="lk-link" href="#/signup${nq}">회원가입</a></p>
      </section>
      <aside class="lk-panel auth__demo" aria-labelledby="demo-title">
        <h2 class="lk-item-title" id="demo-title">발표용 데모 계정</h2>
        <p class="lk-help">누르면 바로 로그인돼요. 직접 입력할 때 비밀번호는 <span class="code">${DEMO_PASSWORD}</span>이에요.</p>
        <ul class="demo-list">${[...(S.demo || [])].sort((a, b) => DEMO_ORDER.indexOf(a.email) - DEMO_ORDER.indexOf(b.email)).map((du) => `<li><button type="button" class="demo-account" data-demo="${esc(du.email)}"><span class="demo-account__role">${roleLabel(du)}</span><span class="demo-account__desc">${esc(demoDesc(du))}</span><span class="lk-caption">${esc(du.email)}</span></button></li>`).join('')}</ul>
      </aside>
    </div>`;
  const after = (u) => { go(next || fallback || homeOf(u), { replace: true }); toast(`${u.name || u.email}님, 로그인했어요.`); };
  const formErr = $('#li-form-err');
  $('#li').addEventListener('input', (e) => { clearFieldError(e.target); formErr.hidden = true; });
  $('#li').addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await busy($('#li-submit'), '로그인 중…', () => api.login({ email: $('#li-email').value, password: $('#li-password').value }));
    if (res.ok) return after(res.user);
    if (res.code === 'unconfirmed') { go(`#/check-email?${new URLSearchParams({ email: res.email, from: 'login' })}`); return; }
    applyErrors('li', res.errors || []);
    if (res.message) { formErr.textContent = res.message; formErr.hidden = false; $('#li-password').value = ''; $('#li-password').focus(); }
  });
  $$('[data-demo]').forEach((b) => b.addEventListener('click', async () => {
    const res = await busy(b, '로그인 중…', () => api.login({ email: b.dataset.demo, password: DEMO_PASSWORD }));
    if (res.ok) after(res.user); else { formErr.textContent = res.message; formErr.hidden = false; }
  }));
}

// ---------- 회원가입 (FR-07-01·02) ----------
function viewSignup(view, q) {
  const next = safeReturn(q.get('next') || '');
  const nq = next ? `?next=${encodeURIComponent(next)}` : '';
  // 홈·바닥글의 '학생으로 가입'·'관리자 신청자로 가입'에서 온 경우 가입 유형을 미리 골라 둔다 (바꿀 수 있음)
  const preset = ['student', 'admin'].includes(q.get('role')) ? q.get('role') : '';
  const chk = (v) => (preset === v ? 'checked' : '');
  view.innerHTML = `
    <div class="auth auth--single">
      <section class="lk-panel auth__card">
        <h1 class="lk-title">회원가입</h1>
        <p class="lk-description">학교 이메일로 가입한 뒤, 메일로 받은 링크를 눌러 이메일 소유를 확인해요.</p>
        <form id="su" class="auth__form" novalidate>
          <fieldset class="lk-field choice-group" id="su-role" aria-describedby="su-role-err">
            <legend class="lk-label">가입 유형<span class="req">필수</span></legend>
            <label class="choice"><input type="radio" name="su-role" value="student" ${chk('student')}><span><span class="choice__title">학생</span><span class="choice__desc">연구실 공고를 찾고 지원해요</span></span></label>
            <label class="choice"><input type="radio" name="su-role" value="admin" ${chk('admin')}><span><span class="choice__title">연구실 관리자 신청</span><span class="choice__desc">소속 인증이 승인되면 공고와 지원자를 관리해요</span></span></label>
            <p class="lk-error" id="su-role-err" hidden></p>
          </fieldset>
          ${field({ id: 'su-email', label: '학교 이메일', type: 'email', attrs: 'autocomplete="email" inputmode="email" placeholder="example@g.skku.edu"', help: 'skku.edu 또는 g.skku.edu 주소만 가입할 수 있어요.' })}
          ${field({ id: 'su-password', label: '랩노크 전용 비밀번호', type: 'password', note: '12~72자', attrs: 'autocomplete="new-password"', help: '학교 포털이나 메일 비밀번호는 쓰지 마세요. 랩노크에서만 쓰는 비밀번호를 만드세요.' })}
          ${field({ id: 'su-password2', label: '비밀번호 확인', type: 'password', attrs: 'autocomplete="new-password"' })}
          <button class="lk-button auth__submit" type="submit" id="su-submit">가입하고 확인 메일 받기</button>
        </form>
        <p class="auth__alt">이미 계정이 있나요? <a class="lk-link" href="#/login${nq}">로그인</a></p>
      </section>
    </div>`;
  const form = $('#su');
  const role = () => (form.querySelector('input[name="su-role"]:checked') || {}).value;
  form.addEventListener('input', (e) => {
    clearFieldError(e.target.name === 'su-role' ? $('#su-role') : e.target);
    // 미리 골라 둔 가입 유형은 사용자가 입력한 내용으로 보지 않는다
    const changedRole = role() && role() !== preset;
    guard = changedRole || $('#su-email').value || $('#su-password').value || $('#su-password2').value ? { title: '가입을 마치지 않았어요', body: '<p>지금 이동하면 입력한 내용이 사라져요.</p>' } : null;
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await busy($('#su-submit'), '가입 중…', () => api.signup({ email: $('#su-email').value, password: $('#su-password').value, password2: $('#su-password2').value, role: role() }));
    if (!res.ok) { applyErrors('su', res.errors || []); if (res.code === 'network') toast(res.message, true); return; }
    guard = null;
    // 확인 링크를 누르면 로그인되고, 하던 작업(허용된 목적지)으로 돌아갈 수 있게 기억해 둔다
    S.session.returnTo = next || null; save();
    go(`#/check-email?${new URLSearchParams({ email: res.email })}`, { replace: true });
    toast('가입했어요. 학교 이메일로 보낸 확인 링크를 눌러주세요.');
  });
}

// 확인·보완을 마친 뒤 이어갈 곳
function continueAction(u) {
  const dest = safeReturn(S.session && S.session.returnTo);
  if (dest) return `<a class="lk-button" href="${esc(dest)}" data-consume-return>하던 작업으로 돌아가기</a>`;
  if (u.role === 'student') return profileComplete(u) ? '<a class="lk-button" href="#/labs">연구실 탐색</a>' : '<a class="lk-button" href="#/account">프로필 완성하기</a>';
  if (u.role === 'operator') return '<a class="lk-button" href="#/ops/verifications">인증 요청 검토</a>';
  return u.assignedLabId ? '<a class="lk-button" href="#/admin/recruitments">모집 공고 관리</a>' : '<a class="lk-button" href="#/verification">연구실 인증 신청</a>';
}
function rememberReturn(q) {
  const next = safeReturn(q.get('next') || '');
  if ((S.session.returnTo || '') !== next) { S.session.returnTo = next || null; save(); }
  return next;
}

// ---------- 학교 이메일 확인 (FR-07-03·04) ----------
function viewEmail(view, q, u) {
  rememberReturn(q);
  view.innerHTML = `${head('학교 이메일 확인')}
    <div class="lk-panel narrow stack">
      <div class="row"><h2 class="lk-item-title">${esc(u.email)}</h2><span class="spacer"></span>${badge(u.emailVerifiedAt ? '확인 완료' : '미확인')}</div>
      <p class="lk-help">${u.emailVerifiedAt ? `<span class="lk-tabular">${fmtDateTime(u.emailVerifiedAt)}</span>에 확인했어요. ` : ''}이메일 확인은 학교 학적 확인이 아니에요.</p>
      <div class="row">${continueAction(u)}</div>
    </div>`;
}

// 가입 직후·확인 전 로그인 시도: 메일함에서 링크를 누르도록 안내하고 다시 보낼 수 있게 한다 (FR-07-03·04)
function viewCheckEmail(view, q) {
  const email = normEmail(q.get('email') || '');
  if (!emailDomainOk(email)) { view.innerHTML = panelMsg('확인할 이메일 주소가 없어요.', '회원가입을 다시 하거나 로그인해주세요.', '<a class="lk-button" href="#/login">로그인</a>'); return; }
  const fromLogin = q.get('from') === 'login';
  view.innerHTML = `${head('학교 이메일 확인', '메일로 받은 확인 링크를 누르면 이메일 확인이 끝나고 바로 로그인돼요.')}
    <div class="lk-panel narrow stack">
      <div class="row"><h2 class="lk-item-title">${esc(email)}</h2><span class="spacer"></span>${badge('미확인')}</div>
      <p>${fromLogin ? '아직 이메일 확인이 끝나지 않았어요. 가입할 때 받은 메일의 확인 링크를 눌러주세요.' : '이 주소로 확인 메일을 보냈어요. 링크는 보낸 뒤 30분 동안 쓸 수 있어요.'}</p>
      <div class="row"><button type="button" class="lk-button lk-button--secondary" id="resend" aria-describedby="resend-hint">확인 메일 다시 보내기</button></div>
      <p class="lk-help" id="resend-hint"></p>
      <hr class="divider" style="margin:0">
      <p class="lk-help">메일이 보이지 않으면 스팸함을 확인해주세요. 새 메일을 보내면 이전 링크는 더 이상 쓸 수 없어요. 확인을 마치기 전에도 연구실 탐색은 할 수 있어요.</p>
    </div>`;
  const btn = $('#resend');
  const hint = $('#resend-hint');
  const tick = () => {
    if (btn.getAttribute('aria-busy')) return;
    const ms = nextResendInMs(email);
    btn.disabled = ms > 0;
    hint.textContent = ms > 0 ? `새 메일은 ${Math.ceil(ms / 1000)}초 뒤에 보낼 수 있어요.` : '';
  };
  tick(); pageInterval(tick, 1000);
  btn.addEventListener('click', async () => {
    const res = await busy(btn, '보내는 중…', () => api.resendVerification(email));
    tick();
    if (res.ok) toast('확인 메일을 다시 보냈어요. 가장 최근 메일의 링크를 눌러주세요.'); else toast(res.message, true);
  });
}

// 메일의 확인 링크를 연 결과 (시작할 때 링크를 처리하고 이 화면으로 온다)
function viewVerifyEmail(view, q, u) {
  const code = q.get('result') || 'expired';
  if (code === 'ok' && u) {
    view.innerHTML = `${head('학교 이메일 확인')}
      <div class="lk-panel narrow stack">
        <div class="row"><h2 class="lk-item-title">학교 이메일을 확인했어요.</h2><span class="spacer"></span>${badge('확인 완료')}</div>
        <p class="lk-help">${esc(u.email)}(으)로 로그인했어요. 이메일 확인은 학교 학적 확인이 아니에요.</p>
        <div class="row">${continueAction(u)}</div>
      </div>`;
    return;
  }
  const [title, desc] = code === 'network'
    ? ['서버에 연결하지 못했어요.', '인터넷 연결을 확인한 뒤 메일의 링크를 다시 눌러주세요.']
    : ['확인 링크가 만료됐거나 이미 사용한 링크예요.', '링크는 보낸 뒤 30분 동안 한 번만 쓸 수 있고, 새 메일을 받으면 이전 링크는 쓸 수 없어요. 이미 확인했다면 로그인하면 돼요.'];
  view.innerHTML = `${head('학교 이메일 확인')}
    <div class="lk-panel narrow stack">
      <h2 class="lk-item-title">${title}</h2><p class="lk-help">${desc}</p>
      <div class="row"><a class="lk-button" href="#/login">로그인</a></div>
    </div>`;
}

// ---------- 내 정보 (4.7.1) ----------
function viewAccount(view, q, u) {
  const next = rememberReturn(q);
  const needProfile = next && u.role === 'student' && !profileComplete(u);
  const lab = u.assignedLabId ? S.labs[u.assignedLabId] : null;
  view.innerHTML = `${head('내 정보', '계정 정보와 프로필을 확인하고 보완하세요.')}
    ${needProfile ? '<p class="notice notice--info" style="margin-bottom:24px">지원하려면 프로필을 먼저 완성해주세요. 저장하면 보던 공고로 돌아가요.</p>' : ''}
    <div class="account-grid">
      <section class="lk-panel"><h2 class="lk-item-title">계정</h2>
        <dl class="kv" style="margin-top:12px">
          <dt>학교 이메일</dt><dd>${esc(u.email)} ${badge(u.emailVerifiedAt ? '확인 완료' : '미확인')}</dd>
          <dt>가입 유형</dt><dd>${roleLabel(u)}</dd>
          ${u.role === 'admin' ? `<dt>연구실 배정</dt><dd>${lab ? `${esc(lab.name)} · 승인됨` : '미배정'}</dd>` : ''}
          ${u.role === 'operator' ? `<dt>소관 학과</dt><dd>${esc(u.department)}</dd>` : ''}
          <dt>가입일</dt><dd class="lk-tabular">${localDay(u.createdAt)}</dd>
        </dl>
        ${u.emailVerifiedAt ? '' : '<p style="margin-top:16px"><a class="lk-button lk-button--secondary" href="#/account/email">이메일 확인하기</a></p>'}
        ${u.role === 'admin' ? '<p style="margin-top:16px"><a class="lk-link" href="#/verification">연구실 소속 인증 보기</a></p>' : ''}
        <p class="lk-caption" style="margin-top:16px">${u.role === 'operator' ? '학교 이메일·역할·소관 학과는 직접 바꿀 수 없어요.' : u.role === 'admin' ? '학교 이메일·가입 유형·연구실 배정은 직접 바꿀 수 없어요.' : '학교 이메일·가입 유형은 직접 바꿀 수 없어요.'}</p>
      </section>
      <section class="lk-panel" id="profile">${profileForm(u)}</section>
    </div>`;
  if (u.role === 'operator') return;
  const form = $('#pf');
  const collect = () => JSON.stringify([$('#pf-name').value, $('#pf-grade') ? $('#pf-grade').value : '', $('#pf-declaration') ? $('#pf-declaration').checked : '']);
  const initial = collect();
  const onEdit = (e) => {
    clearFieldError(e.target);
    guard = collect() !== initial ? { title: '저장하지 않은 프로필이 있어요', body: '<p>지금 이동하면 바꾼 내용이 저장되지 않아요.</p>' } : null;
  };
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await busy($('#pf-submit'), '저장 중…', () => api.saveProfile({ name: $('#pf-name').value, grade: $('#pf-grade') ? $('#pf-grade').value : null, declaration: $('#pf-declaration') ? $('#pf-declaration').checked : undefined }));
    if (!res.ok) { if (res.errors) applyErrors('pf', res.errors); else toast(res.message, true); return; }
    guard = null;
    const me = currentUser();
    const dest = safeReturn(S.session && S.session.returnTo);
    if (dest && me && profileComplete(me)) {
      S.session.returnTo = null; save();
      go(dest);
      toast('프로필을 저장했어요. 이어서 진행하세요.');
    } else { render(); toast('프로필을 저장했어요.'); }
  });
}
function profileForm(u) {
  if (u.role === 'operator') return `<h2 class="lk-item-title">프로필</h2><dl class="kv" style="margin-top:12px"><dt>이름</dt><dd>${esc(u.name)}</dd></dl><p class="lk-help" style="margin-top:12px">운영 보조 계정 정보는 검증 환경에서 미리 정해져 수정할 수 없어요.</p>`;
  const student = u.role === 'student';
  return `<h2 class="lk-item-title">프로필</h2>
    <form id="pf" class="stack-form" novalidate>
      ${field({ id: 'pf-name', label: '이름', value: u.name, note: '1~50자', attrs: 'autocomplete="name"' })}
      ${student ? `
        <div class="lk-field"><span class="lk-label">학과</span><p class="readonly-value">${DEPT}</p></div>
        <div class="lk-field"><label class="lk-label" for="pf-grade">학년<span class="req">필수</span></label>
          <select class="lk-input" id="pf-grade" aria-describedby="pf-grade-err"><option value="">선택하세요</option>${[1, 2, 3, 4].map((g) => `<option value="${g}" ${Number(u.grade) === g ? 'selected' : ''}>${g}학년</option>`).join('')}</select>
          <p class="lk-error" id="pf-grade-err" hidden></p></div>
        ${u.declaration
          ? `<div class="lk-field"><span class="lk-label">학부생 자기확인</span><p class="readonly-value">${badge('확인함')} 소프트웨어학과 학부생이라고 확인했어요 (자기신고)</p></div>`
          : `<div class="lk-field"><label class="check" for="pf-declaration"><input type="checkbox" id="pf-declaration" aria-describedby="pf-declaration-help pf-declaration-err"><span>본인은 성균관대학교 소프트웨어학과 학부생이에요.</span></label>
              <p class="lk-help" id="pf-declaration-help">자기신고 정보예요. 학교 학적 시스템으로 확인하지 않으며, 한 번 확인하면 해제할 수 없어요.</p>
              <p class="lk-error" id="pf-declaration-err" hidden></p></div>`}
        <p class="lk-help">이름·학년을 바꿔도 이미 제출한 지원서의 프로필은 바뀌지 않아요.</p>`
        : '<p class="lk-help">이름을 바꿔도 이미 제출한 인증 신청의 이름은 바뀌지 않아요.</p>'}
      <div class="form-actions" style="margin-top:8px;justify-content:flex-end"><button class="lk-button" type="submit" id="pf-submit">프로필 저장</button></div>
    </form>`;
}

// ---------- 연구실 관리자: 승인 전 안내 (§3.1.5 GW-01) ----------
const VERIFY_STEPS = ['학교 이메일 확인', '소속 인증 신청', '운영 보조 검토', '승인·연구실 배정'];
function reqSummary(r) {
  const lab = S.labs[r.labId];
  return `<dl class="kv" style="margin-top:16px"><dt>요청 번호</dt><dd>${r.id}</dd><dt>신청 연구실</dt><dd>${esc(lab.name)} · ${esc(lab.professor)} 교수</dd><dt>신청 당시 이름</dt><dd>${esc(r.nameSnapshot)}</dd><dt>소속 설명</dt><dd>${esc(r.description)}</dd><dt>위임 근거</dt><dd>${proofLink(r)}</dd><dt>신청 시각</dt><dd class="lk-tabular">${fmtDateTime(r.requestedAt)}</dd></dl>`;
}
function viewAdminGate(view, title, u) {
  const pending = pendingReqOf(u);
  const last = vreqsOf(u)[0];
  const rejected = !pending && last && last.status === '반려';
  const step = !u.emailVerifiedAt ? 0 : pending ? 2 : 1;
  const action = !u.emailVerifiedAt ? '<a class="lk-button" href="#/account/email">이메일 확인하기</a>'
    : pending ? '<a class="lk-button lk-button--secondary" href="#/verification">신청 내용 보기</a>'
    : `<a class="lk-button" href="#/verification">${rejected ? '보완해서 다시 신청' : '연구실 인증 신청'}</a>`;
  view.innerHTML = `${head(title, '연구실 소속 인증이 승인되면 모집 공고와 지원자를 관리할 수 있어요.')}
    <div class="lk-panel narrow">
      <div class="row"><h2 class="lk-item-title">연구실 소속 인증</h2><span class="spacer"></span>${badge(pending ? '승인 대기' : rejected ? '반려' : '신청 전')}</div>
      ${progress(VERIFY_STEPS, step, '인증 진행 단계')}
      ${pending ? reqSummary(pending) : ''}
      ${rejected ? `<div class="callout" style="margin-top:16px"><p class="strong">요청(${last.id})이 반려됐어요</p><p>${esc(last.rejectionReason)}</p></div>` : ''}
      <hr class="divider">
      <p class="lk-help">${pending ? '운영 보조가 신청 내용을 검토하고 있어요. 승인 전에는 공고 초안도 만들 수 없어요. 반려되면 사유를 확인한 뒤 새로 신청할 수 있어요.'
        : !u.emailVerifiedAt ? '학교 이메일을 확인한 뒤 연구실 소속 인증을 신청할 수 있어요. 승인 전에는 공고 초안도 만들 수 없어요.'
        : '대상 연구실과 소속 설명, 위임 근거 PDF로 인증을 신청하세요. 승인 전에는 공고 초안도 만들 수 없어요.'}</p>
      <div class="row" style="margin-top:16px">${action}</div>
    </div>`;
  hydrateFiles(view);
}

// ---------- 연구실 소속 인증 신청 (FR-07-08, 4.7.3, B.3) ----------
function viewVerification(view, u) {
  const reqs = vreqsOf(u);
  const pending = pendingReqOf(u);
  const last = reqs[0];
  const lab = u.assignedLabId ? S.labs[u.assignedLabId] : null;
  const history = `<h2 class="lk-item-title">신청 기록</h2>${reqs.length ? `<ul class="req-list">${reqs.map((r) => `<li><div class="pick__title"><span>${r.id} · ${esc(S.labs[r.labId].name)}</span>${badge(r.status)}</div><p class="lk-caption lk-tabular">신청 ${fmtDateTime(r.requestedAt)}${r.reviewedAt ? ` · 판정 ${fmtDateTime(r.reviewedAt)}` : ''}</p>${r.status === '반려' ? `<p class="lk-help">반려 사유: ${esc(r.rejectionReason)}</p>` : ''}</li>`).join('')}</ul>` : '<p class="lk-description" style="margin-top:8px">아직 신청한 기록이 없어요.</p>'}`;
  let body;
  if (lab) {
    body = `<div class="lk-panel stack"><div class="row"><h2 class="lk-item-title">${esc(lab.name)} 관리자로 승인됐어요</h2><span class="spacer"></span>${badge('승인')}</div>
      ${progress(VERIFY_STEPS, 4, '인증 진행 단계')}
      <p class="lk-help">승인된 관리자는 다른 연구실을 추가로 신청하거나 배정을 바꿀 수 없어요.</p>
      <div class="row"><a class="lk-button" href="#/admin/recruitments">모집 공고 관리</a></div></div>`;
  } else if (!u.emailVerifiedAt) {
    body = `<div class="lk-panel stack"><h2 class="lk-item-title">학교 이메일을 먼저 확인해주세요</h2>${progress(VERIFY_STEPS, 0, '인증 진행 단계')}<p class="lk-help">이메일을 확인해야 연구실 소속 인증을 신청할 수 있어요.</p><div class="row"><a class="lk-button" href="#/account/email">이메일 확인하기</a></div></div>`;
  } else if (pending) {
    body = `<div class="lk-panel"><div class="row"><h2 class="lk-item-title">검토를 기다리고 있어요</h2><span class="spacer"></span>${badge('승인 대기')}</div>
      ${progress(VERIFY_STEPS, 2, '인증 진행 단계')}${reqSummary(pending)}
      <hr class="divider"><p class="lk-help">승인 대기 중에는 신청 내용을 고치거나 새로 신청할 수 없어요. 반려되면 사유를 확인한 뒤 보완해서 다시 신청할 수 있어요.</p></div>`;
  } else {
    body = `<form class="lk-panel stack-form" id="vr" novalidate>
      <h2 class="lk-item-title">인증 신청</h2>
      ${last && last.status === '반려' ? `<div class="callout"><p class="strong">이전 요청(${last.id})이 반려됐어요</p><p>${esc(last.rejectionReason)}</p><p class="lk-caption">사유를 보완해서 새로 신청하세요. 이전 요청과 판정은 기록에 남아요.</p></div>` : ''}
      <div class="lk-field"><span class="lk-label" id="vr-name-label">본인 이름<span class="req">필수</span></span>
        <p class="readonly-value" id="vr-name" aria-labelledby="vr-name-label" aria-describedby="vr-name-help vr-name-err">${u.name ? `<span id="vr-name-value">${esc(u.name)}</span> <a class="lk-link" href="#/account">내 정보에서 수정</a>` : '아직 이름을 입력하지 않았어요. <a class="lk-link" href="#/account">내 정보에서 입력</a>'}</p>
        <p class="lk-help" id="vr-name-help">신청할 때의 이름이 요청에 그대로 남고, 나중에 이름을 바꿔도 바뀌지 않아요.</p>
        <p class="lk-error" id="vr-name-err" hidden></p></div>
      <div class="lk-field"><label class="lk-label" for="vr-lab">대상 연구실<span class="req">필수</span></label>
        <select class="lk-input" id="vr-lab" aria-describedby="vr-lab-help vr-lab-err"><option value="">선택하세요</option>${Object.entries(S.labs).map(([id, l]) => `<option value="${id}">${esc(l.name)} · ${esc(l.professor)} 교수</option>`).join('')}</select>
        <p class="lk-help" id="vr-lab-help">학과에 미리 등록된 연구실만 고를 수 있어요.</p>
        <p class="lk-error" id="vr-lab-err" hidden></p></div>
      <div class="lk-field"><label class="lk-label" for="vr-desc">소속 설명<span class="req">필수</span><span class="opt">1~500자</span></label>
        <textarea class="lk-input" id="vr-desc" rows="4" placeholder="예: 연구실 석사과정이며 지도교수님께 모집 관리를 위임받았습니다." aria-describedby="vr-desc-count vr-desc-err"></textarea>
        <p class="lk-caption counter" id="vr-desc-count">0 / 500자</p>
        <p class="lk-error" id="vr-desc-err" hidden></p></div>
      ${fileField('vr-proof', '위임 근거 PDF', true, { help: '신청자·지도교수·연구실과 관리 위임 의사를 확인할 수 있는 확인서나 교신 자료 · PDF 5MB 이하' })}
      <div class="form-actions" style="justify-content:flex-end;margin-top:8px"><button class="lk-button" type="submit" id="vr-submit">인증 신청</button></div>
    </form>`;
  }
  view.innerHTML = `${head('연구실 소속 인증', '대상 연구실의 관리자임을 증빙해 승인을 받으면 공고와 지원자를 관리할 수 있어요.')}
    <div class="verif-grid"><div>${body}</div><aside class="lk-panel" aria-label="신청 기록">${history}</aside></div>`;
  hydrateFiles(view);
  const form = $('#vr');
  if (!form) return;
  let confirmedName = u.name;
  const st = { 'vr-proof': null };
  const desc = $('#vr-desc');
  const markDirty = () => { guard = $('#vr-lab').value || desc.value.trim() || st['vr-proof'] ? { title: '작성 중인 인증 신청이 있어요', body: '<p>지금 이동하면 입력한 내용과 선택한 파일이 저장되지 않아요.</p>' } : null; };
  wireFileField('vr-proof', 5_000_000, st, markDirty);
  desc.addEventListener('input', () => {
    clearFieldError(desc);
    const n = chars(clean(desc.value));
    const c = $('#vr-desc-count');
    c.textContent = n > 500 ? `${n.toLocaleString()} / 500자 · ${n - 500}자 초과` : `${n} / 500자`;
    c.classList.toggle('is-over', n > 500);
    markDirty();
  });
  $('#vr-lab').addEventListener('change', (e) => { clearFieldError(e.target); markDirty(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pick = $('#vr-lab').value;
    const errs = [];
    if (!confirmedName) errs.push(['name', '내 정보에서 본인 이름을 먼저 입력해주세요.']);
    if (!pick) errs.push(['lab', '대상 연구실을 선택해주세요.']);
    const n = chars(clean(desc.value));
    if (n < 1) errs.push(['desc', '소속 설명을 입력해주세요.']); else if (n > 500) errs.push(['desc', '소속 설명은 500자 이하로 줄여주세요.']);
    if (!st['vr-proof']) errs.push(['proof', '위임 근거 PDF를 선택해주세요.']);
    applyErrors('vr', errs);
    if (errs.length) return;
    const l = S.labs[pick];
    const ok = await confirmDialog({ title: '연구실 소속 인증을 신청할까요?', body: `<p><b>${esc(l.name)}</b> · ${esc(l.professor)} 교수</p><p>신청자 이름 <b>${esc(confirmedName)}</b> · 근거 ${esc(st['vr-proof'].name)}</p><p>신청하면 운영 보조가 검토해요. 승인 대기 중에는 내용을 고칠 수 없어요.</p>`, ok: '인증 신청' });
    if (!ok) return;
    const res = await busy($('#vr-submit'), '신청 중…', () => api.requestVerification({ confirmedName, labId: pick, description: desc.value, file: st['vr-proof'] }));
    if (res.ok) { guard = null; render(); toast('연구실 소속 인증을 신청했어요. 운영 보조가 검토할 때까지 기다려주세요.'); return; }
    if (res.code === 'name-changed') {
      // 입력은 그대로 두고 최신 이름으로 다시 확인받는다 (FR-07-08.3)
      confirmedName = res.latestName;
      const v = $('#vr-name-value'); if (v) v.textContent = res.latestName;
      applyErrors('vr', [['name', `이름이 ‘${res.latestName}’(으)로 바뀌었어요. 확인한 뒤 다시 신청해주세요.`]]);
      return;
    }
    if (res.errors) applyErrors('vr', res.errors); else { toast(res.message, true); render(); }
  });
}

// ---------- UI-05 모집 공고 관리 ----------
const REC_FIELDS = { title: '공고명', topic: '연구 주제', activity: '활동 방식', skills: '요구 역량', capacity: '모집 인원', start: '모집 시작일', end: '모집 마감일' };
function viewRecruit(view, q, u) {
  const LAB = u.assignedLabId;
  // FR-05-08: 공고명·상태·기간·접수 수·마지막 저장 시각을 보여 주고 마지막 저장 내림차순으로 정렬
  const mine = Object.entries(S.recs).filter(([, r]) => r.lab === LAB).sort((x, y) => (y[1].savedAt || '').localeCompare(x[1].savedAt || ''));
  let sel = q.get('rec');
  if (sel !== 'new' && (!sel || !S.recs[sel] || S.recs[sel].lab !== LAB)) sel = mine[0] && mine[0][0];
  const isNew = sel === 'new' || !sel;
  const r = isNew ? { lab: LAB, title: '', topic: '', activity: '', skills: '', capacity: '', start: '', end: '', published: false, earlyClosedAt: null, savedAt: null, log: [] } : S.recs[sel];
  const st = isNew ? '작성 중' : recStatus(r);
  const n = isNew ? 0 : appsOf(sel).length;
  const locked = n > 0;           // INV-06 첫 지원 이후 일반 항목 고정
  const closed = st === '마감';
  const ro = locked || closed;
  view.innerHTML = `
    ${head('모집 공고 관리', `${esc(S.labs[LAB].name)} · 지원자가 있는 공고는 기간 연장과 조기 마감만 가능해요.`)}
    <div class="split split--list">
      <section class="lk-panel"><div class="row" style="margin-bottom:12px"><h2 class="lk-item-title">공고 목록</h2><span class="spacer"></span><a class="lk-button lk-button--secondary small-btn" href="#/admin/recruitments?rec=new">새 공고</a></div>
        <ul class="pick-list">
          ${isNew ? `<li><span class="pick" aria-current="true"><span class="pick__title"><span>새 공고</span></span><span>${badge('작성 중')}</span><span class="lk-caption">아직 저장하지 않았어요</span></span></li>` : ''}
          ${mine.map(([id, x]) => `<li><a class="pick" href="#/admin/recruitments?rec=${id}" aria-current="${id === sel}">
            <span class="pick__title"><span>${esc(x.title)}</span></span><span>${badge(recStatus(x))}</span>
            <span class="lk-caption lk-tabular">기간 ${period(x)} · 지원 ${appsOf(id).length}건</span>
            <span class="lk-caption lk-tabular">마지막 저장 ${fmtDateTime(x.savedAt)}</span></a></li>`).join('')}
        </ul>
        <p class="lk-caption" style="margin-top:12px">최근 저장순</p></section>
      <section class="lk-panel" id="rec-detail">
        <div class="rec-head"><div><h2 class="lk-item-title">${esc(r.title || '새 공고')}</h2><p class="lk-caption lk-tabular">${r.savedAt ? '마지막 저장 ' + fmtDateTime(r.savedAt) : '아직 저장하지 않았어요'}</p></div>
          <div class="row">${badge(st)}<span class="strong">지원 ${n}건</span>${!isNew && r.published ? `<a class="lk-button lk-button--secondary small-btn" href="#/admin/applicants?rec=${sel}">지원자 보기</a>` : ''}</div></div>
        <form id="rec-form" novalidate>
          <div class="field-grid">
            ${recField('title', r.title, ro, '필수', '1~100자', 'full')}
            ${recField('topic', r.topic, ro, '게시 시 필수', '1~200자')}
            ${recField('activity', r.activity, ro, '게시 시 필수', '1~200자')}
            ${recField('skills', r.skills, ro, '', '선택 · 0~300자')}
            ${recField('capacity', r.capacity, ro, '게시 시 필수', '1~99명', '', 'number')}
            ${recField('start', r.start, ro, '게시 시 필수', '', '', 'date')}
            ${locked && !closed
              ? recField('end', r.end, false, '', `현재 마감일 ${fmtDate(r.end)} · 더 늦은 날짜로만 연장`, '', 'date', '새 마감일', `min="${nextDay(r.end)}"`)
              : recField('end', r.end, closed, '게시 시 필수', '', '', 'date')}
          </div>
          ${isNew ? '<p class="lk-help" id="publish-hint" style="margin-top:16px">게시하려면 먼저 초안을 저장하세요. 저장한 공고만 게시할 수 있어요.</p>' : ''}
          <div class="callout" id="rec-alert" role="alert" hidden style="margin-top:16px"></div>
          <div class="form-actions" style="justify-content:flex-end">${recActions(r, st, locked, isNew)}</div>
        </form>
        ${isNew ? '' : `<section class="log-section"><h3>변경 이력</h3>${(r.log || []).length
          ? `<ol class="history">${r.log.map(([act, at, detail, who]) => `<li><time>${fmtDateTime(at)}</time><span>${esc(act)}${detail ? ` <span class="muted">· ${esc(detail)}</span>` : ''} <span class="lk-caption">${esc(who || '')}</span></span></li>`).join('')}</ol>`
          : '<p class="lk-help">아직 기록이 없어요.</p>'}</section>`}
      </section>
    </div>`;

  const form = $('#rec-form');
  const val = (k) => ($(`#f-${k}`) ? $(`#f-${k}`).value.trim() : '');
  const collect = () => ({ title: val('title'), topic: val('topic'), activity: val('activity'), skills: val('skills'), capacity: val('capacity'), start: val('start'), end: val('end') });
  const initial = JSON.stringify(collect());
  form.addEventListener('input', (e) => {
    // FR-05-11: 저장한 값과 달라졌을 때만 이탈을 확인한다
    guard = JSON.stringify(collect()) !== initial ? { title: '저장하지 않은 공고 내용이 있어요', body: '<p>지금 이동하면 변경한 내용이 저장되지 않아요.</p>' } : null;
    clearFieldError(e.target);
  });
  const clear = () => { $$('.lk-error', form).forEach((x) => { x.hidden = true; x.textContent = ''; }); $$('[aria-invalid]', form).forEach((x) => x.removeAttribute('aria-invalid')); };
  // 모든 칸을 검사해 각 칸 아래에 이유를 표시하고 첫 오류 칸으로 이동한다 (FR-05-02, InlineError)
  const showErrors = (errs) => {
    clear();
    errs.forEach(([k, msg]) => { const e = $(`#f-${k}-err`); e.textContent = msg; e.hidden = false; $(`#f-${k}`).setAttribute('aria-invalid', 'true'); });
    if (errs.length) $(`#f-${errs[0][0]}`).focus();
    return errs.length === 0;
  };
  // full=false: 초안 저장(공고명만 필수, 입력한 값은 길이·형식·날짜 순서 검사) / full=true: 게시·게시 공고 저장
  const checks = (d, full) => {
    const errs = [];
    if (chars(d.title) < 1 || chars(d.title) > 100) errs.push(['title', '공고명을 1~100자로 입력해주세요.']);
    if (full && chars(d.topic) < 1) errs.push(['topic', '게시하려면 연구 주제를 입력해주세요.']);
    else if (chars(d.topic) > 200) errs.push(['topic', '연구 주제는 200자 이하로 입력해주세요.']);
    if (full && chars(d.activity) < 1) errs.push(['activity', '게시하려면 활동 방식을 입력해주세요.']);
    else if (chars(d.activity) > 200) errs.push(['activity', '활동 방식은 200자 이하로 입력해주세요.']);
    if (chars(d.skills) > 300) errs.push(['skills', '요구 역량은 300자 이하로 입력해주세요.']);
    if (full || d.capacity) { const c = Number(d.capacity); if (!d.capacity || !Number.isInteger(c) || c < 1 || c > 99) errs.push(['capacity', '모집 인원은 1~99 사이 정수로 입력해주세요.']); }
    if (full && !d.start) errs.push(['start', '모집 시작일을 입력해주세요.']);
    if (full && !d.end) errs.push(['end', '모집 마감일을 입력해주세요.']);
    else if (d.start && d.end && d.start > d.end) errs.push(['end', '모집 마감일은 시작일보다 빠를 수 없어요.']);
    else if (full && d.end < todayIso()) errs.push(['end', '마감일이 이미 지났어요. 오늘 이후 날짜를 선택해주세요.']);
    return errs;
  };
  const shown = (k, v) => (v === '' || v == null ? '(빈 값)' : k === 'start' || k === 'end' ? fmtDate(v) : String(v));
  const diff = (d) => Object.keys(REC_FIELDS).filter((k) => String(d[k] ?? '') !== String(r[k] ?? '')).map((k) => `${REC_FIELDS[k]} ${shown(k, r[k])} → ${shown(k, d[k])}`).join(', ');
  const alertBox = $('#rec-alert');
  // 미저장 입력이 있으면 버린다는 확인을 받고 서버의 최신 공고로 다시 그린다 (FR-05-09)
  const reloadLatest = async () => {
    if (guard && !(await confirmDialog({ title: '최신 내용을 불러올까요?', body: '<p>지금 입력한 내용은 저장되지 않고 서버에 저장된 최신 내용으로 바뀌어요.</p>', ok: '최신 내용 불러오기', cancel: '계속 작성' }))) return;
    guard = null; render();
  };
  // 거절된 뒤 서버의 최신 공고와 비교해 이유를 알려 준다. 저장된 값은 덮어쓰지 않았고 입력은 그대로 둔다 (FR-05-09, 4.9)
  const explainRejected = async () => {
    try { await syncState(); } catch { /* 연결이 안 되면 마지막으로 받은 내용으로 판단한다 */ }
    const fresh = isNew ? null : S.recs[sel];
    let why = '공고 상태가 바뀌어 저장하지 못했어요.';
    if (!isNew && !fresh) why = '이 공고를 더 이상 관리할 수 없어요.';
    else if (fresh && recStatus(fresh) === '마감' && !closed) why = '그사이 모집이 마감됐어요. 마감된 공고는 바꿀 수 없어요.';
    else if (fresh && !locked && appsOf(sel).length > 0) why = '그사이 첫 지원이 들어와 공고 항목이 고정됐어요. 이제 기간 연장과 조기 마감만 할 수 있어요.';
    else if (fresh && fresh.savedAt !== r.savedAt) why = `다른 곳에서 이 공고를 먼저 저장했어요(마지막 저장 ${fmtDateTime(fresh.savedAt)}).`;
    showCallout(alertBox, '저장하지 않았어요', `${why} 서버에 저장된 내용은 바뀌지 않았어요. 최신 내용을 확인한 뒤 다시 시도하세요.`, '최신 내용 불러오기', reloadLatest);
  };
  // 응답을 받지 못하면 성공·실패를 단정하지 않고 서버에서 결과를 다시 확인한다. 같은 변경을 새로 보내지 않는다 (4.9, FR-X-06)
  const checkResult = async (idOrNull, action, data, before, msg) => {
    try { await syncState(); } catch {
      showCallout(alertBox, '저장 결과를 확인하지 못했어요', '서버 응답을 받지 못해 저장됐는지 아직 알 수 없어요. 연결을 확인한 뒤 결과를 확인하세요. 같은 내용을 다시 저장하기 전에 먼저 확인해 주세요.', '저장 결과 확인',
        (b) => busy(b, '확인 중…', () => checkResult(idOrNull, action, data, before, msg)));
      return;
    }
    const savedId = idOrNull
      ? (S.recs[idOrNull] && S.recs[idOrNull].savedAt !== r.savedAt && recApplied(S.recs[idOrNull], action, data) ? idOrNull : null)
      : Object.keys(S.recs).find((k) => !before.has(k) && S.recs[k].lab === LAB && S.recs[k].title === data.title);
    if (savedId) { guard = null; go(`#/admin/recruitments?rec=${savedId}`, { replace: true }); toast(`저장된 것으로 확인됐어요. ${msg}`); return; }
    if (idOrNull && S.recs[idOrNull] && S.recs[idOrNull].savedAt !== r.savedAt) { explainRejected(); return; }
    alertBox.hidden = true;
    toast('저장되지 않은 것으로 확인됐어요. 입력한 내용은 그대로 있으니 다시 시도하세요.', true);
  };
  // 저장할 때마다 마지막 저장 시각과 변경 이력(주체·시각·종류·변경 전후)을 남긴다 (FR-05-07)
  // 서버가 권한·고정 규칙·입력을 다시 검사하고, 화면을 연 뒤 다른 곳에서 먼저 저장됐으면 덮어쓰지 않는다 (마지막 저장 시각으로 버전 확인)
  const commit = async (btn, idOrNull, action, data, msg, detail = '') => {
    alertBox.hidden = true;
    const before = new Set(Object.keys(S.recs));
    // 처리 중에는 누른 버튼뿐 아니라 다른 동작 버튼도 막는다 (FR-X-06)
    const others = $$('.form-actions button', form).filter((b) => b !== btn && !b.disabled);
    others.forEach((b) => { b.disabled = true; });
    let res;
    try { res = await busy(btn, '저장 중…', () => api.saveRecruitment(idOrNull, idOrNull ? r.savedAt : null, action, data, detail)); }
    finally { others.forEach((b) => { if (b.isConnected) b.disabled = false; }); }
    if (res.ok) { guard = null; go(`#/admin/recruitments?rec=${res.id}`, { replace: true }); toast(msg); return; }
    if (res.errors) { showErrors(res.errors); return; }
    if (res.code === 'network') { await checkResult(idOrNull, action, data, before, msg); return; }
    if (res.code === 'login') { guard = null; render(); toast('로그인 상태나 권한이 바뀌어 저장하지 못했어요. 다시 로그인해주세요.', true); return; }
    await explainRejected();
  };

  on('#save-draft', (e) => {
    const d = collect(); if (!showErrors(checks(d, false))) return;
    commit(e.currentTarget, isNew ? null : sel, 'draft', d, '초안을 저장했어요. 학생에게는 아직 보이지 않아요.');
  });
  on('#publish', async (e) => {
    if (isNew) return; // 새 공고는 초안을 먼저 저장해야 게시할 수 있다 (UI-05)
    const btn = e.currentTarget;
    const d = collect(); if (!showErrors(checks(d, true))) return;
    const ok = await confirmDialog({ title: '공고를 게시할까요?', body: `<p><b>${esc(d.title)}</b></p><p class="lk-tabular">모집기간 ${fmtDate(d.start)} – ${fmtDate(d.end)} · ${esc(d.capacity)}명</p><p>게시하면 연구실 탐색에 바로 공개되고 게시를 취소할 수 없어요. 첫 지원 이후에는 기간 연장과 조기 마감만 할 수 있어요.</p>`, ok: '공고 게시' });
    if (!ok) return;
    commit(btn, sel, 'publish', d, '공고를 게시했어요. 연구실 탐색에서 확인할 수 있어요.', `모집기간 ${fmtDate(d.start)} – ${fmtDate(d.end)} · ${d.capacity}명`);
  });
  on('#save-edit', (e) => {
    const d = collect(); if (!showErrors(checks(d, true))) return;
    commit(e.currentTarget, sel, 'edit', d, '공고 변경 내용을 저장했어요.', diff(d) || '변경 없음');
  });
  on('#extend', async (e) => {
    const btn = e.currentTarget;
    const end = val('end');
    if (!end || end <= r.end) { showErrors([['end', `새 마감일은 현재 마감일(${fmtDate(r.end)})보다 늦어야 해요.`]]); return; }
    clear();
    const ok = await confirmDialog({ title: '모집 기간을 연장할까요?', body: `<p class="lk-tabular">마감일 ${fmtDate(r.end)} → <b>${fmtDate(end)}</b></p><p>연장한 기간은 다시 줄일 수 없어요. 시작일과 다른 공고 항목은 바뀌지 않아요.</p>`, ok: '기간 연장' });
    if (ok) commit(btn, sel, 'extend', { end }, `마감일을 ${fmtDate(end)}로 연장했어요.`, `마감일 ${fmtDate(r.end)} → ${fmtDate(end)}`);
  });
  on('#early-close', async (e) => {
    const btn = e.currentTarget;
    const ok = await confirmDialog({ title: '모집을 조기 마감할까요?', body: `<p><b>${esc(r.title)}</b></p><p>마감하면 다시 열 수 없고 새 지원을 받을 수 없어요. 이미 받은 지원서 심사는 계속할 수 있어요.</p>`, ok: '조기 마감', danger: true });
    if (ok) commit(btn, sel, 'close', {}, '모집을 조기 마감했어요.');
  });
}
function recField(k, value, ro, req, note, cls = '', type = 'text', label = REC_FIELDS[k], attrs = '') {
  if (ro && type === 'date') { type = 'text'; value = fmtDate(value); }
  const marks = ro ? '<span class="opt">읽기 전용</span>' : `${req ? `<span class="req">${req}</span>` : ''}${note ? `<span class="opt">${note}</span>` : ''}`;
  return `<div class="lk-field ${cls}"><label class="lk-label" for="f-${k}">${label}${marks}</label>
    <input class="lk-input" id="f-${k}" type="${type}" value="${esc(value)}" aria-describedby="f-${k}-err" ${ro ? 'readonly' : ''} ${type === 'number' ? 'min="1" max="99" step="1" inputmode="numeric"' : ''} ${attrs}>
    <p class="lk-error" id="f-${k}-err" hidden></p></div>`;
}
function recActions(r, st, locked, isNew) {
  if (st === '마감') return '<p class="lk-help">마감된 공고는 다시 열거나 수정할 수 없어요. 기존 지원서 심사는 지원자 관리에서 계속할 수 있어요.</p>';
  if (!r.published || isNew) return `<button type="button" class="lk-button lk-button--secondary" id="save-draft">초안 저장</button><button type="button" class="lk-button" id="publish" ${isNew ? 'disabled aria-describedby="publish-hint"' : ''}>공고 게시</button>`;
  if (locked) return `<button type="button" class="lk-button" id="extend">기간 연장</button>${st === '모집 중' ? '<button type="button" class="lk-button lk-button--secondary danger-outline" id="early-close">조기 마감</button>' : ''}`;
  return `<button type="button" class="lk-button" id="save-edit">변경 저장</button>${st === '모집 중' ? '<button type="button" class="lk-button lk-button--secondary danger-outline" id="early-close">조기 마감</button>' : ''}`;
}
// 날짜(YYYY-MM-DD)의 다음 날. 기간 연장 칸은 현재 마감일 다음 날부터 고를 수 있다 (FR-05-05)
const nextDay = (iso) => (iso ? new Date(Date.parse(`${iso}T00:00:00Z`) + 864e5).toISOString().slice(0, 10) : '');
// 응답을 받지 못한 뒤 다시 받은 공고에 이번 요청 내용이 반영됐는지 본다 (4.9)
function recApplied(fresh, action, data) {
  if (action === 'close') return !!fresh.earlyClosedAt;
  if (action === 'extend') return fresh.end === data.end;
  if (action === 'publish' && !fresh.published) return false;
  return Object.keys(REC_FIELDS).every((k) => String(fresh[k] ?? '') === String(data[k] ?? ''));
}
// 거절 이유나 결과 미확인을 화면 안에 남기고 다음 동작 버튼을 둔다 (4.9)
function showCallout(el, title, text, label, onClick) {
  el.innerHTML = `<p class="strong">${esc(title)}</p><p>${esc(text)}</p>${label ? `<div class="row" style="margin-top:8px"><button type="button" class="lk-button lk-button--secondary">${esc(label)}</button></div>` : ''}`;
  el.hidden = false;
  if (label) $('button', el).addEventListener('click', (e) => onClick(e.currentTarget));
  el.scrollIntoView({ block: 'nearest' });
}

// ---------- UI-06 지원자 심사 ----------
function viewReview(view, q, u) {
  const LAB = u.assignedLabId;
  const recs = Object.entries(S.recs).filter(([, r]) => r.lab === LAB && r.published);
  const title = head('지원자 관리', '상태 변경은 선택한 다음 단계와 확인창을 거쳐 저장돼요.');
  if (!recs.length) {
    view.innerHTML = `${title}${panelMsg('게시한 공고가 없어요.', '공고를 게시하면 지원자를 관리할 수 있어요.', '<a class="lk-button lk-button--secondary" href="#/admin/recruitments">모집 공고 관리</a>')}`;
    return;
  }
  // FR-06-08.2: 최초 진입은 공고 선택부터, 유효한 본인 공고 ID가 있으면 그 공고를 선택
  const recParam = q.get('rec');
  const rec = recParam && recs.some(([id]) => id === recParam) ? recParam : '';
  const filters = ['지원 완료', '검토 중', '면담', '합격', '불합격', '철회'];
  const filter = rec && filters.includes(q.get('filter')) ? q.get('filter') : '';
  const sel = q.get('app');
  const r = rec ? S.recs[rec] : null;
  const all = rec ? Object.entries(S.apps).filter(([, a]) => a.rec === rec) : [];
  const count = (x) => all.filter(([, a]) => appStatus(a) === x).length;
  // FR-06-08.3: 제출일 내림차순, 같은 시각은 접수 ID 내림차순
  const list = all.filter(([, a]) => !filter || appStatus(a) === filter).sort((x, y) => y[1].submittedAt.localeCompare(x[1].submittedAt) || y[0].localeCompare(x[0]));
  const cur = sel && list.some(([k]) => k === sel) ? S.apps[sel] : null;
  const link = (o) => { const p = new URLSearchParams({ rec, ...(filter ? { filter } : {}), ...o }); [...p.keys()].forEach((k) => !p.get(k) && p.delete(k)); return `#/admin/applicants?${p}`; };
  const passed = rec ? passedCount(rec) : 0;
  view.innerHTML = `${title}
    <div class="lk-panel" style="margin-bottom:24px"><div class="review-filters">
      <label class="lk-field"><span class="lk-label">공고 선택</span><select class="lk-input" id="rec-sel">${rec ? '' : '<option value="" selected>공고를 선택하세요</option>'}${recs.map(([id, x]) => `<option value="${id}" ${id === rec ? 'selected' : ''}>${esc(x.title)} · ${recStatus(x)}</option>`).join('')}</select></label>
      <label class="lk-field"><span class="lk-label">상태 필터</span><select class="lk-input" id="filter-sel" ${rec ? '' : 'disabled'}><option value="">전체 (${all.length})</option>${filters.map((x) => `<option value="${x}" ${x === filter ? 'selected' : ''}>${x} (${count(x)})</option>`).join('')}</select></label></div>
      ${r ? `<p class="capacity lk-tabular">모집기간 ${period(r)} · 합격 <b>${passed}</b>명 / 모집 인원 <b>${esc(r.capacity)}</b>명 · 남은 정원 <b>${Math.max(Number(r.capacity) - passed, 0)}</b>명 · 전체 지원 <b>${all.length}</b>건</p>` : ''}</div>
    ${!rec ? panelMsg('공고를 선택하세요.', '선택한 공고의 지원 목록과 정원 현황이 나와요.') : `
    <div class="split split--list">
      <section class="lk-panel"><h2 class="lk-item-title" style="margin-bottom:12px">지원 목록 <span class="lk-caption">${filter ? `${esc(filter)} ${list.length}건 / 전체 ${all.length}건` : `${list.length}건`}</span></h2>
        ${list.length ? `<ul class="pick-list">${list.map(([k, a]) => { const s = appStatus(a); return s === '철회'
          ? `<li><a class="pick" href="${link({ app: k })}" aria-current="${k === sel}"><span class="pick__title"><span>접수 ${a.id}</span>${badge(s)}</span><span class="lk-caption lk-tabular">제출 ${localDay(a.submittedAt)}</span><span class="lk-caption lk-tabular">철회 ${localDay(a.history.at(-1)[1])}</span></a></li>`
          : `<li><a class="pick" href="${link({ app: k })}" aria-current="${k === sel}"><span class="pick__title"><span>${esc(a.student)}</span>${badge(s)}</span><span class="lk-caption">접수 ${a.id}</span><span class="lk-caption lk-tabular">제출 ${localDay(a.submittedAt)}</span></a></li>`; }).join('')}</ul>
          <p class="lk-caption" style="margin-top:12px">최신 제출순</p>`
          : all.length ? `<div class="stack"><p class="lk-description">‘${esc(filter)}’ 상태의 지원서가 없어요.</p><a class="lk-button lk-button--secondary" href="#/admin/applicants?rec=${rec}">필터 전체 보기</a></div>`
          : '<p class="lk-description">아직 이 공고에 지원한 학생이 없어요.</p>'}
      </section>
      <section class="lk-panel" id="rv-detail"></section>
    </div>`}`;
  $('#rec-sel').addEventListener('change', (e) => go(e.target.value ? `#/admin/applicants?rec=${e.target.value}` : '#/admin/applicants'));
  // FR-06-08.4: 상태 필터를 바꾸면 선택한 지원서를 해제한다 (공고를 바꾸면 필터도 전체로)
  const fs = $('#filter-sel');
  if (fs && rec) fs.addEventListener('change', (e) => { const p = new URLSearchParams({ rec }); if (e.target.value) p.set('filter', e.target.value); go(`#/admin/applicants?${p}`); });
  if (!rec) return;

  const box = $('#rv-detail');
  if (!cur) {
    box.innerHTML = sel
      ? '<div class="empty-detail"><p class="lk-item-title">지원서를 찾을 수 없거나 볼 수 없어요.</p><p class="lk-description" style="margin-top:8px">목록에서 지원서를 다시 선택하세요.</p></div>'
      : `<p class="empty-detail">${list.length ? '목록에서 지원서를 선택하세요.' : '선택할 지원서가 없어요.'}</p>`;
    return;
  }
  touch();
  const s = appStatus(cur);
  if (s === '철회') {
    box.innerHTML = `<div class="row"><h2 class="lk-item-title">접수 ${cur.id}</h2><span class="spacer"></span>${badge(s)}</div>
      <dl class="kv" style="margin-top:16px"><dt>제출일</dt><dd class="lk-tabular">${fmtDateTime(cur.submittedAt)}</dd><dt>철회일</dt><dd class="lk-tabular">${fmtDateTime(cur.history.at(-1)[1])}</dd></dl>
      <p class="lk-help" style="margin-top:16px">학생이 철회한 지원서는 접수번호와 날짜만 볼 수 있어요.</p>`;
    return;
  }
  const next = NEXT[s] || [];
  box.innerHTML = `
    <div class="row"><div><h2 class="lk-item-title">${esc(cur.student)}의 지원서</h2><p class="lk-caption">접수 ${cur.id} · 제출 당시 프로필</p></div><span class="spacer"></span>${badge(s)}</div>
    <section class="section"><h3>제출 내용</h3><dl class="kv"><dt>지원자</dt><dd>${esc(cur.student)} · ${esc(cur.dept)} · ${cur.year}학년</dd><dt>학교 이메일</dt><dd>${esc(cur.email)}</dd><dt>진학 희망</dt><dd>${esc(cur.course)}</dd><dt>첨부</dt><dd>${fileLinks(sel, cur)}</dd></dl><p class="quote" style="margin-top:8px">${esc(cur.intro)}</p></section>
    <section class="section"><h3>상태 이력</h3><ol class="history">${cur.history.map(([st, at]) => `<li><time>${fmtDateTime(at)}</time><span>${st}</span></li>`).join('')}</ol></section>
    <section class="section">${TERMINAL.includes(s) ? '<p class="lk-help">최종 결과가 확정된 지원서는 상태를 바꿀 수 없어요.</p>' : `
      <h3>다음 단계 선택</h3><div class="next-steps" role="group" aria-label="다음 단계">${next.map((x) => `<button type="button" class="lk-button" aria-pressed="false" data-next="${x}">${x === '검토 중' ? '검토 시작' : x}</button>`).join('')}</div>
      <p class="lk-error" id="rv-err" role="alert" hidden style="margin-top:12px"></p>
      <div class="callout" id="rv-alert" role="alert" hidden style="margin-top:12px"></div>
      <p class="lk-help" id="rv-hint" style="margin-top:12px">다음 단계를 먼저 선택하세요.</p>
      <div class="form-actions" style="justify-content:flex-end;margin-top:16px"><button type="button" class="lk-button" id="rv-confirm" disabled aria-describedby="rv-hint">변경 내용 확인</button></div>`}</section>`;
  hydrateFiles(box);
  let pick = null;
  const full = () => passedCount(rec) >= Number(S.recs[rec].capacity);
  const capacityError = (live) => {
    const others = (NEXT[live] || []).filter((x) => x !== '합격');
    const e = $('#rv-err');
    e.textContent = `모집 인원 ${S.recs[rec].capacity}명이 모두 합격 처리되어 더 합격시킬 수 없어요.${others.length ? ` ${others.join('·')} 처리는 할 수 있어요.` : ''}`;
    e.hidden = false;
  };
  $$('[data-next]').forEach((b) => b.addEventListener('click', () => {
    pick = b.dataset.next;
    $$('[data-next]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('#rv-confirm').disabled = false; $('#rv-hint').hidden = true;
    const e = $('#rv-err'); e.hidden = true; e.textContent = '';
  }));
  on('#rv-confirm', async () => {
    if (!pick) return;
    if (pick === '합격' && full()) { capacityError(s); return; }
    const final = TERMINAL.includes(pick);
    const ok = await confirmDialog({ title: `${pick === '검토 중' ? '검토를 시작' : `'${pick}'(으)로 변경`}할까요?`, body: `<p><b>${esc(cur.student)}</b> · 접수 ${cur.id}</p><p>${s} → <b>${pick}</b></p><p>${final ? '최종 결과는 저장 후 되돌릴 수 없어요.' : '저장한 상태는 이전 단계로 되돌릴 수 없어요.'}</p>`, ok: '변경 저장' });
    if (!ok) return;
    $('#rv-alert').hidden = true;
    // 처리 중에는 다른 다음 단계 버튼도 막는다 (FR-X-06)
    const steps = $$('[data-next]', box);
    steps.forEach((b) => { b.disabled = true; });
    // 서버가 확인창에서 본 상태(s)와 허용 전이를 다시 검사하고, 합격이면 공고를 잠근 채 정원을 세어 저장과 한 번에 확정한다 (FR-06-07)
    let res;
    try { res = await busy($('#rv-confirm'), '저장 중…', () => api.decideApplication(sel, rec, s, pick)); }
    finally { steps.forEach((b) => { if (b.isConnected) b.disabled = false; }); }
    const outcome = res.ok ? 'ok' : res.code;
    if (outcome === 'ok') { saved(`${cur.student}의 지원 상태를 '${pick}'(으)로 저장했어요.`); return; }
    if (outcome === 'full' && $('#rv-err')) { capacityError(s); return; }
    if (outcome === 'login') { render(); toast('로그인 상태나 권한이 바뀌어 저장하지 못했어요. 다시 로그인해주세요.', true); return; }
    if (outcome === 'network') { await checkResult(pick); return; }
    await showLatest('다른 곳에서 상태가 먼저 바뀌어 저장하지 않았어요.');
  });
  // FR-06-08.5: 바뀐 상태가 현재 필터에서 빠지면 선택을 해제한다
  const saved = (msg) => {
    const stays = !filter || filter === pick;
    go(stays ? link({ app: sel }) : link({}), { replace: true });
    toast(msg);
  };
  // 거절된 뒤 최신 상태를 받아 보여 준다. 필터에서 빠졌으면 '찾을 수 없음' 대신 선택을 풀고 이유를 알린다 (FR-06-03.2, FR-06-08.5)
  const showLatest = async (prefix) => {
    try { await syncState(); } catch { /* 연결이 안 되면 마지막으로 받은 내용으로 판단한다 */ }
    const fresh = S.apps[sel];
    const live = fresh ? appStatus(fresh) : null;
    if (!live) { go(link({}), { replace: true }); toast(`${prefix} 이 지원서는 더 이상 볼 수 없어요.`, true); return; }
    if (filter && live !== filter) { go(link({}), { replace: true }); toast(`${prefix} 지금은 '${live}' 상태라 '${filter}' 필터에서 빠져 선택을 해제했어요.`, true); return; }
    render(); toast(`${prefix} 지금은 '${live}' 상태예요. 최신 상태에서 다음 단계를 다시 선택하세요.`, true);
  };
  // 응답을 받지 못하면 성공·실패를 단정하지 않고 서버에서 지금 상태를 다시 확인한다. 같은 변경을 새로 보내지 않는다 (4.9)
  const checkResult = async (next) => {
    try { await syncState(); } catch {
      showCallout($('#rv-alert'), '처리 결과를 확인하지 못했어요', '서버 응답을 받지 못해 상태가 바뀌었는지 아직 알 수 없어요. 연결을 확인한 뒤 결과를 확인하세요. 다시 저장하기 전에 먼저 확인해 주세요.', '처리 결과 확인',
        (b) => busy(b, '확인 중…', () => checkResult(next)));
      return;
    }
    const live = S.apps[sel] ? appStatus(S.apps[sel]) : null;
    if (live === next) { saved(`저장된 것으로 확인됐어요. ${cur.student}의 지원은 지금 '${next}' 상태예요.`); return; }
    if (live === s) { $('#rv-alert').hidden = true; toast('저장되지 않은 것으로 확인됐어요. 다음 단계를 다시 확인하고 저장하세요.', true); return; }
    await showLatest('다른 곳에서 상태가 먼저 바뀌었어요.');
  };
}

// ---------- 운영 보조: 연구실 인증 요청 검토 (FR-07-09~12) ----------
function viewOps(view, q, u) {
  const filters = ['승인 대기', '승인', '반려'];
  const filter = filters.includes(q.get('status')) ? q.get('status') : '';
  // 소관 학과 연구실의 요청만 본다 (FR-07-09)
  const all = Object.values(S.vreqs).filter((r) => S.labs[r.labId] && S.labs[r.labId].dept === u.department).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const list = all.filter((r) => !filter || r.status === filter);
  const sel = q.get('req');
  const cur = sel ? list.find((r) => r.id === sel) : null;
  const link = (o) => { const p = new URLSearchParams({ ...(filter ? { status: filter } : {}), ...o }); return `#/ops/verifications${p.toString() ? '?' + p : ''}`; };
  view.innerHTML = `${head('연구실 인증 요청 검토', `${esc(u.department)} 연구실의 관리자 인증 요청만 볼 수 있어요. 학생 지원서와 첨부는 볼 수 없어요.`)}
    <div class="lk-panel" style="margin-bottom:24px"><div class="review-filters review-filters--one">
      <label class="lk-field"><span class="lk-label">상태</span><select class="lk-input" id="ops-filter"><option value="">전체 (${all.length})</option>${filters.map((x) => `<option value="${x}" ${x === filter ? 'selected' : ''}>${x} (${all.filter((r) => r.status === x).length})</option>`).join('')}</select></label></div></div>
    <div class="split split--list">
      <section class="lk-panel"><h2 class="lk-item-title" style="margin-bottom:12px">요청 목록 <span class="lk-caption">${list.length}건</span></h2>
        ${list.length ? `<ul class="pick-list">${list.map((r) => `<li><a class="pick" href="${link({ req: r.id })}" aria-current="${r.id === sel}"><span class="pick__title"><span>${esc(r.nameSnapshot)}</span>${badge(r.status)}</span><span>${esc(S.labs[r.labId].name)}</span><span class="lk-caption lk-tabular">신청 ${fmtDateTime(r.requestedAt)}</span></a></li>`).join('')}</ul>
          <p class="lk-caption" style="margin-top:12px">최신 신청순</p>`
          : `<p class="lk-description">${filter ? `‘${esc(filter)}’ 상태의 요청이 없어요.` : '아직 들어온 인증 요청이 없어요.'}</p>`}
      </section>
      <section class="lk-panel" id="ops-detail"></section>
    </div>`;
  $('#ops-filter').addEventListener('change', (e) => go(e.target.value ? `#/ops/verifications?status=${encodeURIComponent(e.target.value)}` : '#/ops/verifications'));
  const box = $('#ops-detail');
  if (!cur) {
    box.innerHTML = sel
      ? '<div class="empty-detail"><p class="lk-item-title">요청을 찾을 수 없거나 볼 수 없어요.</p><p class="lk-description" style="margin-top:8px">목록에서 요청을 다시 선택하세요.</p></div>'
      : `<p class="empty-detail">${list.length ? '목록에서 요청을 선택하세요.' : '선택할 요청이 없어요.'}</p>`;
    return;
  }
  const requester = S.users[cur.requesterId];
  const lab = S.labs[cur.labId];
  const reviewer = cur.reviewedBy ? S.users[cur.reviewedBy] : null;
  box.innerHTML = `
    <div class="row"><div><h2 class="lk-item-title">${esc(cur.nameSnapshot)}의 인증 요청</h2><p class="lk-caption lk-tabular">요청 ${cur.id} · 신청 ${fmtDateTime(cur.requestedAt)}</p></div><span class="spacer"></span>${badge(cur.status)}</div>
    <section class="section"><h3>신청자</h3><dl class="kv"><dt>신청 당시 이름</dt><dd>${esc(cur.nameSnapshot)}</dd><dt>학교 이메일</dt><dd>${esc(requester.email)} · ${requester.emailVerifiedAt ? '확인 완료' : '미확인'}</dd><dt>계정 상태</dt><dd>${requester.assignedLabId ? `연구실 배정됨 · ${esc(S.labs[requester.assignedLabId].name)}` : '미배정 관리자'}</dd></dl></section>
    <section class="section"><h3>대상 연구실</h3><dl class="kv"><dt>연구실</dt><dd>${esc(lab.name)}</dd><dt>지도교수</dt><dd>${esc(lab.professor)}</dd><dt>학과</dt><dd>${esc(lab.dept)}</dd></dl></section>
    <section class="section"><h3>소속 설명</h3><p class="quote">${esc(cur.description)}</p></section>
    <section class="section"><h3>위임 근거</h3><p>${proofLink(cur)}</p>
      <p class="lk-help" style="margin-top:4px">신청자·지도교수·연구실과 관리 위임 의사가 증빙과 맞는지 직접 확인하세요. 시스템은 PDF 형식만 검사해요.</p>
      ${cur.previousRequestId ? `<p class="lk-caption" style="margin-top:4px">이전 요청(${cur.previousRequestId})이 반려된 뒤 다시 신청했어요.</p>` : ''}</section>
    <section class="section">${cur.status === '승인 대기' ? `
      <h3>판정</h3>
      <div class="lk-field"><label class="lk-label" for="ops-reason">반려 사유<span class="opt">반려할 때 필수 · 1~500자</span></label>
        <textarea class="lk-input" id="ops-reason" rows="3" placeholder="신청자가 무엇을 보완해야 하는지 적어주세요." aria-describedby="ops-reason-err"></textarea>
        <p class="lk-error" id="ops-reason-err" hidden></p></div>
      <div class="form-actions" style="justify-content:flex-end;margin-top:16px"><button type="button" class="lk-button lk-button--secondary danger-outline" id="ops-reject">반려</button><button type="button" class="lk-button" id="ops-approve">승인</button></div>`
      : `<h3>판정 결과</h3><dl class="kv"><dt>결과</dt><dd>${badge(cur.status)}</dd><dt>검토자</dt><dd>${esc(reviewer ? reviewer.name : '-')}</dd><dt>판정 시각</dt><dd class="lk-tabular">${fmtDateTime(cur.reviewedAt)}</dd>${cur.status === '반려' ? `<dt>반려 사유</dt><dd>${esc(cur.rejectionReason)}</dd>` : ''}</dl>
        <p class="lk-help" style="margin-top:8px">판정이 끝난 요청은 다시 판정할 수 없어요.</p>`}</section>`;
  hydrateFiles(box);
  touch();
  const reason = $('#ops-reason');
  if (reason) reason.addEventListener('input', () => { clearFieldError(reason); guard = reason.value.trim() ? { title: '작성 중인 반려 사유가 있어요', body: '<p>지금 이동하면 입력한 사유가 저장되지 않아요.</p>' } : null; });
  const finish = (res, okMsg) => {
    if (res.ok) { guard = null; go(`#/ops/verifications?req=${cur.id}`, { replace: true }); toast(okMsg); return; }
    if (res.errors) { applyErrors('ops', res.errors); return; }
    render(); toast(res.message, true);
  };
  on('#ops-approve', async (e) => {
    const btn = e.currentTarget;
    const ok = await confirmDialog({ title: '인증 요청을 승인할까요?', body: `<p><b>${esc(cur.nameSnapshot)}</b> → ${esc(lab.name)} 관리자</p><p>승인하면 신청자에게 이 연구실이 배정되고, 모집 공고와 지원자를 관리할 수 있어요. 승인은 되돌릴 수 없어요.</p>`, ok: '승인' });
    if (!ok) return;
    const res = await busy(btn, '승인 중…', () => api.decideVerification(cur.id, 'approve'));
    finish(res, `승인했어요. ${cur.nameSnapshot}님이 ${lab.name} 관리자로 배정됐어요.`);
  });
  on('#ops-reject', async (e) => {
    const btn = e.currentTarget;
    const n = chars(clean(reason.value));
    if (n < 1 || n > 500) { applyErrors('ops', [['reason', n < 1 ? '반려 사유를 입력해주세요. 신청자가 무엇을 보완할지 알 수 있게 적어주세요.' : '반려 사유는 500자 이하로 줄여주세요.']]); return; }
    const ok = await confirmDialog({ title: '인증 요청을 반려할까요?', body: `<p><b>${esc(cur.nameSnapshot)}</b> · ${esc(lab.name)}</p><p class="quote">${esc(clean(reason.value))}</p><p>반려 사유는 신청자에게 그대로 보여요. 신청자는 보완해서 새로 신청할 수 있어요.</p>`, ok: '반려', danger: true });
    if (!ok) return;
    const res = await busy(btn, '반려 중…', () => api.decideVerification(cur.id, 'reject', reason.value));
    finish(res, '반려했어요. 신청자가 사유를 확인하고 다시 신청할 수 있어요.');
  });
}
