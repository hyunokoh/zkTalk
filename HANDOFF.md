# zkTalk (모임톡) — 프로젝트 인수인계 문서

## 프로젝트 개요

커뮤니티 메신저 (Discord + Zulip + 카카오톡 영감). 한글명 "모임톡", 영문명 "zkTalk".

### 기술 스택
- **Monorepo**: Turborepo + pnpm workspaces
- **API**: Fastify 5 + Drizzle ORM + PostgreSQL 16 + Redis 7 + MinIO S3
- **Web**: Next.js 15 (App Router) + Tailwind CSS 4 + Zustand + TanStack Query
- **Mobile**: React Native (Expo SDK 55) + React Navigation
- **Desktop**: Electron (웹앱 래핑)
- **MCP Server**: `apps/mcp/` — 외부 AI 에이전트용 API
- **Voice/Video**: LiveKit (Docker)
- **E2EE**: ECDH P-256 + AES-GCM-256

### 디렉토리 구조
```
apps/
  api/          — Fastify REST API (port 4000)
  web/          — Next.js 웹앱 (port 3000)
  mobile/       — Expo React Native 앱
  desktop/      — Electron 데스크톱 앱
  mcp/          — MCP 서버 (외부 AI 에이전트용)
packages/
  shared/       — Zod 스키마, TypeScript 타입, 상수
  typescript-config/
  eslint-config/
docker/         — Docker Compose (postgres, redis, minio, livekit)
```

---

## 완료된 기능

### API (53+ 엔드포인트)
- ✅ 인증: SMS OTP, Magic Link, Google/Apple OAuth, QR 코드 로그인, Bearer 토큰
- ✅ 커뮤니티: CRUD, 초대 링크, 멤버 관리, 온보딩
- ✅ 채널: chat/forum/announcement, 카테고리
- ✅ 메시지: CRUD, 마크다운, 스레드, 인라인 답장, 전달
- ✅ DM: 1:1, 그룹, 읽음 확인(숫자), E2EE
- ✅ 리액션, 고정 메시지, 북마크
- ✅ 파일 첨부: S3 presign 업로드 + P2P WebRTC 전송
- ✅ 음성/화상: LiveKit 토큰 발급, 참여자 추적, 통화 기록
- ✅ 검색, @멘션, 투표, 이벤트/RSVP
- ✅ 역할/권한 11종, AutoMod, 신고, 감사로그
- ✅ 친구 시스템, 주소록 기반 추천
- ✅ 봇/웹훅 플랫폼
- ✅ AI 채널 요약
- ✅ 예약 메시지, 자동 삭제 메시지, 리마인더

### Web (완전 동작)
- ✅ 전체 한글화 (한/영 i18n)
- ✅ 다크/라이트 테마
- ✅ 모바일 반응형
- ✅ 메시지 CRUD, 리액션, 고정, 북마크
- ✅ 음성/화상 통화 (LiveKit)
- ✅ DM, 스레드, 포럼
- ✅ 파일 첨부, 이미지 미리보기
- ✅ 커스텀 이모지, GIF 검색
- ✅ 실시간 WebSocket

### Desktop (핵심 흐름 검증 완료)
- ✅ Electron 앱 (웹앱 래핑)
- ✅ 로그인, 채널, DM, 이벤트, 친구, voice, 운영 화면 실제 검증
- ✅ OAuth 팝업 처리
- ✅ 에러 페이지 (서버 미실행 시)

### Mobile (핵심 흐름 검증 완료)
- ✅ 인증, 채널/DM, 이벤트, 친구, 첨부, 투표, 포럼, 운영 화면 실제 검증
- ✅ 전체 한글화 (한/영 i18n, 디바이스 언어 감지)
- ✅ SMS OTP + Google/Apple 로그인 화면
- ✅ 커뮤니티 목록/진입
- ✅ 채널 목록 표시 (uncategorized + categories flatten)
- ✅ 채널 진입, 메시지 표시 (래핑 구조 flatten)
- ✅ 메시지 날짜 정상 (Invalid Date 수정됨)
- ✅ 내/남 메시지 구분 (좌/우)
- ✅ SVG 로고 (zktalk-mark.svg → React Native SVG 컴포넌트)
- ✅ 앱 이름: 한글 "모임톡", 영문 "zkTalk"
- ✅ 설정 화면: 언어 변경, 로그아웃
- ✅ Metro 설정: pnpm monorepo 호환 (metro.config.js, 커스텀 entry point)
- ✅ Expo SDK 55 + Expo Go 호환

---

## 2026-03-25 검증 스냅샷

아래 내용은 위의 초기 인수인계 메모보다 최신이며, 최근 실제 데스크톱/모바일/서버 교차 검증 결과를 반영합니다.

### 현재 실제 검증 완료 범위

#### 데스크톱
- ✅ 전화번호 로그인, QR 로그인
- ✅ 채널 메시지 송신/수신, DM 생성/송신/수신
- ✅ 스레드, inbox mention, bookmark
- ✅ 친구 요청 수락 후 바로 DM 열기
- ✅ 이벤트 생성, RSVP 반영, 참석자 목록, 참석자 DM 열기
- ✅ voice 채널 생성, join/leave, 다중 참가자 수 갱신
- ✅ 커뮤니티 설정 일반 저장
- ✅ 공개 범위 저장
  - `public`: discover 노출 + direct join 가능
  - `invite_only`: discover 비노출 + direct join 차단 + invite join 허용
  - `private`: discover 비노출 + direct join 차단 + invite join 허용
- ✅ 초대 링크 생성과 실제 외부 가입
- ✅ owner 전용 커뮤니티 삭제
- ✅ 운영 화면
  - 신고 `Resolve`
  - 신고 `Dismiss`
  - 감사 로그
  - 멤버 `mute`
  - 멤버 `kick`
  - 멤버 `ban`
  - 역할 변경 `moderator` / `admin`
  - 권한 경계 확인

#### 모바일
- ✅ 로그인, 로그아웃, 로그인 화면 복귀
- ✅ 채널/DM 양방향 송수신
- ✅ 친구 요청/수락
- ✅ 이벤트 생성/수정/RSVP/참석자 DM
- ✅ 첨부 업로드
- ✅ 투표 생성/투표/취소
- ✅ 포럼 목록/글 생성/답글
- ✅ 수신함, 북마크
- ✅ 채널/카테고리/멤버 관리
- ✅ 백업 export/import
- ✅ voice join/leave
- ✅ 운영 화면(신고/감사 로그/온보딩)
- ✅ 초대 참여
- ✅ 프로필 편집
- ✅ 계정 연결/해제
- ✅ 프로필 QR / 데스크톱 QR 로그인 confirm
- ✅ 커뮤니티 생성
- ✅ Discover 참여
- ✅ 한글 slug UX 확인
  - 입력 원문 유지
  - 이름 입력 중 자동 슬러그/안내 실시간 반영
  - 슬러그를 비우면 자동 모드로 복귀
  - 안내 문구 표시
  - 저장될 링크 preview 표시
  - 이름/최종 slug가 준비될 때까지 생성 버튼 선제 비활성화
  - slug 입력칸 / 생성 버튼 접근성 hint와 disabled state 정리
  - 이름/설명 입력은 `onChangeText`, slug help/preview는 polite live region으로 정리
  - simulator preview/create 결과에 `slugInput` / `slug` / `slugFeedback` / `isWarning` / `canSubmit` 포함

#### 서버/권한
- ✅ 멀티유저 메시징 회귀 스크립트 통과
  - 채널
  - DM / 그룹 DM
  - 스레드
  - 리액션
  - 멘션 inbox
  - 포럼
  - forward
- ✅ moderator 권한
  - 신고 조회/처리 가능
  - 감사 로그 접근 불가
- ✅ admin 권한
  - 신고 조회/처리 가능
  - 감사 로그 접근 가능
  - owner 전용 커뮤니티 삭제는 불가

### 최근 실제 수정으로 닫힌 대표 버그

- 데스크톱 voice 채널 UI 공백 및 참가자 수 갱신 문제
- 데스크톱 이벤트 참석자 DM row shape 버그
- 데스크톱 친구 목록의 바로 DM 열기 부재
- 데스크톱 신고/운영/멤버 액션 교차 흐름 검증
- 모바일 DM 목록 hook-order 크래시
- 모바일 friends/inbox/bookmarks/poll 화면의 hook-order/표시 크래시
- 모바일 시뮬레이터 API host 계산 문제
- 모바일 voice 채널 생성 공백
- 모바일 한글 slug 입력 시 입력값이 사라져 보이고 저장 결과가 불명확하던 UX 문제

### 아직 남은 큰 항목

- mac 코드서명 / notarization
- Windows 코드서명
- 시뮬레이터 전용 자동 검증 훅 정리 여부 결정
- 비핵심 lint/경고 정리
- 데스크톱 signing blocker 리포트는 이제 최신 `release-status`를 매번 다시 읽고 `signing.env` 존재/로드 상태도 같이 보여줍니다

### 문서 주의

아래의 "미완료 / 버그 있는 기능 (모바일 앱)" 섹션은 초기 조사 메모가 섞여 있어 최신 상태와 일부 다를 수 있습니다. 현재 상태 판단은 이 "2026-03-25 검증 스냅샷"을 우선 기준으로 보는 것이 정확합니다.

추가 상세 매트릭스는 [docs/test-matrix-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/test-matrix-2026-03-25.md)에 정리되어 있습니다.
릴리스 직전 체크용 문서는 [docs/release-readiness-checklist-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md)에 정리되어 있습니다.
현재 blocker만 빠르게 보려면 [docs/current-blockers-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md)를 참고하면 됩니다.
고정 경로의 최신 상태 요약은 [docs/CURRENT_STATUS.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/CURRENT_STATUS.md)에 정리되어 있습니다.
문서 전체 인덱스는 [docs/README.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md)에 정리되어 있습니다.
저장소 루트 진입점은 [README.md](/Users/hyunokoh/Documents/Projects/zkTalk/README.md)입니다.

---

## 미완료 / 버그 있는 기능 (모바일 앱)

이 섹션은 최신 기준으로 다시 정리되었습니다.

### 현재 남은 실제 모바일 리스크

#### 1. 실제 iPhone 기기에서 한글 IME 최종 재검증 필요
- 시뮬레이터 기준으로는 대부분의 메시징/작성 흐름을 검증했지만, 한글 IME 조합 입력은 실제 기기에서 한 번 더 보는 것이 안전합니다.
- 다만 커뮤니티 생성의 slug UX는 실제로 화면에서 검증되었고, QA용 `name/slug/help/preview/submit` testID도 붙어 있습니다.
- 실행 체크리스트: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-checklist-2026-03-26.md`
- 결과 기록 템플릿: `/Users/hyunokoh/Documents/Projects/zkTalk/docs/mobile-korean-ime-report-template-2026-03-26.md`
  - 한글 입력값 유지
  - 안내 문구 표시
  - 저장될 링크 preview 표시

#### 2. 시뮬레이터 전용 자동 검증 훅 release 정책 결정 필요
- 이번 검증 라운드에서는 빠른 회귀를 위해 mobile 앱에 시뮬레이터 전용 dev route / auto action을 다수 추가했습니다.
- 현재는 screen-level의 산발적인 직접 체크는 대부분 공통 harness gate로 정리된 상태입니다.
- 현재 harness는 시뮬레이터 dev 빌드에선 기본 활성이고, non-dev/release 빌드에선 `EXPO_PUBLIC_ENABLE_SIMULATOR_HARNESS=true`를 주지 않으면 기본 비활성입니다.
- 남아 있는 접점은 주로 공통 helper, App bootstrap의 `dev-session-token` / `dev-route.json`, 그리고 결과/에러 파일 쪽입니다. 핵심 bootstrap/login/settings/home의 JSON read/write, route marker cleanup, simulator 생성 중복 방지 marker claim은 이미 공통 helper로 모였습니다.
- 릴리스 전에는 이 중앙 harness를 유지할지, 별도 테스트 빌드 전용으로 옮길지, 혹은 release branch에서만 더 강하게 제한할지 결정이 필요합니다.

#### 3. 비핵심 경고 및 정리 작업
- 현재 기능을 막는 크리티컬 버그보다, 남아 있는 경고/정리 작업 쪽 비중이 큽니다.
- 모바일 단일 기능 미구현보다는 테스트 하네스 정리와 코드 정돈이 다음 작업에 가깝습니다.

#### 4. 서명 자격 정보만 들어오면 바로 실행할 경로
- desktop signing runbook: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/RELEASE.md`
- live blocker report: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/signing-blockers.md`
- live blocker json: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/signing-blockers.json`
- desktop snapshot json: `/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/dist/release-next.json`
- one-shot next command: `cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop && npm run release:next`
- repo-level next command: `cd /Users/hyunokoh/Documents/Projects/zkTalk && npm run release:next`

---

## 실행 방법

### Docker 서비스 시작
```bash
docker compose -f docker/docker-compose.yml up -d
```

### 개발 서버
```bash
pnpm install
pnpm turbo dev              # API(4000) + Web(3000) 동시 시작
```

### 모바일 앱
```bash
cd apps/mobile
REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start --port 8090 --clear
# iOS 시뮬레이터에서: exp://127.0.0.1:8090
```

### 데스크톱 앱
```bash
cd apps/desktop
npx electron .
```

### 테스트
```bash
pnpm turbo test        # 전체 테스트
pnpm turbo typecheck   # 타입 체크
```

---

## 주요 API 응답 구조 (모바일에서 주의)

### 채널 목록
```
GET /api/communities/:id/channels
→ { uncategorized: Channel[], categories: [{ channels: Channel[] }] }
# 앱에서 flatten 필요!
```

### 메시지 목록
```
GET /api/channels/:id/messages
→ { messages: [{ message: {...}, author: {...} }], hasMore, unreadCounts }
# 각 항목이 { message, author }로 래핑됨. flatten 필요!
```

### 채널 생성
```
POST /api/communities/:id/channels
→ Channel (직접 반환, 래핑 없음)
```

### SMS OTP (dev 모드)
```
POST /api/auth/phone/request { phoneNumber: "+821012345678" }
→ { sent: true, code: "123456" }  # dev 모드에서 code 반환
```

---

## 파일 위치 참조

### 모바일 핵심 파일
- `apps/mobile/src/screens/ChannelScreen.tsx` — 채널 메시지 화면
- `apps/mobile/src/screens/HomeScreen.tsx` — 커뮤니티/채널 목록
- `apps/mobile/src/screens/CreateChannelScreen.tsx` — 채널 생성
- `apps/mobile/src/screens/CreateCommunityScreen.tsx` — 커뮤니티 생성
- `apps/mobile/src/screens/LoginScreen.tsx` — 로그인
- `apps/mobile/src/screens/SettingsScreen.tsx` — 설정
- `apps/mobile/src/components/MessageComposer.tsx` — 메시지 입력 (React.memo)
- `apps/mobile/src/components/MessageActionSheet.tsx` — 메시지 액션 시트
- `apps/mobile/src/components/MessageBubble.tsx` — 메시지 버블
- `apps/mobile/src/components/Logo.tsx` — SVG 로고
- `apps/mobile/src/lib/api.ts` — API 클라이언트
- `apps/mobile/src/lib/i18n/` — 한/영 번역
- `apps/mobile/src/lib/file-picker.ts` — 파일 선택/업로드
- `apps/mobile/src/lib/crypto.ts` — E2EE
- `apps/mobile/src/navigation/` — React Navigation 설정
- `apps/mobile/metro.config.js` — Metro 설정 (pnpm monorepo)
- `apps/mobile/index.js` — 커스텀 entry point (pnpm 경로 문제 회피)

### 웹 핵심 파일
- `apps/web/src/lib/api.ts` — API 클라이언트 (Content-Type 조건부 설정)
- `apps/web/src/lib/i18n/` — 한/영 번역
- `apps/web/src/app/(app)/communities/[slug]/channels/[channelId]/` — 채널 페이지

### API 핵심 파일
- `apps/api/src/modules/` — 모듈별 routes/service/repository/schema
- `apps/api/src/modules/auth/` — 인증 (phone, oauth, magic link)
- `apps/api/src/modules/voice/` — 음성/화상
- `apps/api/src/middleware/auth.ts` — Bearer 토큰 인증

---

## 향후 작업 (MLP)

### 필수
1. mac 코드서명 / notarization
2. Windows 코드서명
3. 시뮬레이터 전용 검증 훅 정리 여부 결정
4. 실제 iPhone 기기에서 한글 입력/IME 최종 확인
5. 전체 회귀 결과를 릴리스 체크리스트에 반영

### 개선
6. 비핵심 lint / warning 정리
7. 테스트 하네스와 실사용 코드 경계 정리
8. 푸시 알림 (FCM/APNs)
9. 실제 SMS 발송 (Twilio/NHN Cloud)
10. 프로덕션 배포 (Docker + HTTPS + 도메인)

### 장기
11. 네이티브 앱 앱스토어 배포
12. zk-voting 연동
13. E2E 암호화 채널 확장
14. 서버 디스커버리
