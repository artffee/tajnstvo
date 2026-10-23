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
