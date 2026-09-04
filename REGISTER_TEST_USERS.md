# Test registration runner

This Playwright script opens the DGH Everytime app, selects **회원가입**, creates visibly sequential test credentials, uploads credential images, and sends each registration request.

## Windows ready-to-run package

1. Extract the supplied ZIP.
2. Double-click `windows\install.bat` once. This installs Playwright and its private Chromium browser.
3. Confirm that `C:\Users\user\Downloads\IMG_0019.jpeg` exists.
4. Double-click `windows\run-registration.bat`.

The launcher sends 10 clearly numbered registration requests, five seconds apart. Edit the four values at the top of `run-registration.bat` to change the image, request count, starting number, or interval. Press **Ctrl+C** to stop an active run.

## Manual install

```bash
npm install
npx playwright install chromium
```

## Run

The default image is `C:\Users\user\Downloads\IMG_0019.jpeg`. Pass another image or a directory with `--images`. Directory images are sorted naturally and assigned in order. If the request count is greater than the number of images, the script cycles through them.

```bash
npm run register:test-users -- \
  --images "/absolute/path/to/credential-images" \
  --count 5 \
  --start 1 \
  --interval 5 \
  --headed
```

The generated data is deliberately easy to identify:

| Request | Username | Name | Email | Password suffix |
| --- | --- | --- | --- | --- |
| 1 | `qa_student_0001` | `QA 학생 0001` | `qa_student_0001@example.test` | `0001` |
| 2 | `qa_student_0002` | `QA 학생 0002` | `qa_student_0002@example.test` | `0002` |

Use `--prefix`, `--email-domain`, or `--password` when the test environment requires other values. Use `--dry-run` to fill forms without sending requests. The script caps each run at 100 requests.

After a run, non-secret results are written to `registration-results.json`. Passwords are always redacted. When a registration fails, a `registration-error-NNNN.png` screenshot is also saved to help identify a changed selector or validation rule.

## Inspect a changed interface

Run with `--headed`, pause on the failed page, and inspect the form with Chrome DevTools. The automation first locates fields by accessible Korean/English labels and placeholders, then falls back to input attributes. If the app changes, update the locator candidates in `openRegistration`, `fillRegistration`, or `submitRegistration`.

Only run this utility against an application and test data you are authorized to use. Remove test registrations after verifying the flow.
