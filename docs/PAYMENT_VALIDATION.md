# Tajnstvo paid-report validation — 26 October 2026 (America/New_York)

**Status: NOT READY FOR LIVE CHARGES.** This record separates observed production behavior, local simulations, and work still requiring real Stripe sandbox credentials. Prices remain $15 / $9 / $19 USD. No production environment settings or live Stripe objects were changed.

## Inspected state

- Repository: `artffee/tajnstvo`, `main` at `3439ea7fb7ff1ff6c95a8d900d5955134066a499` (merged PR #3).
- Vercel project: `tajnstvo`, `prj_zfA1BYWJCEdVv3kuOp3Aznh9iEYF`, team `usivaylo-5363s-projects`.
- Production: `dpl_DcNpSGMvkCtdiqBzhf41Nx5Dy94p`, READY, same commit, aliases include `https://tajnstvoto.com`.
- Initial Vercel environment metadata: no variables and no hidden production variables. Follow-up configuration below adds variables only for the validation preview branch; production still has none.
- Production `GET /api/status`: HTTP 200, `paymentsReady:false`, `supportEmail:null`, English and Bulgarian report languages.
- Production `POST /api/checkout` with the correct origin and a fictional request: HTTP 503, `CHECKOUT_UNAVAILABLE`.
- Owner selected `Orion Mind sandbox` (`acct_1ULZfDGeTDDLMfda`, `livemode:false`) and confirmed `usivaylo@gmail.com` as actively monitored purchase/refund support. The live account was not inspected or changed.

- Review PR: https://github.com/artffee/tajnstvo/pull/4 (draft, not merged).
- Tested code preview: `b549cdcfd41867646dc4c4c6c21b1976f5e70074`, deployment `dpl_4GeyFUjwFWz4e3vdR9ecjuBjWMSb`, READY: https://tajnstvo-ka744anyi-usivaylo-5363s-projects.vercel.app/ . It has no payment credentials and remains disabled. Production was not promoted.

### Follow-up sandbox setup

- Sandbox account reports charges/details/payouts enabled, but this is test configuration, not live business verification. Its profile describes A305X merchandise, uses another site URL, has test contact details and no support email. It does not establish Tajnstvo's legal seller, receipt identity or statement descriptor. Shared profile settings were left unchanged.
- Existing NautilusClaw and Orion Saint webhook endpoints were inspected and left unchanged. A separate Tajnstvo endpoint `we_1UUsjnGeTDDLMfdaXCKW2Zwz` was created at the stable branch alias `/api/webhook`, API `2026-09-30.endive`, for Checkout completed/async-success/async-failure. It is **disabled** until the application has its runtime key, avoiding failed deliveries during setup.
- Default payment-method configuration has cards and Link available. US bank account, SEPA debit and ACSS debit were unavailable/off. Shared payment-method configuration was not changed; real asynchronous-method tests still need an available isolated method/configuration.
- Six Vercel variables exist only for Preview + `fix/paid-report-validation`: `SUPPORT_EMAIL`, `PAYMENTS_MODE=test`, `TEST_APP_ORIGIN`, `PAYMENTS_ENABLED=false`, `RECEIPT_SIGNING_SECRET` (sensitive), and `STRIPE_WEBHOOK_SECRET` (sensitive). **`STRIPE_SECRET_KEY` is missing.** No secret values are in this record or source control.
- Configured preview redeploy: `dpl_C8M3ZiUcRUmz38XSB2fdbSMiuvK1`, READY, target Preview, commit `5153cf4ac2a744deaa0357b4a5f2d1caeaefeb88`. Stable alias: https://tajnstvo-git-fix-paid-report-validation-usivaylo-5363s-projects.vercel.app . Its status returns `paymentsReady:false`, `verificationReady:false`, `testMode:true`, and the confirmed support email. Browser checks show the correct mailto link on both EN and BG Contact pages.
- Production was checked again: `paymentsReady:false`, `supportEmail:null`. No production promotion or live activation occurred.
- The connected Stripe API cannot create/reveal runtime API keys. The Dashboard requires sign-in. A dedicated sandbox restricted key must be installed as sensitive `STRIPE_SECRET_KEY` on this preview branch before enabling the endpoint and test checkout. Do not put it in chat. This remains a configuration blocker, not a failed payment test.

## Confirmed fixes in this branch

1. Default test mode rejects a live key. Live Checkout additionally requires explicit approval configuration and Vercel's production environment.
2. Exact server-configured preview origins allow testing without returning to production. A customer cannot override return URLs or origin validation.
3. Purchase cookies are saved before leaving for Stripe. Matching pending sessions survive repeated verification and a missed success redirect. New checkout is blocked for already purchased products or overlapping pending orders.
4. A dedicated receipt-signing secret separates purchase recovery from webhook-secret rotation. Wrong-browser, forged-cookie, foreign-site and wrong-mode sessions remain invalid.
5. Verification continues when new checkout is paused. Missing Stripe sessions no longer prevent valid receipts from being checked; transient Stripe errors fail closed without overwriting receipts.
6. Pending, failed, expired, refunded and disputed orders have distinct server outcomes. Webhook handling re-reads current Session/Charge data and tolerates retries and stale events.
7. Checkout records only the selected report language alongside product/browser metadata, never the birth profile. Success returns restore that language and download the specific purchased product.
8. A bilingual **Check my purchases** button supports same-browser recovery. Return IDs are removed from the address bar, test mode is visible, and a revoked download does not silently redirect to a fresh purchase.
9. Fixed a PDF clipping defect: Unicode fallback was applied only while drawing, so English paragraphs were wrapped with narrower Times metrics and then drawn outside the page in DejaVu. Width measurement and line wrapping now use the rendering font; a regression test covers narrow and full-width paragraphs.
10. Privacy/refund disclosures describe cookie recovery and its limits; Terms now describes both report languages.

## Results

| Check | Evidence | Result |
| --- | --- | --- |
| Baseline tests | `npm ci`, `npm test` before changes | 18 passed |
| Revised payment/chart/PDF tests | `npm test` | 29 passed; local simulations only |
| Build and syntax | `npm run build`, `node --check`, `git diff --check` | Passed |
| Prices and languages | Six product/language combinations through actual handlers with an in-memory Stripe adapter | Passed: 1500/900/1900 cents, EN/BG |
| Successful fulfillment | Signed fixture webhook → verification → repeat entitlements | Passed locally; no real Checkout transaction |
| Cancellation | Open unpaid session, repeat request/idempotency, configured cancel URL | Passed locally; Stripe-hosted cancel UI untested |
| Delayed/failed payment | Pending preserved, duplicate purchase blocked; asynchronous failure grants no access | Passed locally; actual Stripe delayed/declined methods untested |
| Webhook retries | First write fails with HTTP 500, retry succeeds, duplicate/stale event harmless | Passed locally; actual Stripe delivery/retry untested |
| Refunds/disputes | Full/partial refunded Charge and disputed Charge deny access at next verification | Passed locally; no refund was issued through Stripe |
| Repeat/recovered access | Pre-redirect cookie, no success redirect, repeated checks, new sales paused | Passed locally; cross-device recovery remains absent |
| Abuse checks | Wrong browser, mode, origin, price/currency/site, forged receipt/signature, missing session | Passed locally |
| Private birth fields | Handler receives a deliberately injected name/date but Stripe request omits both | Passed locally; live request trace still needed in sandbox |
| PDF renderer | Actual PDF bytes generated by existing renderers in Node VM | English 22 pages, Bulgarian 13 pages, Star Map 1 page for the fictional test profile; counts can vary |
| PDF visual/layout checks | Rendered every generated page; English font wrapping corrected; PDF word bounding boxes checked | No words outside the generated English page bounds after fix; representative pages visually inspected |
| Production free reading | Cloud browser entered a fictional Sofia profile and switched EN/BG | Both free readings displayed; paid buttons disabled |
| Updated preview free reading/cancel return | Cloud browser tested fictional profile, EN/BG switch, and cancel-return URL | Passed: profile/free result retained, cancellation message translated, all paid buttons disabled |
| Paid UI/download browser test | Local browser installation failed; hosted preview exists but has no payment credentials | Not completed; sandbox configuration still required |
| Preview support/configuration | Branch-scoped variables, ready redeploy, status endpoint and EN/BG Contact page | Passed; support email visible, checkout/verification remain disabled |
| Actual Stripe end-to-end | Sandbox selected and webhook/secrets prepared; runtime API key still absent | NOT RUN |

The local test fixture is documented in `tests/purchase-flow.test.mjs`. A locally generated signature validates signature-handling code; it does not prove Stripe delivered the webhook. A valid PDF renderer output does not prove delivery after a real payment. No successful live or sandbox purchase is claimed.

## Recovery, access and privacy review

Birth calculations and ordinary PDF generation remain in the browser. Checkout passes only product, locale, report language, opaque request ID and a hashed random browser binding. No birth name, date, time, place or chart is included in Stripe metadata. City search can send search text to Photon when local matching fails; optional AI can send chart context to Anthropic after the existing opt-in. The journal and 45-day companion have their existing local persistence disclosures.

The normal download path verifies the current Charge, but the renderer remains publicly downloadable and callable. This is not strong paid-content protection. Existing PDFs cannot be remotely withdrawn after a refund. The three-session cookie is not an account or recovery email. The app cannot presently issue an independently authenticated recovery link to a new device. Do not treat knowledge of an email address, session ID or receipt screenshot alone as authorization to grant another browser access.

## Remaining work before launch

1. Completed: sandbox selection, account/payment-method inspection, separate Tajnstvo webhook, and owner-confirmed support address. The shared business profile remains unsuitable evidence for Tajnstvo's live seller details.
2. Install a dedicated Orion Mind sandbox restricted API key as sensitive `STRIPE_SECRET_KEY` in Vercel Preview, scoped to `fix/paid-report-validation`. Grant Checkout Sessions write/read (including metadata updates), PaymentIntents read and Charges read; verify inline Price/Product creation and expanded-charge reads with the actual key before widening permissions. Then enable only Tajnstvo's sandbox endpoint, set preview `PAYMENTS_ENABLED=true`, redeploy, and verify status. Keep production payments disabled.
3. On that hosted preview, use fictional profiles and Stripe test payment methods to exercise EN report, BG report, Star Map and bundle. Capture Checkout Session/event IDs and check exact amounts, report language, usable complete PDFs, browser downloads and privacy traces. Test desktop and a phone browser, including the bundle's two-file download behavior.
4. Test cancel/back/retry, card decline, asynchronous success/failure, pending return, lost redirect, page refresh, missing tab profile, replayed webhook and transient failure/retry. Repeat downloads must not charge again. Process a sandbox full and partial refund and verify future access is denied. Test receipt-secret and webhook-secret rotations separately.
5. The owner confirms the support inbox is monitored. Still establish a refund/recovery procedure and response expectation; verify seller legal name, business contact details, Stripe receipt/statement details, refund promise and tax treatment. Those business facts have not been assumed or approved; no test support email has been sent.
6. Resolve the public-renderer and account-recovery limitations before charging: either implement authenticated private delivery with the necessary privacy disclosure, or explicitly approve a browser-generated product and its limitations. Do not advertise protection or account recovery that does not exist.
7. Review the exact tested commit and production settings. Only after the owner approves may live credentials, live webhook and the explicit live activation gates be configured. Verify production with the reviewed release; never use real card charges as a substitute for sandbox testing.

## References

- Source release: https://github.com/artffee/tajnstvo/pull/3
- Production: https://tajnstvoto.com/
- Stripe testing: https://docs.stripe.com/testing
- Stripe webhook signatures and retries: https://docs.stripe.com/webhooks
- Stripe fulfillment: https://docs.stripe.com/checkout/fulfillment
