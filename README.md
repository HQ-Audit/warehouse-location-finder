# Warehouse Location Finder

매장 코드와 로케이션 번호로 창고의 인지 그리드 위치를 조회하는 모바일 우선 정적 웹앱입니다.

## 데이터 배포

Warehouse Location Grid Mapper에서 `출력 → 모바일 웹 데이터 + 빌드`를 선택하고 이 저장소 폴더를 지정합니다. 프로그램은 `public/webdata/<매장코드>/webdata.bin`을 갱신하고 웹 빌드를 실행합니다.

`webdata.bin`은 gzip으로 압축된 최소 데이터이며 인증이나 암호화를 대신하지 않습니다. 매장명, 원본 도면, 등록자 정보는 포함하지 않습니다.

## 로컬 실행

```powershell
npm install
npm run dev
```
