/* LabKnock · 데이터와 업무 규칙
 * 데이터는 Supabase(Postgres)에 있고, 화면은 로그인 역할이 볼 수 있는 것만 받아 S에 담아 그린다.
 * 저장은 모두 서버 함수(RPC)로 하며, 서버가 권한과 규칙(SRS 4장·6장·부록 B)을 다시 검사한다.
 * 모든 인물·연구실·공고는 가상이다. */
'use strict';

const DEMO_PASSWORD = 'labknock-demo-2026';
const DEPT = '소프트웨어학과';
const SESSION_LIMIT_MS = 30 * 60 * 1000;   // FR-07-13 마지막 활동부터 30분
const RESEND_GAP_MS = 60 * 1000;           // FR-07-04 재발송 60초 간격
const SCHOOL_DOMAINS = ['skku.edu', 'g.skku.edu'];
const LOCAL_KEY = 'labknock-local-v2';     // 이 브라우저의 활동 시각·복귀 목적지·최근 확인 메일 발송 시각

const SB = supabase.createClient(LK_CONFIG.url, LK_CONFIG.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'labknock-auth' },
});
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('labknock') : null;

// ---------- 화면 데이터 ----------
const local = (() => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; } catch { return {}; } })();
let S = { me: null, labs: {}, recs: {}, apps: {}, vreqs: {}, users: {}, demo: [], session: local };
function save() { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(S.session)); } catch { /* 저장 불가 환경 */ } }
let loaded = false;
// 서버에서 지금 로그인 역할이 볼 수 있는 데이터를 다시 받는다
async function syncState() {
  const { data, error } = await SB.rpc('get_state');
  if (error) throw error;
  const session = S.session;
  S = { ...data, session };
  if (!S.me && session.userId) { session.userId = null; save(); }
  loaded = true;
}
// 다른 탭에 변경을 알린다 (같은 브라우저의 다른 탭도 최신 상태로 다시 그린다)
function announce() { if (channel) channel.postMessage('changed'); }

// ---------- 공고·지원 규칙 (부록 B.1·B.2) ----------
function recStatus(r) {
  if (!r.published) return '작성 중';
  if (r.earlyClosedAt) return '마감';
  const now = new Date();
  const start = new Date(`${r.start}T00:00:00+09:00`);
  const endBoundary = new Date(new Date(`${r.end}T00:00:00+09:00`).getTime() + 864e5);
  if (now >= endBoundary) return '마감';
  if (now < start) return '모집 예정';
  return '모집 중';
}
const appStatus = (a) => a.history[a.history.length - 1][0];
const NEXT = { '지원 완료': ['검토 중'], '검토 중': ['면담', '합격', '불합격'], '면담': ['합격', '불합격'] };
const TERMINAL = ['합격', '불합격', '철회'];
const STATUS_ORDER = { '모집 중': 0, '모집 예정': 1, '마감': 2 };
const badgeClass = (s) => ({ '작성 중': 'neutral', '마감': 'neutral', '불합격': 'neutral', '철회': 'neutral', '반려': 'neutral', '면담': 'warning', '승인 대기': 'warning', '미확인': 'warning', '합격': 'success', '승인': 'success', '확인 완료': 'success', '확인함': 'success', '신청 전': 'neutral' }[s] || '');
const badge = (s) => `<span class="lk-badge ${badgeClass(s) ? 'lk-badge--' + badgeClass(s) : ''}">${esc(s)}</span>`;
const period = (r) => (r.start ? `${fmtDate(r.start)} – ${fmtDate(r.end)}` : '미정');
const appsOf = (recId) => Object.values(S.apps).filter((a) => a.rec === recId);
const passedCount = (recId) => appsOf(recId).filter((a) => appStatus(a) === '합격').length;
const myAppFor = (u, recId) => (u ? Object.values(S.apps).find((a) => a.studentId === u.id && a.rec === recId) : null);
// 지원 현황의 상태 의미 (SRS 2.6)
const STATUS_NOTE = {
  '지원 완료': '제출이 완료됐어요. 연구실이 검토를 시작하면 상태가 바뀌어요.',
  '검토 중': '연구실이 지원서를 검토하고 있어요.',
  '면담': '연구실이 면담 단계로 진행했어요. 면담 일정은 연구실이 따로 안내해요.',
  '합격': '최종 합격했어요.',
  '불합격': '이번 모집에는 합격하지 못했어요.',
  '철회': '지원을 철회했어요. 제출 내용은 읽기 전용으로 남고 같은 공고에 다시 지원할 수 없어요.',
};
function dday(r) {
  const today = new Date(`${todayIso()}T00:00:00+09:00`);
  const end = new Date(`${r.end}T00:00:00+09:00`);
  const d = Math.round((end - today) / 864e5);
  return d <= 0 ? '오늘 마감' : `D-${d}`;
}

// ---------- 계정·세션 (4.7, 6.2.1) ----------
const normEmail = (e) => String(e ?? '').trim().replace(/[A-Z]/g, (c) => c.toLowerCase()); // ASCII 대소문자만 무시 (FR-07-02)
const emailDomainOk = (e) => { const m = /^[^\s@]+@([^\s@]+)$/.exec(e); return !!m && SCHOOL_DOMAINS.includes(m[1]); };
let sessionNotice = '';   // 만료 안내 (로그인 화면에서 한 번 보여 준다)

function currentUser() {
  if (!S.me) return null;
  const s = S.session;
  // 30분 동안 활동이 없으면 로그아웃한다. 만료 여부를 갱신보다 먼저 검사한다 (FR-07-13.3)
  if (s.userId === S.me && s.lastActiveAt && Date.now() - new Date(s.lastActiveAt).getTime() >= SESSION_LIMIT_MS) {
    expireSession();
    return null;
  }
  return S.users[S.me] || null;
}
function expireSession() {
  S.me = null; S.session.userId = null; save();
  sessionNotice = '30분 동안 활동이 없어 로그아웃됐어요. 다시 로그인해주세요.';
  SB.auth.signOut({ scope: 'local' }).catch(() => {});
}
// 보호된 화면 조회·변경이 성공했을 때만 활동 시각을 갱신한다 (4.7.2)
let bgRender = false;
function touch() {
  if (bgRender || !S.me) return;
  const s = S.session;
  if (s.userId === S.me && s.lastActiveAt && Date.now() - new Date(s.lastActiveAt).getTime() >= SESSION_LIMIT_MS) return;
  s.userId = S.me; s.lastActiveAt = nowIso(); save();
}
function startSession(id) { S.session.userId = id; S.session.lastActiveAt = nowIso(); save(); }
const isAdmin = (u) => !!u && u.role === 'admin';
// 승인된 관리자: 배정 연구실과 승인 요청(본인·승인·같은 연구실)이 서로 맞아야 한다 (FR-07-10.3, 6.2.1)
const isApprovedAdmin = (u) => {
  if (!isAdmin(u) || !u.assignedLabId) return false;
  const r = S.vreqs[u.approvedReqId];
  return !!r && r.status === '승인' && r.requesterId === u.id && r.labId === u.assignedLabId;
};
const roleLabel = (u) => (u.role === 'student' ? '학생' : u.role === 'operator' ? '운영 보조' : (u.approved ?? isApprovedAdmin(u)) ? '연구실 관리자' : '관리자 신청자');
// 처리 뒤에도 같은 사람이 로그인해 있는지 다시 확인한다 (FR-07-13.3)
const sameUser = (u) => { const me = currentUser(); return me && u && me.id === u.id ? me : null; };
const profileComplete = (u) => u.role !== 'student' || (chars(u.name) >= 1 && [1, 2, 3, 4].includes(Number(u.grade)) && u.declaration === true);
// 로그인 뒤 기본 목적지: 방문자·학생은 홈, 연구실 관리자·운영 보조는 각자의 업무 화면
const homeOf = (u) => (!u || u.role === 'student' ? '#/' : u.role === 'operator' ? '#/ops/verifications' : '#/admin/recruitments');
// FR-07-13·3.1.8: 로그인·이메일 확인·프로필 보완 뒤 돌아갈 수 있는 내부 목적지만 허용한다
const RETURN_OK = /^#\/(lab\/L\d+\/R\d+(\?back=[\w%.~*'()!=&+-]*)?|apply\/R\d+|my(\?app=A\d+)?)$/;
const safeReturn = (h) => (h && RETURN_OK.test(h) ? h : '');

const vreqsOf = (u) => Object.values(S.vreqs).filter((r) => r.requesterId === u.id).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
const pendingReqOf = (u) => vreqsOf(u).find((r) => r.status === '승인 대기') || null;
function nextResendInMs(email) {
  const at = (S.session.sent || {})[email];
  return at ? Math.max(0, RESEND_GAP_MS - (Date.now() - at)) : 0;
}
function markSent(email) { S.session.sent = { ...(S.session.sent || {}), [email]: Date.now() }; save(); }

// ---------- 첨부 파일 (Supabase Storage, 본인 폴더) ----------
const filePath = (ownerId, fileKey, slot) => `${ownerId}/${fileKey}/${slot}.pdf`;
async function uploadPdf(path, file) {
  const { error } = await SB.storage.from('files').upload(path, file, { contentType: 'application/pdf', upsert: false });
  if (error) throw error;
}

// ---------- 서버 요청 ----------
// 성공: { ok: true, ... } / 입력 오류: { ok: false, errors: [[칸, 문구]] } / 거절: { ok: false, code, message }
const NETWORK = { ok: false, code: 'network', message: '서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요. 요청이 처리됐는지는 화면을 새로 열어 확인하세요.' };
async function rpc(name, args) {
  try {
    const { data, error } = await SB.rpc(name, args);
    if (error) return { ...NETWORK, detail: error.message };
    if (data && data.ok) { await syncState().catch(() => {}); announce(); }
    return data;
  } catch { return NETWORK; }
}
const LOGIN_FAIL = '로그인할 수 없어요. 이메일과 비밀번호를 확인해주세요. 5번 연속 틀리면 15분 동안 로그인이 제한돼요.';

const api = {
  async signup({ email, password, password2, role }) {
    const errors = [];
    const e = normEmail(email);
    if (!['student', 'admin'].includes(role)) errors.push(['role', '가입 유형을 선택해주세요.']);
    if (!e) errors.push(['email', '학교 이메일을 입력해주세요.']);
    else if (!emailDomainOk(e)) errors.push(['email', 'skku.edu 또는 g.skku.edu로 끝나는 학교 이메일만 가입할 수 있어요.']);
    const n = rawChars(password);
    if (n < 12 || n > 72) errors.push(['password', '비밀번호는 12~72자로 입력해주세요.']);
    if (!password2) errors.push(['password2', '비밀번호를 한 번 더 입력해주세요.']);
    else if (password !== password2) errors.push(['password2', '비밀번호가 서로 달라요. 다시 확인해주세요.']);
    if (errors.length) return { ok: false, errors };
    try {
      const { data, error } = await SB.auth.signUp({ email: e, password, options: { data: { role }, emailRedirectTo: LK_CONFIG.site } });
      if (error) {
        if (/database error/i.test(error.message)) return { ok: false, errors: [['email', 'skku.edu 또는 g.skku.edu로 끝나는 학교 이메일만 가입할 수 있어요.']] };
        if (/password/i.test(error.message)) return { ok: false, errors: [['password', '비밀번호는 12~72자로 입력해주세요.']] };
        if (/rate limit|security purposes/i.test(error.message)) return { ok: false, errors: [['email', '확인 메일을 너무 자주 요청했어요. 잠시 뒤 다시 시도해주세요.']] };
        return { ok: false, errors: [['email', '가입하지 못했어요. 잠시 뒤 다시 시도해주세요.']] };
      }
      // 이미 가입된 주소면 Supabase는 빈 계정 정보를 돌려준다
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return { ok: false, errors: [['email', '이미 가입된 이메일이에요. 로그인하거나 다른 주소를 입력해주세요.']] };
      }
      markSent(e);
      return { ok: true, email: e };
    } catch { return NETWORK; }
  },

  async login({ email, password }) {
    const e = normEmail(email);
    const errors = [];
    if (!e) errors.push(['email', '학교 이메일을 입력해주세요.']);
    if (!password) errors.push(['password', '비밀번호를 입력해주세요.']);
    if (errors.length) return { ok: false, errors };
    try {
      // 연속 실패 제한을 먼저 검사한다. 실패 문구는 계정이 있는지 구별하지 않는다 (NFR-06)
      const { data: chk, error: cerr } = await SB.rpc('login_attempt', { p_email: e, p_password: password });
      if (cerr) return NETWORK;
      if (!chk.ok && chk.code === 'unconfirmed') return { ok: false, code: 'unconfirmed', email: e, message: '학교 이메일 확인이 아직 끝나지 않았어요. 메일함에서 확인 링크를 눌러주세요.' };
      if (!chk.ok) return { ok: false, message: LOGIN_FAIL };
      const { data, error } = await SB.auth.signInWithPassword({ email: e, password });
      if (error) return { ok: false, message: LOGIN_FAIL };
      startSession(data.user.id);
      await syncState();
      announce();
      return { ok: true, user: currentUser() };
    } catch { return NETWORK; }
  },

  async logout() {
    S.session.userId = null; save();
    try { await SB.auth.signOut({ scope: 'local' }); } catch { /* 연결이 없어도 이 브라우저에서는 로그아웃한다 */ }
    S.me = null;
    announce();
  },

  async resendVerification(email) {
    const e = normEmail(email);
    if (!emailDomainOk(e)) return { ok: false, message: '학교 이메일 주소를 확인해주세요.' };
    const wait = nextResendInMs(e);
    if (wait > 0) return { ok: false, message: `새 확인 메일은 ${Math.ceil(wait / 1000)}초 뒤에 보낼 수 있어요.` };
    try {
      const { error } = await SB.auth.resend({ type: 'signup', email: e, options: { emailRedirectTo: LK_CONFIG.site } });
      if (error) {
        const m = /after (\d+) seconds/.exec(error.message);
        return { ok: false, message: m ? `새 확인 메일은 ${m[1]}초 뒤에 보낼 수 있어요.` : '확인 메일을 보내지 못했어요. 잠시 뒤 다시 시도해주세요.' };
      }
      markSent(e);
      return { ok: true };
    } catch { return NETWORK; }
  },

  // 메일의 확인 링크: 최신·미사용·미만료 링크면 확인을 마치고 로그인한다 (FR-07-03)
  async verifyEmailLink(tokenHash) {
    try {
      const { data, error } = await SB.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
      if (error) return { ok: false, code: 'expired' };
      startSession(data.user.id);
      await syncState();
      announce();
      return { ok: true };
    } catch { return { ok: false, code: 'network' }; }
  },

  // 기본 확인 메일: Supabase가 확인을 끝내고 돌려준 로그인 토큰으로 세션을 연다
  async acceptEmailSession(accessToken, refreshToken) {
    try {
      const { data, error } = await SB.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error || !data.user) return { ok: false, code: 'expired' };
      startSession(data.user.id);
      await syncState();
      announce();
      return { ok: true };
    } catch { return { ok: false, code: 'network' }; }
  },

  // 역할별 프로필 보완·수정 (4.7.1, FR-07-05·06)
  async saveProfile({ name, grade, declaration }) {
    const u = currentUser();
    if (!u) return { ok: false, message: '로그인이 필요해요.' };
    const res = await rpc('save_profile', { p_name: name, p_grade: grade === '' || grade == null ? null : Number(grade), p_declaration: declaration === true });
    if (res.ok) touch();
    return res;
  },

  // 연구실 인증 신청 (FR-07-08, 4.7.3)
  async requestVerification({ confirmedName, labId, description, file }) {
    const u = currentUser();
    if (!isAdmin(u)) return { ok: false, message: '관리자 신청 계정만 연구실 인증을 신청할 수 있어요.' };
    const errors = [];
    if (!chars(u.name)) errors.push(['name', '내 정보에서 본인 이름을 먼저 입력해주세요.']);
    if (!S.labs[labId]) errors.push(['lab', '대상 연구실을 선택해주세요.']);
    const n = chars(clean(description));
    if (n < 1) errors.push(['desc', '소속 설명을 입력해주세요.']);
    else if (n > 500) errors.push(['desc', '소속 설명은 500자 이하로 줄여주세요.']);
    if (!file) errors.push(['proof', '위임 근거 PDF를 선택해주세요.']);
    else if (!/\.pdf$/i.test(file.name) || file.size < 1 || file.size > 5_000_000) errors.push(['proof', '위임 근거는 5MB 이하의 PDF 파일이어야 해요.']);
    if (errors.length) return { ok: false, errors };
    const fileKey = randomHex(8);
    try { await uploadPdf(filePath(u.id, fileKey, 'proof'), file); } catch { return { ok: false, errors: [['proof', '파일을 올리지 못했어요. 다시 선택하거나 잠시 뒤 시도해주세요.']] }; }
    const res = await rpc('request_verification', { p_confirmed_name: confirmedName, p_lab_id: labId, p_description: description, p_proof: file.name, p_file_key: fileKey });
    if (res.ok) touch();
    return res;
  },

  // 운영 보조의 승인·반려 (FR-07-09~12)
  async decideVerification(id, decision, reason) {
    const res = await rpc('decide_verification', { p_id: id, p_decision: decision, p_reason: reason || '' });
    if (res.ok) touch();
    return res;
  },

  // 지원서 제출 (FR-03). 파일을 본인 폴더에 올린 뒤 서버가 자격·중복·모집 상태를 다시 검사하고 접수번호를 발급한다
  async submitApplication({ recId, intro, course, pick, link, shown }) {
    const u = currentUser();
    if (!u) return { ok: false, code: 'login' };
    const fileKey = randomHex(8);
    const files = [];
    try {
      for (const slot of ['cv', 'grade', 'pf']) {
        if (pick[slot]) { await uploadPdf(filePath(u.id, fileKey, slot), pick[slot]); files.push({ slot, name: pick[slot].name }); }
      }
    } catch { return { ok: false, code: 'upload' }; }
    if (link) files.push(link);
    const res = await rpc('submit_application', { p_rec_id: recId, p_intro: intro, p_course: course, p_files: files, p_file_key: fileKey, p_shown_name: shown.name, p_shown_grade: Number(shown.grade) });
    if (res.ok) touch();
    return res;
  },

  async withdraw(key, expected) {
    const res = await rpc('withdraw_application', { p_key: key, p_expected: expected });
    if (res.ok) touch();
    return res;
  },

  async decideApplication(key, recId, expected, next) {
    const res = await rpc('decide_application', { p_key: key, p_rec_id: recId, p_expected: expected, p_next: next });
    if (res.ok) touch();
    return res;
  },

  // action: draft(초안 저장) · publish(게시) · edit(게시 공고 수정) · extend(기간 연장) · close(조기 마감)
  async saveRecruitment(id, savedAt, action, data, detail) {
    const res = await rpc('save_recruitment', { p_id: id, p_saved_at: savedAt, p_action: action, p_data: data, p_detail: detail || '' });
    if (res.ok) touch();
    return res;
  },

  async resetDemo() { return rpc('reset_demo', {}); },
};
