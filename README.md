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

After the one-time setup below, every `git push` updates **crosscreative.netlify.app** automatically.

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
