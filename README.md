# VideosKE – 18+ video platform with tokens (Next.js + Supabase + Paystack + Vercel)

## Features
| | |
|---|---|
| **18+ only** | Age gate, date-of-birth check on sign-up, consent checkboxes stored per user. |
| **Free videos** | Public, free to watch for logged-in members. They earn nothing for the uploader. |
| **Premium videos** | Unlocked with tokens. Each one gets a random price (default 150–200 tokens). Optional preview clip. |
| **Paid live streams** | The host sets a ticket price in tokens (0 = free). Includes built-in live chat (LiveKit). |
| **Tokens via Paystack** | Users buy packages with **M-PESA or card in KES**, or **card in USD** (optional). Tokens are credited automatically through the Paystack webhook and callback. |
| **Creator earnings** | Every token spend splits **70% to the creator and 30% to you** (adjustable). Creators withdraw to M-PESA; admin approves and pays. |
| **View counts** | Every video counts a view when the full video starts playing (once per browser session). Views show on cards, the video page, profiles and the admin page. |
| **Referrals** | Each member gets a link (`/register?ref=username`). When a referred member becomes **active** (buys 100+ tokens in total), the referrer earns **KSh 50** in withdrawable earnings, once per member. Both numbers are adjustable. |
| **Pricing by country** | **1 token = KSh 1.** Visitors in Kenya see KSh and pay with M-PESA or card. Everyone else sees **USD**, converted with the rate you set in admin (default 130 KSh = $1). They pay by card, in USD if enabled, otherwise in KSh. The country comes from Vercel's location detection. |
| **Ads** | Admin creates **native** ads (cards inside the video feed) and **interstitial** ads (full screen on video pages, skippable after 5 s), with view and click counts. |
| **Admin** | Approves all videos, handles payouts, ads, settings, reports, bans, and manual token credits. Can also create creator profiles. |
| **Content rules** | No nudity or sexual content (required by Paystack's terms). Uploaders confirm this on every upload and stream. |

---

## Updating your existing site (you already deployed v1)

### Update 003 (views, referrals, USD pricing)
In Supabase's SQL Editor, run `prisma/migrate-003.sql` (after `migrate-002.sql`). Then upload the new code to GitHub as in Step 4. No new Vercel variables are needed.

### Step 1 – Update the database (Supabase)
1. Open **https://supabase.com/dashboard/project/YOUR-PROJECT/sql/new**.
2. Open `prisma/migrate-002.sql`, copy all of it, paste it in, and click **Run**.
3. You should see **"Success. No rows returned"**. This step removes the old M-PESA SMS tables.

> New installs: run `prisma/setup.sql`, then `prisma/migrate-002.sql`, then `prisma/migrate-003.sql`.

### Step 2 – Add the Paystack keys to Vercel
**Vercel → your project → Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `PAYSTACK_SECRET_KEY` | your **new** `sk_test_...` (regenerate it – the old one was shared in a chat) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | your `pk_test_...` |
| `SITE_URL` | `https://videoske.vercel.app` (your real Vercel address, no trailing slash) |

### Step 3 – Set the Paystack webhook
**Paystack Dashboard → Settings → API Keys & Webhooks → Test Webhook URL**:
```
https://videoske.vercel.app/api/paystack/webhook
```
Save. Do the same in the **Live** fields when you switch to live keys.

### Step 4 – Upload the new code to GitHub (Vercel redeploys automatically)

**Option A – GitHub website**
1. Open your repo, then **Add file → Upload files**.
2. Drag **everything inside** the new `videoske` folder in. Same-named files get replaced. Leftover old files are harmless.
3. Click **Commit changes**. Vercel starts deploying within seconds; watch it under **Deployments**.

**Option B – Git command line**
```bash
git add .
git commit -m "Tokens with Paystack, free/premium videos, payouts, ads"
git push
```

### Step 5 – Test with Paystack test mode
1. Log in, then click the **🪙** balance in the top bar to open **Wallet → Buy**.
2. On the Paystack page, use the test details Paystack shows: test card `4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`, OTP `123456`. You can also try the M-PESA test option.
3. You return to **/wallet/callback**, and the tokens are added.
4. Unlock a premium video and check **/admin**: your commission and the creator's earnings will show.

### Step 6 – Go live with real money
1. Complete Paystack's business verification (**Settings → Compliance**).
2. Replace the test keys in Vercel with `sk_live_...` and `pk_live_...`, then **Redeploy**.
3. Set the **Live Webhook URL** in Paystack.
4. To accept USD, ask Paystack to enable USD on your account, then set **Admin → Settings → Offer USD card payments → Yes**.

---

## How money flows
1. A user buys 500 tokens for **KES 500** through Paystack. The money goes to your Paystack balance.
2. The user unlocks a 175-token video. The creator gets **122 tokens** in earnings (70%), and the platform keeps 53.
3. The creator requests a withdrawal of 1,000+ tokens. In **Admin → Payout requests**, you send KES to their M-PESA number and click **Mark paid**.
4. Videos from admin-run profiles earn 100% for the platform.

## Settings (Admin → Settings)
- KSh per token
- USD conversion rate
- referral reward and the "active" threshold
- token packages
- premium price range
- commission %
- minimum withdrawal
- native ad frequency
- interstitial frequency

## Fresh install (local)
```bash
cp .env.example .env    # fill in values
npm install
# run prisma/setup.sql then prisma/migrate-002.sql in Supabase SQL Editor
npm run dev
```
To make yourself admin, register on the site, then in the SQL Editor run:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

## Notes
- Paid content must follow the rules in `/terms`. Paystack does not support sexually explicit content, and accounts that break its rules get suspended.
- Signed video links expire after 2 hours.
- Chat uses polling, which is fine for a few hundred users.
