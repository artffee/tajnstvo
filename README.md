# Tajnstvo

Static English/Bulgarian homepage and original English tool collection, hosted on Vercel. The existing chart engine, report content, sample assets, meditations, maps and rituals are preserved. Standard PDFs require no visitor API key.

## Run and validate

Use Node 22 or newer. `npm ci`, `npm test`, `npm run build`, and `npm run dev` (port 4173). The build copies public assets into `public/`; `api/` contains Vercel Node functions. The development-only `/__qa/mobile` route is never included in the deployed output. Tests exercise historical civil time, DST gaps/overlaps, forged receipts, unpaid/refunded/disputed payments, webhook signatures and retries, and actual PDF generation with a Cyrillic name.

## Payment activation — currently off

The production deployment inspected on 26 October 2026 is commit `3439ea7`, with no Vercel project environment variables. `/api/status` reports `paymentsReady:false` and `supportEmail:null`. No successful Stripe sandbox or live purchase has been established. Local tests use an in-memory Stripe adapter, not actual transactions. See [the validation record and launch requirements](docs/PAYMENT_VALIDATION.md).

The public preview and free tools work without credentials. Prices are fixed on the server: $15 report / $9 Star Map / $19 bundle, USD, single purchase. The Stripe SDK remains pinned at 23.0.1 and API version `2026-09-30.endive`.

### Isolated sandbox setup

Configure a dedicated preview branch, not production. Store keys as sensitive Vercel environment variables, never in Git or chat:

- `STRIPE_SECRET_KEY`: a sandbox restricted key with Checkout Session create/read/update and PaymentIntent/Charge read permissions. A test-mode `rk_test_` key is preferred.
- `STRIPE_WEBHOOK_SECRET`: the sandbox endpoint signing secret.
- `RECEIPT_SIGNING_SECRET`: a separate cryptographically random secret of at least 32 characters. Keep it stable; rotating the webhook secret no longer invalidates purchase cookies. Rotating this receipt secret still does.
- `PAYMENTS_MODE=test`: default when omitted; live keys fail closed in this mode.
- `TEST_APP_ORIGIN`: the exact approved HTTPS preview origin, with no path, query, credentials or fragment. Return URLs and CSRF checks use this server value, never a request-supplied URL. Local development can explicitly set `http://localhost:4173`.
- `SUPPORT_EMAIL`: the owner's verified, monitored address. Nothing sends email from this app; this address appears in Checkout and support pages.
- `PAYMENTS_ENABLED=true`: only in the sandbox preview once its dependencies are configured.

Register `<approved-preview-origin>/api/webhook` in the same sandbox for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`, using the API version above. Fulfillment requires a verified signature and freshly retrieved paid Session/Charge; failed writes return 500 for Stripe retries. Refunds, partial refunds and disputes are checked from Stripe on every download verification. No refund is initiated by this app.

The UI clearly labels enabled test checkout. Check the exact Vercel branch/environment and sandbox account before adding variables. Do not copy preview secrets into production. The application requires its own configured API credential; a connected Stripe tool alone does not provide credentials to the deployed application.

### Live activation gate

Leave live payments disabled until the validation record is complete and the owner approves the reviewed release, business identity, support, policies, tax handling and production configuration. Live checkout requires all the above dependencies plus `PAYMENTS_MODE=live`, a live restricted key, `LIVE_PAYMENTS_APPROVED=true` and `VERCEL_ENV=production`. Live return URLs always use `https://tajnstvoto.com`. These flags are operational safeguards, not a substitute for approval or testing. No live activation is part of this change.

Turning `PAYMENTS_ENABLED` off stops new checkouts while existing purchases can still be verified and downloaded if the verification credentials remain configured. Configure Stripe receipt emails and verify the seller details customers see before launch.

### Purchase recovery and content limitations

The server verifies payment mode, product, amount, currency, fulfillment, refund/dispute state and browser binding. URL parameters and legacy localStorage flags do not grant entitlements. A signed HttpOnly cookie now remembers up to three browser-bound sessions **before redirecting to Stripe**, including pending orders; a lost return redirect no longer loses same-browser recovery. The homepage's **Check my purchases** control rechecks those sessions. Pending orders do not unlock PDFs or permit another overlapping checkout. Selected report language is recorded in Stripe metadata and restored on the success return.

Cookies last one year. Birth data remains in tab sessionStorage and is not sent to the payment server or Stripe. A new tab may require re-entering the birth details. Clearing cookies, using another device, or losing an older session beyond the three-session limit still requires support with the original receipt. There is **no account-based or email recovery**. The support process must be operational before charging.

The existing report renderer/content is public browser JavaScript. Server checks protect the ordinary buttons, **not direct execution of the renderer**. A purchase is not bound to one birth profile. Removing public renderer files alone would break the existing free tools and would not provide a coherent access model. Strong paid-content protection requires an authenticated server generation/delivery design; sending birth data to that server would require a reviewed privacy disclosure. Downloaded copies cannot be revoked. This limitation remains a launch decision, not a completed security fix.

## Content and privacy

The main interface and short preview are available in English and Bulgarian; the written PDFs now have English and Bulgarian editions; the Star Map and most original Explore tools are English. The original approximate astronomical algorithms are retained. Geographic time-zone lookup uses tz-lookup and civil time conversion uses the runtime's IANA history, including half-hour offsets and ambiguous/nonexistent local times. Historical border changes are not fully modeled.

Names and birth profiles stay in the tab. Optional advanced Anthropic access is opt-in, stored in sessionStorage, and sends chart context and entered ritual text directly to Anthropic. The 45-day companion still stores its snapshot/progress locally. Privacy, Terms, Refunds and Contact pages disclose this behavior. No support address is fabricated. No analytics tag is included.

## Deployment and rollback

Vercel should use the repository's `vercel.json` build settings and deploy the main branch. Keep payment variables absent while reviewing. The original live source was newer than GitHub main and has been recovered in the preceding recovery commit; preserve that commit for reference. Revert the repair commit to roll back rather than resetting main to the older, incomplete GitHub copy.

## Return experiences

After a free reading, My Sky creates a 1080 × 1350 PNG locally in midnight or parchment style. Birth date and birthplace never enter the exported card model; names are opt-in, and unknown birth times omit Rising. Native file sharing is feature-detected, with a PNG download fallback. Nothing posts automatically.

`/daily` provides a deterministic daily reflection, action and journal question, an optional Sun-sign lens using this tab’s profile, a 60-second timer, and local completion history capped at 31 entries. Its general edition works without birth data. The date follows the visitor’s local calendar; astronomical positions use that date at 12:00 UTC. New content cycles through seven authored themes, with four element-based lenses. This is not AI-generated or a predictive forecast.

`/folklore` introduces Martenitsa, the Surova feast in Pernik and Nestinarstvo in Bulgari. The page links to UNESCO heritage records and distinguishes the original stories from Tajnstvo’s modern reflection prompts and decorative SVG drawings. Both rooms and card controls support English and Bulgarian. No external image/font service or new backend is required.

## Personal rooms and Bulgarian reports

`/relationship` compares a saved primary birth chart with a second profile held only in page memory. It shows up to five close aspects among Sun, Moon, Mercury, Venus and Mars, with bilingual conversation prompts and no compatibility score. If either time is unknown, comparisons involving that person’s Moon are omitted. Ascendant/house compatibility is not inferred.

`/journal` stores up to 100 entries locally without encryption. It supports edit, last-delete undo during the visit, JSON backup export, and validated import that preserves existing entries. Users are told about shared-browser access and clearing browser data. No account or server copy exists.

`report-bg.js` is an authored Bulgarian edition based on the same chart calculations, rather than a literal translation of every English paragraph. It covers placements, Big Three, planets, nodes, numerology, houses, aspects, relationships/work/resources, chart wheel, approximate planetary map and generation-day transits. Cyrillic names do not produce misleading Latin-only name numerology. `/sample-bg.pdf` uses an explicitly labeled fictional profile. The selected written-report language persists across checkout and is used by verified personal downloads. The Star Map remains English. Purchases are still disabled until the existing payment activation requirements are met.
