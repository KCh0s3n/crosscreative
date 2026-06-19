# Cross Creative Portfolio

Premium portfolio rebuild with an eXPD8-inspired **How I work** scrollytelling section.

## Preview locally

Open `index.html` in a browser, or run a local server:

```powershell
cd "c:\Users\Khai\Desktop\new idea\crosscreative"
python -m http.server 8080
```

Then visit `http://localhost:8080`

## Deploy to Netlify (auto-deploy via Git)

> **If Netlify shows "credit usage exceeded"** — deploys stop until you add credits. Your GitHub code still updates; the live URL just freezes on old files. Use one of the **free alternatives** below (no upgrade needed).

After the one-time setup below, every `git push` updates **crosscreative.netlify.app** automatically.

### Free alternatives (no Netlify upgrade)

Pick one — all connect to the same GitHub repo (`KCh0s3n/crosscreative`, branch `main`). No build command; publish the repo root (`.`).

#### Option A — New Netlify account (fresh free credits)

1. Sign up at [netlify.com](https://www.netlify.com) with a **different email** (new account = new credit allowance).
2. **Add new site** → **Import an existing project** → **GitHub** → select `crosscreative`.
3. Settings: **Branch** `main`, **Build command** *(empty)*, **Publish directory** `.`
4. Deploy. You get a new URL like `something-random.netlify.app`.
5. Optional: **Domain management** → add a custom domain later.

#### Option B — Vercel (recommended)

1. Sign up at [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Import `KCh0s3n/crosscreative` from GitHub.
3. **Framework Preset:** Other · **Root Directory:** `./` · **Build Command:** *(leave empty)* · **Output:** `.`
4. Deploy. URL will be like `crosscreative.vercel.app`.
5. Every `git push` to `main` auto-deploys.

#### Option C — Cloudflare Pages

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select `crosscreative`, branch `main`, **Build command** empty, **Build output** `/`.
3. Deploy. URL like `crosscreative.pages.dev`.

#### Check the new site has the latest code

View page source and look for:

```html
<!-- cc-build: e689013-mobile-v2 -->
```

Also confirm CSS loads as `styles.css?v=17` (not plain `styles.css` with no version).

### One-time setup

1. **Create a GitHub repo** (private or public) named e.g. `crosscreative`.
2. **Push this folder** from PowerShell:

```powershell
cd "c:\Users\Khai\Desktop\new idea\crosscreative"
git init
git add .
git commit -m "Initial Cross Creative portfolio"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/crosscreative.git
git push -u origin main
```

3. **Link Netlify to GitHub**
   - Open [Netlify](https://app.netlify.com) → your **crosscreative** site
   - **Site configuration** → **Build & deploy** → **Link repository**
   - Choose **GitHub**, authorise Netlify, select the `crosscreative` repo
   - Build settings (should auto-detect from `netlify.toml`):
     - **Branch:** `main`
     - **Build command:** *(leave empty)*
     - **Publish directory:** `.`
   - Deploy. Your existing URL stays the same.

### Day-to-day updates

```powershell
cd "c:\Users\Khai\Desktop\new idea\crosscreative"
git add .
git commit -m "Describe your change"
git push
```

Netlify rebuilds in ~30 seconds. No drag-and-drop needed.

## Features

- **Sticky scroll process** — 7 steps with progress rail (like [eXPD8 How we work](https://www.expd8.co.uk/how-we-work/))
- **Hero statement swaps** on scroll — “I listen first”, “I design with purpose”, etc.
- **Lenis** smooth scrolling + **GSAP ScrollTrigger** scrubbed animations
- **Reduced-motion** fallback for accessibility
- **Mobile** — stacked steps with tap-to-jump progress rail

## Files

- `index.html` — page structure
- `css/styles.css` — premium dark/gold design system
- `js/main.js` — scroll animations and interactions
