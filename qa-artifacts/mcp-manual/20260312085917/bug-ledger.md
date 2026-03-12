# CampusWay MCP QA Bug Ledger

## CW-BUG-001
- Module: Student Dashboard
- Role: Student
- Route/Page: `/dashboard`, `/profile`
- Severity: High
- Steps to reproduce:
  1. Log in as the seeded student `e2e_student_desktop@campusway.local`.
  2. Open `/dashboard`.
  3. Note the profile chip and gating copy in the welcome header and smart progress sections.
  4. Open `/profile`.
- Expected result: Both pages should use the same profile completion score and the same eligibility state.
- Actual result: The dashboard showed `60%` and blocked exam access messaging, while the profile page showed `100%`.
- Screenshot/evidence: Playwright snapshots captured during the isolated run showed `/dashboard` at `60%` and `/profile` at `100%` before the fix.
- Root cause: [`studentDashboardService.ts`](f:\CampusWay\backend\src\services\studentDashboardService.ts) recomputed the dashboard header score from weighted fields, while other student flows used the persisted `profile_completion_percentage`.
- Fixed?: Yes
- Retested?: Yes
- Fix summary: [`studentDashboardService.ts`](f:\CampusWay\backend\src\services\studentDashboardService.ts) now uses the persisted `profile.profile_completion_percentage` for the dashboard header, aligning it with the profile page and exam-card eligibility logic.

## CW-BUG-002
- Module: Student Exams
- Role: Student
- Route/Page: `/dashboard`, `/exams/:examId/start`, `/exam/:examId`
- Severity: Critical
- Steps to reproduce:
  1. Log in as the seeded student `e2e_student_desktop@campusway.local`.
  2. Open `/dashboard`.
  3. In the exam card, click the primary start CTA for a live exam.
- Expected result: The CTA should open the live exam runner for the selected exam.
- Actual result: The CTA routed students to `/exams/:examId/start`, which was not mounted in the SPA, so the flow broke before the exam could start.
- Screenshot/evidence: Playwright reproduced the broken navigation before the fix and later verified the same CTA now opens [`/exam/69b280eb570edabf1d83cbab`](f:\CampusWay\frontend\src\components\student\dashboard\MyExamsSection.tsx).
- Root cause: The dashboard component still emitted a stale legacy route while the app only exposed the canonical `/exam/:examId` page.
- Fixed?: Yes
- Retested?: Yes
- Fix summary: [`MyExamsSection.tsx`](f:\CampusWay\frontend\src\components\student\dashboard\MyExamsSection.tsx) now links to `/exam/:examId`, and [`App.tsx`](f:\CampusWay\frontend\src\App.tsx) adds a compatibility redirect from `/exams/:examId/start` to `/exam/:examId`.

## CW-BUG-003
- Module: Student Exams
- Role: Student
- Route/Page: `/api/exams/:examId/sessions/start`
- Severity: Critical
- Steps to reproduce:
  1. Log in as the seeded student.
  2. Open a live exam detail page.
  3. Click `Start Exam`.
- Expected result: The API should start a session for the authenticated student and keep the student signed in.
- Actual result: The start request initially failed through an obsolete auth stack and could force the flow into an unauthorized state instead of starting the exam.
- Screenshot/evidence: Backend logs during the isolated run showed the modern exam routes were wired to the obsolete `middleware/auth` path, which did not match the app's cookie/JWT auth contract.
- Root cause: [`adminExamRoutes.ts`](f:\CampusWay\backend\src\routes\exams\adminExamRoutes.ts) and the session route stack were importing the deprecated auth middleware from `backend/src/middleware/auth.ts` instead of the canonical `backend/src/middlewares/auth.ts`.
- Fixed?: Yes
- Retested?: Yes
- Fix summary: [`adminExamRoutes.ts`](f:\CampusWay\backend\src\routes\exams\adminExamRoutes.ts) now imports the canonical auth middleware. After the route stack was aligned, Playwright confirmed `POST /api/exams/69b280eb570edabf1d83cbab/sessions/start` returns `200`.

## CW-BUG-004
- Module: Student Exams
- Role: Student
- Route/Page: `/api/exams/:examId/sessions/:sessionId/questions`, `/api/exams/:examId/sessions/:sessionId/answers`, `/api/exams/:examId/sessions/:sessionId/submit`
- Severity: Critical
- Steps to reproduce:
  1. Log in as the seeded student.
  2. Open a live exam detail page and click `Start Exam`.
  3. Let the runner request questions, save an answer, or submit the attempt.
- Expected result: The modern session endpoints should resolve the current attempt and return questions/save/submit responses.
- Actual result: The questions call returned `500`, with the backend logging `CastError: Cast to ObjectId failed for value ""` because the attempt id reaching the controller was empty.
- Screenshot/evidence: [`backend-live-restart2.err.log`](f:\CampusWay\qa-artifacts\mcp-manual\20260312085917\backend-live-restart2.err.log) captured the `getExamAttemptState` cast error; after the fix, [`backend-live-restart3.log`](f:\CampusWay\qa-artifacts\mcp-manual\20260312085917\backend-live-restart3.log) shows `questions`, `answers`, and `submit` all returning `200`.
- Root cause: The modern `:sessionId` routes were adapted onto canonical controller handlers that expect `req.params.attemptId`, but [`studentExamRoutes.ts`](f:\CampusWay\backend\src\routes\exams\studentExamRoutes.ts) only copied `examId` and never mapped `sessionId` to `attemptId`.
- Fixed?: Yes
- Retested?: Yes
- Fix summary: [`studentExamRoutes.ts`](f:\CampusWay\backend\src\routes\exams\studentExamRoutes.ts) now maps `req.params.sessionId` into `attemptId` for the canonical controllers. Playwright then verified question bootstrap, autosave, and submit all succeed.

## CW-BUG-005
- Module: Student Exams
- Role: Student
- Route/Page: `/api/exams/:examId/sessions/start`
- Severity: High
- Steps to reproduce:
  1. Log in as the seeded student.
  2. Open a live exam detail page.
  3. Click `Start Exam` after the backend successfully creates a session.
- Expected result: The client should read the returned session id and transition into the runner.
- Actual result: The UI still showed `Unable to start exam session.` even though the API returned `200` with a valid `session.sessionId`.
- Screenshot/evidence: Browser-evaluated network payloads during the run showed the start response included `session.sessionId: \"69b28a43ca6e00027196873b\"`, while the client only accepted `session._id` or `session.id`.
- Root cause: [`examApi.ts`](f:\CampusWay\frontend\src\api\examApi.ts) did not normalize the canonical `session.sessionId` field from the start-session response.
- Fixed?: Yes
- Retested?: Yes
- Fix summary: [`examApi.ts`](f:\CampusWay\frontend\src\api\examApi.ts) now accepts `session.sessionId` in `startExamSession`. Playwright retested the exact flow and confirmed the runner loads instead of the error state.
