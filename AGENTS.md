# AI 작업 규칙

이 저장소는 랩노크 SRS v1.3을 시연하는 정적 웹 프로토타입이다(바닐라 JS, 빌드 없음). main 브랜치는 GitHub Pages 배포본이다. 사람용 안내와 화면별 코드 위치는 [CONTRIBUTING.md](CONTRIBUTING.md)에 있다.

- 사용자가 요청한 화면과 문제만 고친다. 관련 없는 코드의 정리·자동 포맷·이름 변경·파일 분리를 하지 않는다. 여러 사람이 `js/views.js`를 동시에 고친다.
- SRS v1.3에 없는 기능·업무 규칙을 더하지 않는다. 사이트에는 외부 라이브러리, CDN, 빌드 도구를 더하지 않는다. `index.html`을 파일로 바로 열어도(file://) 동작해야 한다. 시험 도구(Playwright)는 `package.json` 개발용 의존성과 `tests/`에만 둔다.
- 자동 시험은 `tests/tc-XX-YY-*.spec.js`에 SRS 확인 사례 ID별로 쓰고 `tests/helpers.js`를 재사용한다. 시험을 통과시키려고 기대값을 SRS와 다르게 바꾸지 않는다. 시험과 SRS가 어긋나면 사용자에게 알린다.
- 공통 도구는 `js/core.js`, 데이터·상태 규칙·권한은 `js/data.js`, 주소별 화면 연결·머리글·바닥글은 `js/main.js`, 화면은 `js/views.js`에 있다.
- 기존 토큰(`assets/tokens.css`)·컴포넌트(`assets/components.css`)·`app.css` 클래스를 재사용한다. 라이트 테마, Pretendard, 누르는 영역 44px 이상을 지킨다. 새 색·그림자·장식용 애니메이션을 만들지 않는다.
- 화면 문구는 한국어 해요체로 쓰고, 버튼은 결과가 보이는 동작 문구로 쓴다.
- 사용자 입력이나 저장된 값을 HTML에 넣을 때는 `esc()`로 감싼다.
- 저장 구조(`labknock-site-v1`)는 바꾸지 않는다. 꼭 필요하면 바꾸기 전에 사용자에게 알린다. `seed()`를 바꾸면 확인 전에 '데모 데이터 초기화'가 필요하다.
- 실제 개인정보·비밀번호·키를 넣지 않는다.
- main에 직접 커밋하거나 push하지 않는다. 브랜치에서 작업하고 PR을 연다.
- 끝나면 `npm test`와 CONTRIBUTING.md의 'PR 전 확인'을 수행하고, 바꾼 파일과 확인 결과를 요약한다.
