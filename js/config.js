/* LabKnock · 서버 주소
 * 내 컴퓨터(127.0.0.1·localhost)에서 열면 로컬 Supabase(npx supabase start)에, 그 밖에는 배포용 Supabase 프로젝트에 연결한다.
 * anonKey(publishable key)는 브라우저에 공개되는 키다. 데이터 보호는 서버 함수와 권한 규칙이 맡는다. 비밀 키(secret/service_role)는 여기에 넣지 않는다. */
'use strict';
const LK_LOCAL = ['127.0.0.1', 'localhost'].includes(location.hostname);
const LK_CONFIG = LK_LOCAL
  ? { url: 'http://127.0.0.1:54321', anonKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH', site: `${location.origin}${location.pathname.replace(/index\.html$/, '')}` }
  : { url: 'https://kfyencsyzjrfwcvsjumh.supabase.co', anonKey: 'sb_publishable_4IZsZ2LvnOu62ImOwd5NvQ_pYun_4qV', site: 'https://gardenpark03.github.io/labknock-demo/' };
