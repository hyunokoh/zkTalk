# zkTalk UI 네비게이션 재설계 계획

## 목표

Discord 색감 + KakaoTalk 아이콘 탭 형태의 네비게이션으로 전환.
상단 텍스트 pill 버튼을 제거하고, 홈/설정 페이지의 불필요한 요소 정리.

---

## 변경 파일 및 내용

### 1. `apps/web/src/app/(app)/layout.tsx`

**현재**
- 상단 바(`hidden md:flex`)에 텍스트 pill 버튼 6개 (홈/수신함/DMs/친구/찾기/설정)
- 좌측에 `zkTalk` 배지 + `t('app.desktopUtilityHint')` 힌트 텍스트
- 우측에 `DesktopProfileQuickActions compact` + 유저 아바타 링크

**목표**
- 상단 바 블록 전체 제거
- `topNavItems` 배지 count 데이터(inboxCount, dmCount, friendCount)를 `CommunityRail` props로 전달
- 레이아웃 구조는 그대로 유지 (CommunityRail + main)

---

### 2. `apps/web/src/components/CommunityRail/CommunityRail.tsx`

**현재**
- 커뮤니티 서버 아이콘 목록만 표시
- 상단: "새 커뮤니티" 버튼
- 배경: `bg-[#202225]`

**목표 구조**

```
[CommunityRail — bg-[#202225], w-[72px], flex-col]
  ─ 상단 고정: 아이콘 탭 5개 (카톡 탭바 스타일)
      홈(Communities), DM, 친구, 수신함, 탐색
  ─ 구분선 (border-[#36393f])
  ─ 커뮤니티 서버 아이콘 목록 (기존 유지, overflow-y-auto)
  ─ 구분선
  ─ 하단 고정: 설정 아이콘 + 유저 아바타
```

**아이콘 탭 각 항목 스펙**

```
- 크기: h-12 w-full flex-col 버튼
- 아이콘: SVG (24x24)
- 레이블: text-[9px] text-[#96989d] mt-0.5 (아이콘 아래)
- 활성 상태: 좌측 w-1 h-8 bg-white rounded-r-full 인디케이터 (absolute)
             아이콘 bg-indigo-500 rounded-[16px]
- 비활성 hover: 아이콘 bg-[#36393f] rounded-[16px] transition
- 배지: 우상단 absolute, bg-red-500 rounded-full text-[9px] min-w-[16px] h-4
```

**탭 목록 (href, 아이콘, 레이블, 활성 경로)**

| href | 아이콘 | 레이블 | 활성 경로 |
|------|--------|--------|-----------|
| `/home` | 홈(house SVG) | 홈 | `/home`, `/communities/` |
| `/dm` | 말풍선 SVG | 메시지 | `/dm` |
| `/friends` | 사람들 SVG | 친구 | `/friends` |
| `/inbox` | 벨 SVG | 수신함 | `/inbox` |
| `/discover` | 나침반 SVG | 탐색 | `/discover` |

**하단 고정 항목**
- 설정: gear SVG → `/settings`, 활성 경로 `/settings`
- 유저 아바타: `UserAvatar` 컴포넌트, `size="sm"`, `/settings#profile-edit` 링크

**Props 추가**

```typescript
interface CommunityRailProps {
  communities: Community[];
  // 추가
  inboxCount?: number;
  dmCount?: number;
  friendCount?: number; // pending 친구 요청 수
  currentUser?: User | null;
}
```

---

### 3. `apps/web/src/app/(app)/home/page.tsx`

**현재 문제**
- 2컬럼 그리드: 왼쪽 Quick Start 카드 + 오른쪽 QR 카드 (40% 차지)
- `DesktopProfileQuickActions` 별도 섹션 (nav에 이미 있음)
- 커뮤니티 목록 위에 중복 "새 커뮤니티 만들기" 버튼

**목표 구조**

```
[헤더] 내 커뮤니티                      [새로 만들기 버튼]
[검색바]
[커뮤니티 카드 목록 — 전체 너비]
  - 커뮤니티 없을 때: 빈 상태 안내 + "첫 커뮤니티 만들기" 버튼
```

**제거 항목**
- `ProfileQR` 컴포넌트 및 import
- `DesktopProfileQuickActions` 컴포넌트 및 import
- Quick Start 2컬럼 그리드 전체 (`mb-6 grid gap-4 lg:grid-cols-...`)
- 헤더의 유저 아바타 + sign out 버튼 (layout 수준에서 처리)

**유지 항목**
- 커뮤니티 검색 (`searchQuery` state)
- 커뮤니티 목록 렌더링 로직
- `filteredCommunities` 필터링 로직

---

### 4. `apps/web/src/app/(app)/settings/page.tsx`

**현재 문제**
- 상단에 `settings.title` 라벨(`text-xs uppercase`) + `settings.overviewTitle` 제목이 중복
- 메인 카드(`rounded-3xl`) 안에 또 카드(`rounded-3xl bg-gray-950/70`) 중첩
- 우측 QR 섹션에도 동일한 중첩 구조

**목표 구조**

```
[프로필 섹션]
  - 유저 아바타 (lg) + 이름 + @username + bio
  - "프로필 편집" 버튼
[설정 카드 3개 — 1행 3열]
  - 개인정보 & 보안
  - 데이터 백업
  - 친구 관리
[프로필 공유 섹션]
  - ProfileQR (compact)
  - 공유 버튼들
```

**제거 항목**
- `text-xs font-semibold uppercase tracking-[0.18em] text-gray-500` 라벨들
- 외부 `rounded-3xl` 래퍼 카드 → 직접 콘텐츠 렌더링
- 중첩 `bg-gray-950/70 rounded-3xl` 카드 → `border-b border-gray-800` 구분선으로 대체

---

## 구현 순서

| 순서 | 파일 | 의존성 |
|------|------|--------|
| 1 | `CommunityRail.tsx` props 타입 + 아이콘 탭 추가 | 없음 |
| 2 | `layout.tsx` 상단 바 제거 + count props 전달 | CommunityRail 완료 후 |
| 3 | `home/page.tsx` QR/QuickActions 제거 | 없음 |
| 4 | `settings/page.tsx` 텍스트 정리 | 없음 |

---

## 검증

- `pnpm turbo typecheck` 전체 통과
- `/home` → 커뮤니티 목록만 깔끔하게 표시, QR 없음
- CommunityRail 상단 아이콘 탭 → 경로에 따라 활성 인디케이터 표시
- DM/inbox/friends 배지 → 미읽음 있을 때 빨간 숫자 표시
- `/settings` → QR은 settings에만 있음, 중복 텍스트 없음
- 모바일: 기존 hamburger 동작 유지
