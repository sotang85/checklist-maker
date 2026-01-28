# Procurement Vendor Checklist Maker (Apps Script MVP)

## 개요
회사 분석 PDF를 업로드하거나 Drive 파일 ID/링크를 입력하면, 구매거래처 체크리스트를 자동 생성하고 Google Sheets 링크를 반환하는 Apps Script Web App입니다.

## 폴더 구조 (clasp-compatible)
```
.
├── appsscript.json
├── Index.html
├── WebApp.gs
├── DriveService.gs
├── Parser.gs
├── Rules.gs
├── SheetWriter.gs
├── LoggerService.gs
├── Settings.gs
└── Tests.gs
```

## Setup
1. **Apps Script 프로젝트 생성 및 파일 업로드**
   - `clasp` 사용 시 `clasp create` 후 위 파일을 업로드합니다.
2. **Drive API / Advanced Drive Service 활성화**
   - Apps Script 편집기 > 서비스 > 고급 Google 서비스 > Drive API 활성화
   - GCP 프로젝트에서도 Drive API 활성화
3. **Script Properties 설정**
   - `TEMPLATE_ID`: 체크리스트 템플릿 스프레드시트 ID
   - `OUTPUT_FOLDER_ID`: 결과 시트를 저장할 Shared Drive 폴더 ID
   - `UPLOAD_FOLDER_ID`: 업로드 PDF 보관 폴더 ID
   - `LOG_SHEET_ID`: 로그 시트 ID (`MasterLog` 시트 포함)
   - `ALLOWED_DOMAIN`: 허용 도메인 (예: `example.com`)
4. **템플릿 시트 구성**
   - 시트 이름: `거래처 기본 정보`, `구매거래처 선정 체크리스트`, `평가표`, `CONFIG`
   - CONFIG 시트에 매핑 정의 (아래 예시 참고)
5. **웹 앱 배포**
   - 실행 사용자: 소유자
   - 접근 권한: 도메인 사용자만

## 사용 방법
1. 웹 앱 URL 접속
2. PDF 업로드 또는 Drive 링크/ID 입력
3. (선택) 담당부서/담당자/거래시작 예정일 입력
4. `체크리스트 생성` 클릭
5. 결과 링크 확인

## CONFIG 시트 스키마
| target_sheet | search_text | write_mode | fixed_cell | value_key | formatting |
|---|---|---|---|---|---|

- `write_mode`: `RIGHT_CELL` 또는 `FIXED_CELL`
- `value_key`: `data.*`, `answers.*`, `metadata.*` 형태로 입력
- `formatting`: `AUTO`, `GREEN`, `YELLOW`

### 예시 행
```
거래처 기본 정보,회사명,RIGHT_CELL,,data.company_name,AUTO
거래처 기본 정보,사업자등록번호,RIGHT_CELL,,data.biz_no,AUTO
거래처 기본 정보,담당부서,RIGHT_CELL,,metadata.dept,AUTO
구매거래처 선정 체크리스트,휴업 또는 폐업 중인 회사인가?,RIGHT_CELL,,answers.closed_status_answer,GREEN
구매거래처 선정 체크리스트,증빙,RIGHT_CELL,,answers.closed_status_evidence,AUTO
구매거래처 선정 체크리스트,추가 확인,RIGHT_CELL,,answers.closed_status_next_action,YELLOW
구매거래처 선정 체크리스트,신용도판단정보 이력?,RIGHT_CELL,,answers.credit_event_answer,GREEN
구매거래처 선정 체크리스트,증빙,RIGHT_CELL,,answers.credit_event_evidence,AUTO
구매거래처 선정 체크리스트,추가 확인,RIGHT_CELL,,answers.credit_event_next_action,YELLOW
구매거래처 선정 체크리스트,소송/제재 여부,RIGHT_CELL,,answers.litigation_answer,YELLOW
구매거래처 선정 체크리스트,확인 경로,RIGHT_CELL,,answers.litigation_next_action,AUTO
```

## 실패 처리
- PDF 변환 실패 시에도 빈 체크리스트를 생성하고 모든 항목을 `NEEDS_VERIFICATION`으로 채웁니다.
- 추출 실패 경고는 UI에 표시되며 로그에 기록됩니다.

## 테스트
Apps Script 편집기에서 `TestHarness.runParserTests()` 실행.

## UX 마이크로카피 (Korean)
- 버튼: `체크리스트 생성`
- 경고: `PDF 변환/텍스트 추출 실패로 기본값을 사용했습니다.`
- 완료: `Done: 체크리스트 열기`
