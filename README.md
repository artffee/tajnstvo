# Tajnstvo

Static English/Bulgarian homepage and original English tool collection, hosted on Vercel. The existing chart engine, report content, sample assets, meditations, maps and rituals are preserved. Standard PDFs require no visitor API key.

## Run and validate

Use Node 22 or newer. `npm ci`, `npm test`, `npm run build`, and `npm run dev` (port 4173). The build copies public assets into `public/`; `api/` contains Vercel Node functions. The development-only `/__qa/mobile` route is never included in the deployed output. Tests exercise historical civil time, DST gaps/overlaps, forged receipts, unpaid/refunded/disputed payments, webhook signatures and retries, and actual PDF generation with a Cyrillic name.

## Payment activation — currently off

The public preview and free tools work without credentials. Checkout intentionally stays unavailable unless ALL these server environment variables are present:

- `STRIPE_SECRET_KEY`: use a suitably restricted Stripe secret key; never expose it in frontend source.
- `STRIPE_WEBHOOK_SECRET`: signing secret for the endpoint below.
- `SUPPORT_EMAIL`: the owner's verified, monitored customer support address.
- `PAYMENTS_ENABLED=true`: set only after completing test-mode checks.

Configure `https://tajnstvoto.com/api/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.async_payment_failed`. Use API version `2026-09-30.endive`, matching the installed Stripe SDK. Ensure the key can create/read/update Checkout Sessions and read expanded PaymentIntents and Charges. Configure receipt emails in Stripe. Prices remain $15 report / $9 star map / $19 bundle, USD, single purchase; these amounts are fixed on the server. Tax configuration, seller identity and policy details need the business owner's review before activation.

Test with Stripe test-mode credentials first: successful purchase, cancellation, delayed webhook, asynchronous failure, duplicate event delivery, second download, wrong-browser session, refunds, disputes, and mobile download behavior. No live payment was made during this repair. Return URLs are fixed to the production domain; a staging test requires an explicit source/config change to the approved staging origin and webhook, not an arbitrary client-provided callback.

The server verifies payment amount, currency, status, webhook fulfillment, charge/refund/dispute state and browser binding before normal download controls grant access. URL parameters or old localStorage flags cannot unlock a purchase. The existing report renderer remains public browser JavaScript: this is not DRM or server-side content protection. Strong paid-content protection requires moving rendering/content behind an authenticated server endpoint in a subsequent change.

The signed receipt cookie supports this browser only, retaining up to three sessions for a year. Birth information stays in sessionStorage, separate from payment records. Customers who clear cookies or change device need support; there is no account-based recovery. Refunds are handled in Stripe by the owner and checked on the next download verification. A webhook secret rotation invalidates old receipt-cookie signatures; retain the original Stripe receipt for support.

## Content and privacy

The main interface and short preview are available in English and Bulgarian; the full PDFs and most original Explore tools are English. The original approximate astronomical algorithms are retained. Geographic time-zone lookup uses tz-lookup and civil time conversion uses the runtime's IANA history, including half-hour offsets and ambiguous/nonexistent local times. Historical border changes are not fully modeled.

Names and birth profiles stay in the tab. Optional advanced Anthropic access is opt-in, stored in sessionStorage, and sends chart context and entered ritual text directly to Anthropic. The 45-day companion still stores its snapshot/progress locally. Privacy, Terms, Refunds and Contact pages disclose this behavior. No support address is fabricated. No analytics tag is included.

## Deployment and rollback

Vercel should use the repository's `vercel.json` build settings and deploy the main branch. Keep payment variables absent while reviewing. The original live source was newer than GitHub main and has been recovered in the preceding recovery commit; preserve that commit for reference. Revert the repair commit to roll back rather than resetting main to the older, incomplete GitHub copy.
