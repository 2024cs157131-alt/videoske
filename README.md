# VideosKE – 18+ pay-to-unlock video site (Next.js + Supabase + Vercel)

## What's included

| Feature | How it works |
|---|---|
| **18+ registration & consent** | Age-gate popup on first visit. Registration requires a date of birth (server rejects anyone under 18) plus three ticked consent boxes. The consent time is stored on each user. |
| **Videos with locked preview** | Each video has a public **thumbnail** and an optional **preview clip** (10–30 s). The full video sits in a *private* storage bucket. It is only streamed through a 2-hour signed link to the owner, admins, and people who paid. |
| **Random price per video** | On upload, every video gets a random whole-shilling price between **Ksh 150 and 200**. Admin can change the range. |
| **M-PESA unlock** | The user pays the exact price to the till and pastes the confirmation SMS. The server checks:<br>• the code (10 characters)<br>• the amount equals the video price<br>• the till name matches<br>• the date is recent, not in the future, and after the account was created<br>• the code was never used before<br>• optionally, Safaricom has confirmed that code (Daraja C2B)<br>Failed attempts are logged, with a limit of 10 per hour per user. |
| **Till number / name in backend** | Stored in the database and editable at **/admin → Payment settings**. Defaults: `123456` / `VIDEOSKE`. |
| **Admin** | Edit till settings. Approve or reject user uploads. Create creator profiles (no login) and add videos to them. View verified payments and failed attempts. Handle reports. Ban users. |
| **Users** | Users upload many videos (held for approval), comment, report, and send direct messages (chat refreshes every 3 s). They can also **go live**, with camera, mic and live chat through LiveKit. |

## Recommended stack (all have free tiers)

- **Hosting:** Vercel.
- **Database: Supabase Postgres.** This is the best fit because the same project also gives you **Storage** for large video files. Vercel functions can't accept uploads over ~4.5 MB, so files go straight from the browser to Supabase. Neon also works for the database alone, but you would then need separate video storage.
- **Live streaming: LiveKit Cloud.** Vercel can't host WebRTC media servers itself.
- **ORM:** Prisma.

## Setup (about 20 minutes)

### 1. Supabase
1. Create a project at https://supabase.com. Pick the **EU (Frankfurt)** region for the lowest latency from Kenya.
2. **Storage → New bucket**:
   - `public-media` → **Public** ON
   - `private-videos` → **Public** OFF
   Under each bucket's settings, set the file size limit. The Free plan caps files at 50 MB. Pro allows much larger files, which you'll need for long videos.
3. **Project Settings → Database → Connection string**. Copy the *Transaction pooler* URL (port 6543) into `DATABASE_URL` and add `?pgbouncer=true&connection_limit=1`. Copy the *Session/Direct* URL (port 5432) into `DIRECT_URL`.
4. **Project Settings → API**. Copy the URL, the `anon` key and the `service_role` key.

### 2. LiveKit (for going live)
Create a project at https://cloud.livekit.io. Copy the WebSocket URL, API key and API secret.

### 3. Local
```bash
cp .env.example .env      # fill in every value
npm install
npm run db:push           # creates the tables
npm run db:seed           # creates the admin user + default till settings
npm run dev               # http://localhost:3000
npm run test:mpesa        # optional: checks the SMS parser
```

### 4. Deploy to Vercel
1. Push the folder to GitHub, then go to https://vercel.com/new → import the repo.
2. Add **all** variables from `.env` under *Settings → Environment Variables*. You can leave out the `ADMIN_*` and `DARAJA_*` variables if you only seed from your own machine.
3. Deploy. Log in with your admin email and password, then open **/admin** and confirm the till number and name.

## Making payments fraud-proof (strongly recommended)

Checking the SMS text alone stops honest mistakes (wrong amount, wrong till, re-used code). However, someone can **type a fake message** with a made-up code. To close that gap, use Safaricom's Daraja C2B API:

1. Create an app at https://developer.safaricom.co.ke and request production (Go Live) access for your till's **store number** (head office number).
2. Fill in `DARAJA_*`, `SITE_URL` and `C2B_CALLBACK_SECRET` in `.env`, then run `npm run c2b:register` once.
3. Safaricom will now POST every payment to `/api/payments/c2b/confirm`. That path deliberately avoids the word "mpesa", which Daraja rejects in callback URLs.
4. In **/admin**, set **"Require Safaricom (Daraja) match" → Yes**. An unlock then only succeeds if Safaricom actually reported that code with that amount.

## Important before launch
- **Legal check.** If the content will be sexually explicit, get Kenyan legal advice first. Section 181 of the Penal Code and the Computer Misuse and Cybercrimes Act restrict obscene publications. Safaricom's merchant terms may also prohibit adult content on a Lipa na M-PESA till, which could get the till suspended.
- **Uploader consent and age.** Uploads are held for admin review, and uploaders must confirm everyone shown is 18+ and consented. For a public creator platform, add ID verification (e.g. Smile ID) for anyone who uploads. Keep signed consent forms for admin-created profiles.
- Signed video links expire after 2 hours. A determined buyer can still screen-record. For real DRM, move videos to Mux or Cloudflare Stream.
- Chat uses polling, which is fine for a few hundred concurrent users. For more, switch to Supabase Realtime.

## Project map
```
app/
  page.tsx              feed + search + "live now"
  register, login       18+ sign-up with consent / log in
  v/[id]                video page: preview, unlock form, comments, report
  u/[username]          profile + videos
  upload                upload (admins can pick which profile)
  chat, chat/[username] direct messages
  live, live/[id]       go live / watch (LiveKit)
  admin                 dashboard
  api/...               all backend routes
lib/mpesa.ts            SMS parser
app/api/videos/[id]/unlock/route.ts   payment verification rules
prisma/schema.prisma    database schema
```
