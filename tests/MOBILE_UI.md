# Mobile portal browser checks

From the repository root, install the existing project dependencies, then run:

```sh
npm run lint
npm run typecheck
npm run build
node tests/mobile-portal.browser.cjs
```

The script uses Playwright with installed Chrome. Set `CHROME_PATH` if Chrome is
installed elsewhere. It serves the production build on a temporary local port,
uses fictional account data, intercepts all API requests and blocks external
services. It does not require a database, send real requests, register accounts
or use paid assistant calls.

It checks six phone, tablet, desktop and landscape sizes; navigation and screen
overflow; assistant opening, replies, retries, focus restoration and a simulated
phone keyboard; invoice anchors, PDF links, search, pagination and empty states;
profile and request navigation; registration validation and success; and logout.
Screenshots go to the operating system's temporary folder by default. Set
`MOBILE_QA_OUTPUT` to select a different output folder.

Live assistant replies use the existing authenticated `/api/portal/chat` service
and require its server configuration, including `OPENAI_API_KEY`. These browser
checks simulate that service; they do not validate the production AI service.
The keyboard check simulates a smaller visual viewport. A real iPhone/Android
smoke test remains useful for device-specific keyboard and safe-area behavior.
