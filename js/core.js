/* LabKnock · 공통 도구
 * DOM 선택, 날짜·글자 수 계산, 확인창, 알림, 첨부 파일 열기, 난수 */
'use strict';

// ---------- DOM·문자열 ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (iso) => (iso ? String(iso).slice(0, 10).replace(/-/g, '.') : '');
const fmtDateTime = (iso) => { const d = new Date(iso); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const fmtTime = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const localDay = (iso) => fmtDate(new Date(iso).toLocaleDateString('sv'));
const todayIso = () => new Date().toLocaleDateString('sv');
const nowIso = () => new Date().toISOString();
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const fmtSize = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

// ---------- 아이콘 ----------
// 한 가지 선형 세트만 쓴다(디자인 기준: 24 격자, stroke 1.75, 둥근 끝). 뜻은 옆 글자가 전하므로 화면 낭독기에는 숨긴다
const ICON_PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  'arrow-left': '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'file-text': '<path d="M14 2.5H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-11z"/><path d="M14 2.5v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  'alert-circle': '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16.5h.01"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  shield: '<path d="M12 21.5s7.5-3.6 7.5-9.5V5.5L12 2.5l-7.5 3V12c0 5.9 7.5 9.5 7.5 9.5z"/><path d="m9 12 2 2 4-4"/>',
  mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m21.5 7-9.5 6-9.5-6"/>',
};
const icon = (name, size = 20, cls = '') => `<svg class="lk-icon${cls ? ` ${cls}` : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON_PATHS[name] || ''}</svg>`;

// 6.1: 문자열은 NFC로 정규화한 뒤 화면상 한 문자(확장 자소 묶음) 단위로 센다
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('ko', { granularity: 'grapheme' }) : null;
const countUnits = (t) => (segmenter ? [...segmenter.segment(t)].length : [...t].length);
const chars = (s) => countUnits(String(s ?? '').normalize('NFC'));
const rawChars = (s) => countUnits(String(s ?? '')); // 비밀번호: 정규화·공백 제거 없이 센다
const clean = (s) => String(s ?? '').normalize('NFC').trim();
const norm = (s) => (s || '').normalize('NFC').replace(/\s+/gu, '').toLowerCase();

// ---------- 확인창·알림 ----------
// 되돌릴 수 없는 동작을 확인하므로 첫 포커스는 취소 버튼에 둔다 (SRS 3.1.9, NFR-07)
function confirmDialog({ title, body, ok = '확인', cancel = '취소', danger = false, focusCancel = true, alertOnly = false }) {
  const dlg = $('#dialog');
  if (dlg.open) return Promise.resolve(false);   // 이미 열린 확인창이 있으면 겹쳐 열지 않는다
  $('#dialog-title').textContent = title;
  $('#dialog-body').innerHTML = body;
  const okBtn = $('#dialog-ok');
  const cancelBtn = $('#dialog-cancel');
  okBtn.textContent = ok;
  cancelBtn.textContent = cancel;
  cancelBtn.hidden = alertOnly;
  okBtn.className = `lk-button${danger ? ' lk-button--danger' : ''}`;
  const opener = document.activeElement;
  return new Promise((resolve) => {
    dlg.returnValue = 'cancel';
    dlg.showModal();
    (focusCancel && !alertOnly ? cancelBtn : okBtn).focus();
    dlg.addEventListener('close', () => { resolve(dlg.returnValue === 'ok'); if (opener && opener.isConnected) opener.focus(); }, { once: true });
  });
}
let toastTimer;
let toastAt = 0;
function toast(msg, isError = false) {
  toastAt = Date.now();
  const el = $('#toast');
  el.innerHTML = `${icon(isError ? 'alert-circle' : 'check-circle', 20, 'toast__icon')}<span>${esc(msg)}</span>`;
  el.classList.toggle('is-error', isError);
  el.hidden = true; void el.offsetWidth; el.hidden = false; // 연속 알림에도 등장 전환을 다시 재생
  // 화면 낭독기용 알림 영역은 항상 두고 문구만 바꾼다
  const live = $('#live'); live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 60);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 4500);
}

// 처리 중에는 버튼 폭을 유지하고 중복 실행을 막는다 (디자인 기준 '로딩 중 버튼 폭 유지')
async function busy(btn, label, work) {
  const old = btn.innerHTML;
  btn.style.minWidth = `${btn.offsetWidth}px`;
  btn.disabled = true; btn.textContent = label; btn.setAttribute('aria-busy', 'true');
  try { return await work(); } finally {
    if (btn.isConnected) { btn.disabled = false; btn.innerHTML = old; btn.removeAttribute('aria-busy'); btn.style.minWidth = ''; }
  }
}

// 화면을 떠날 때 정리할 타이머 (재발송 대기 시간 표시 등)
const pageTimers = new Set();
function pageInterval(fn, ms) { const id = setInterval(fn, ms); pageTimers.add(id); return id; }
function clearPageTimers() { pageTimers.forEach((id) => clearInterval(id)); pageTimers.clear(); }

// ---------- 첨부 파일 열기 ----------
// data-file 링크(Storage 경로)를 10분 동안 쓸 수 있는 주소로 바꾼다. 볼 권한이 없으면 서버가 거절하고 이름만 남긴다
function hydrateFiles(root) {
  $$('a[data-file]', root).forEach(async (a) => {
    let url = null;
    try { const { data } = await SB.storage.from('files').createSignedUrl(a.dataset.file, 600); url = data && data.signedUrl; } catch { /* 아래에서 이름만 남긴다 */ }
    if (!a.isConnected) return;
    if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.removeAttribute('aria-disabled'); }
    else { const span = document.createElement('span'); span.textContent = `${a.dataset.name} (파일을 열 수 없어요)`; a.replaceWith(span); }
  });
}

// ---------- SHA-256 (비밀번호·확인 토큰을 원문 대신 검증값으로 보관) ----------
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
function sha256Hex(str) {
  const msg = new TextEncoder().encode(str);
  const total = Math.ceil((msg.length + 9) / 64) * 64;
  const buf = new Uint8Array(total);
  buf.set(msg); buf[msg.length] = 0x80;
  const dv = new DataView(buf.buffer);
  const bits = msg.length * 8;
  dv.setUint32(total - 8, Math.floor(bits / 0x100000000));
  dv.setUint32(total - 4, bits >>> 0);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const W = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < total; i += 64) {
    for (let t = 0; t < 16; t++) W[t] = dv.getUint32(i + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let t = 0; t < 64; t++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + SHA256_K[t] + W[t]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  return [...H].map((x) => x.toString(16).padStart(8, '0')).join('');
}
const randomHex = (bytes) => [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
