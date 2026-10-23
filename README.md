# 청모 퀘스트

청첩장 모임 장소를 톡방별로 정하는 게임형 투표 페이지예요.
친구는 카톡 링크를 열어 **음주 여부 → 먹고 싶은 음식(여러 개) → 취향에 맞는 장소(하나)** 순서로 고르고,
주최자는 관리자 화면에서 결과를 보고 장소를 확정해요. 확정하면 같은 링크가 발표 화면으로 바뀌어요.

- 친구 화면: `https://내도메인/r/방코드` (로그인 없음, 닉네임만)
- 관리자 화면: `https://내도메인/admin` (비밀번호)

외부 npm 패키지 없이 동작해요. 화면은 `public/`, 서버 함수는 `api/`, DB는 Supabase를 써요.

---

## 배포하기 (약 15분)

### 1. Supabase 준비

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만들어요. 지역은 **Northeast Asia (Seoul)** 를 추천해요.
2. 왼쪽 메뉴 **SQL Editor**를 열고 `supabase/schema.sql` 내용을 통째로 붙여넣은 뒤 **Run**을 눌러요.
   테이블, 기본 음식 메뉴 6개, 사진 저장소(`photos`)가 만들어져요.
3. **Project Settings → API**에서 두 값을 복사해 둬요.
   - `Project URL` → `SUPABASE_URL`
   - `service_role` 키 → `SUPABASE_SERVICE_ROLE_KEY` (이 키는 서버에서만 쓰여요. 절대 공개하지 마세요)

### 2. Vercel 배포

1. [vercel.com](https://vercel.com)에서 **Add New → Project**로 이 GitHub 레포를 가져와요.
2. Framework Preset은 **Other** 그대로 두고, Build/Output 설정은 건드리지 않아요.
3. **Environment Variables**에 세 개를 넣어요.

   | 이름 | 값 |
   |---|---|
   | `SUPABASE_URL` | 1-3에서 복사한 Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | 1-3에서 복사한 service_role 키 |
   | `ADMIN_PASSWORD` | 관리자 화면 비밀번호 (원하는 걸로) |

4. **Deploy**를 누르면 끝이에요. 주소가 나오면 `/admin`으로 들어가 로그인해요.

> 환경변수를 바꾼 뒤에는 Vercel에서 **Redeploy**를 해야 반영돼요.

### 3. 쓰는 순서

1. 관리자 화면 → **초대장 제목**에서 주인공 이름과 문구를 골라요. (카톡 미리보기 제목으로도 쓰여요)
2. **+ 톡방**으로 방을 만들어요. 방마다 링크가 따로 생겨요.
3. **+ 장소 추가**에서 네이버 지도의 "공유 → 링크 복사" 주소를 붙여넣으면 가게 이름·사진을 자동으로 가져와요.
   음식 태그와 술 가능 여부를 골라 주세요. 이 정보로 친구 취향에 맞는 장소를 걸러줘요.
4. **카톡방 초대 메시지 복사** → 카톡방에 붙여넣기.
5. 결과를 보고 **이 장소로 확정** → 날짜·시간·한마디 입력 → **발표 메시지 복사** → 카톡방에 다시 공유.

**친구 화면 미리보기**로 열면 친구가 보는 화면을 그대로 볼 수 있고, 여기서 고른 건 저장되지 않아요.

---

## 내 컴퓨터에서 실행해 보기

Node.js 20 이상이면 설치할 것 없이 바로 돼요.

```bash
npm run dev
# → http://localhost:3000/admin  (비밀번호: cheongmo)
```

Supabase 값이 없으면 **메모리 모드**로 예시 데이터가 들어간 상태로 떠요. 서버를 끄면 데이터는 사라져요.
실제 DB로 테스트하려면 `.env.example`을 `.env.local`로 복사해 값을 채우세요.

---

## 구조

```
api/
  room.js        GET  /api/room?code=     친구 화면 데이터 + 집계
  vote.js        POST /api/vote            친구 선택 저장 (기기별 1표, 확정 후에는 닫힘)
  admin.js       GET/POST /api/admin       관리자 로그인·톡방·장소·메뉴·확정·사진·링크 정보 가져오기
  r.js           GET  /r/:code             방마다 카톡 미리보기(og 태그)를 채운 친구 화면 HTML
  _lib/          DB(Supabase REST / 메모리), 로그인 쿠키, 네이버 링크 정보 읽기, 도메인 로직
public/
  admin.html, admin.js   관리자 화면
  guest.js               친구 화면 (3스테이지 + 발표 화면)
  shared.js              공용 코드 (제목 문구, 픽셀 그림, 날짜 표기)
  style.css, og.png      스타일, 카톡 미리보기 이미지
supabase/schema.sql      DB 스키마
```

### 알아두면 좋은 점

- 친구는 브라우저별로 1표예요. 같은 폰이라도 카톡 인앱 브라우저와 사파리는 다른 사람으로 셀 수 있어요.
- 네이버 링크 자동 채우기는 네이버 페이지 구조에 기대고 있어서, 가끔 이름을 못 가져올 수 있어요. 그때는 직접 적으면 돼요.
- 친구 화면은 10초마다 최신 집계를 다시 불러와요.
