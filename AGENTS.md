# AI 작업 규칙

이 저장소는 랩노크 SRS v1.3을 실제로 동작하게 만든 시연용 웹 서비스다. 화면은 정적 사이트(바닐라 JS, 빌드 없음), 서버는 Supabase(Postgres·인증·Storage)다. main 브랜치는 GitHub Pages 배포본이다. 사람용 안내와 화면별 코드 위치는 [CONTRIBUTING.md](CONTRIBUTING.md)에 있다.

- 사용자가 요청한 화면과 문제만 고친다. 관련 없는 코드의 정리·자동 포맷·이름 변경·파일 분리를 하지 않는다. 여러 사람이 `js/views.js`를 동시에 고친다.
- SRS v1.3에 없는 기능·업무 규칙을 더하지 않는다. 사이트에는 외부 라이브러리, CDN, 빌드 도구를 더하지 않는다(Supabase 클라이언트는 `assets/vendor/`의 고정 파일). 시험 도구(Playwright)는 `package.json` 개발용 의존성과 `tests/`에만 둔다.
- 데이터 저장은 `api.*`(서버 함수 RPC)로만 한다. 테이블은 RLS로 직접 접근을 막았으니 권한을 풀지 말고, 새 규칙은 새 마이그레이션의 security definer 함수로 만든다. 기존 마이그레이션 파일은 고치지 않는다.
- 작업과 시험은 로컬 Supabase(`npx supabase@2.122.1 start`)로 한다. 배포 프로젝트에 직접 접속하거나 비밀 키·DB 비밀번호를 코드에 넣지 않는다.
- 자동 시험은 `tests/tc-XX-YY-*.spec.js`에 SRS 확인 사례 ID별로 쓰고 `tests/helpers.js`를 재사용한다. 시험을 통과시키려고 기대값을 SRS와 다르게 바꾸지 않는다. 시험과 SRS가 어긋나면 사용자에게 알린다.
- 공통 도구는 `js/core.js`, 서버 데이터·요청·상태 표시 규칙은 `js/data.js`, 주소별 화면 연결·머리글·바닥글은 `js/main.js`, 화면은 `js/views.js`, 서버 규칙은 `supabase/migrations/`에 있다.
- 화면 스타일은 공통 토큰(`assets/tokens.css`)·컴포넌트(`assets/components.css`)·`app.css` 위에 브랜드 레이어(`assets/brand.css`)를 얹는다. 색·그림자·그라데이션·움직임은 `brand.css`의 변수와 클래스(`lab-avatar`, `data-reveal`, `spot` 등)를 재사용하고 새로 흩뿌리지 않는다. 움직임은 `prefers-reduced-motion`에서 꺼지게 하고, Pretendard와 누르는 영역 44px 이상을 지킨다 (사용자 결정 DEC-24: 실제 서비스 수준의 디자인).
- 화면 문구는 한국어 해요체로 쓰고, 버튼은 결과가 보이는 동작 문구로 쓴다.
- 사용자 입력이나 저장된 값을 HTML에 넣을 때는 `esc()`로 감싼다.
- DB 구조(테이블·열)를 바꿔야 하면 바꾸기 전에 사용자에게 알린다. 시연 데이터는 `seed_demo_data()`에 있다(최신 정의는 `20261122000000_real_labs_demo_data.sql`). 연구실 이름·담당 교수·연구 분야는 소프트웨어융합대학 홈페이지 공개 자료를 참고한 실제 정보이고, 모집 공고·지원서·인증 요청·계정은 시연용 가상 데이터다.
- 실제 개인정보·비밀번호·키를 넣지 않는다.
- main에 직접 커밋하거나 push하지 않는다. 브랜치에서 작업하고 PR을 연다.
- 끝나면 `npm test`와 CONTRIBUTING.md의 'PR 전 확인'을 수행하고, 바꾼 파일과 확인 결과를 요약한다.
