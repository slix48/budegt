# Penny

A responsive personal budgeting app. Enter take-home income, reserve essentials, log discretionary purchases, and make a practical savings plan.

## Run locally

Requires Node.js 20 or later. No dependencies or build step.

```sh
npm start
npm test
```

Preview: http://127.0.0.1:5198

## Included

- Overview with a monthly spending estimate, daily allowance, allocation chart, goals, and activity.
- Editable recurring and one-time income; weekly, biweekly, semimonthly, monthly, and yearly schedules.
- Local CSV income import with review, validation, and exact duplicate suppression; downloadable CSV example.
- Monthly essential costs and an adjustable future savings percentage.
- Discretionary spending log with search and category filtering.
- Emergency cushion, high-interest debt, savings goals, and educational investing guidance.
- Browser-local persistence, selectable display currency, JSON export, and validated backup restore.
- Clearly marked example data; an explicit fresh-start action creates a personal budget.
- Responsive layouts, keyboard-accessible controls, labeled forms, native dialogs, and reduced-motion support.

## Budget model

All calculations use integer cents. Recurring income is a monthly average: weekly × 52/12, biweekly × 26/12, semimonthly × 2, yearly ÷ 12. One-time income only counts in its date's month. This is a planning model, not a bank balance or payday cash-flow forecast.

Reserve essential costs first. Future savings equal the selected percentage of income, capped at the remaining surplus. Everyday spending equals the remaining surplus less future savings. Logged discretionary purchases reduce that allowance; the app reports overspending and essential shortfalls separately. Do not log reserved essentials again as discretionary spending.

The suggested future allocation fills a starter emergency cushion, then high-interest debt, then the full emergency target, then goal gaps. Any remainder is displayed as available to explore investing. The starter cushion uses the smaller of 1,000 display-currency units or the selected full target; this is a disclosed product heuristic. Money is never transferred. Savings, debt, and goal balances change only when edited.

Educational references: [CFPB emergency funds](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/), [Investor.gov high-interest debt](https://www.investor.gov/introduction-investing/investing-basics/save-and-invest/pay-credit-cards-or-other-high-interest), [Investor.gov asset allocation](https://www.investor.gov/introduction-investing/getting-started/asset-allocation).

## Current limits

- Data stays in the current browser's localStorage; no cross-device sync, bank connections, or money movement.
- CSV income uploads are supported; payslip PDFs and images are not parsed.
- Currency changes relabel amounts without conversion.
- Monthly plans use current recurring settings. This version does not offer historical budget snapshots or payday cash-flow forecasts.
- Google Fonts is used for typography; system fonts work as a fallback.
- Automated tests cover the financial model, rounding, import validation, and backup validation. Browser visual QA was unavailable in the build environment.

Static deployment output lives in `dist/`; Sites configuration is in `.openai/hosting.json`.
