# Arete — Marketing Site

Multi-file source for the Arete landing page. No build step required — everything runs in the browser via Babel standalone.

## Structure

```
Arete.html              ← Main entry point. Open this in a browser.
styles.css              ← All site styles (midnight + gold theme)
components/
  counselors-data.jsx   ← Cabinet data (10 counselors, quotes, bios)
  ornaments.jsx         ← Gold rules, monogram, pediments, laurel
  marble-bust.jsx       ← Counselor portrait renderer (3 variants)
  ios-frame.jsx         ← iPhone bezel + keyboard + status bar
  app-screens.jsx       ← Arete app mocks (home, morning, cabinet)
  site-top.jsx          ← Page shell, top bar, hero variants, cabinet, day-in-life
  site-bottom.jsx       ← Features, scrolls, principles, pricing, FAQ, footer
assets/
  images/               ← (empty — drop counselor portraits here)
```

## Running locally

Serve the folder from any static server — Babel needs to fetch the `.jsx` files via HTTP:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then open http://localhost:8000/Arete.html

Opening the file directly (file://) will NOT work — the browser blocks cross-origin `.jsx` loading.

## Deploying

This is a pure static site. Drop the folder on any host:

- **GitHub Pages** — push to a repo, Settings → Pages → deploy from branch
- **Netlify / Vercel** — drag folder in, no build config needed
- **S3 / Cloudflare Pages** — upload as-is

## Converting to a proper React app

The JSX files are standard React function components (no TypeScript, no imports — components share scope via `window`). To move to Vite/Next/CRA:

1. Create a new Vite React project: `npm create vite@latest arete-site -- --template react`
2. Copy `components/*.jsx` into `src/components/`
3. Replace the `window.AreteSite = ...` exports with `export default AreteSite` / named exports
4. Add `import` statements at the top of each file
5. Move `styles.css` to `src/styles.css` and import it in `main.jsx`
6. Mount: `<AreteSite />` from `src/main.jsx`

## Tech notes

- **Fonts:** Cormorant Garamond (serif display), Inter (UI), JetBrains Mono (kickers). Loaded from Google Fonts.
- **Colors:** Midnight `#0a1020`, gold `#c9a84c`, ivory `#f4ead5`. Defined as CSS variables in `styles.css`.
- **Motion:** `.reveal` class + IntersectionObserver for scroll animations. No animation libraries.
- **Tweaks panel:** Toggle hero variant (editorial / monumental) and bust style. Hooks into the host toolbar via `postMessage`.

## License

Your project. Do what you want.
