# Academy share image

`src/app/opengraph-image.png` and `src/app/twitter-image.png` (1200x630) are the
link previews for academy.pursuearete.com. Next.js serves them through its
metadata file convention, so every route inherits them unless a segment adds its
own image file. Alt text lives beside them in the matching `.alt.txt` files.

Both are rendered from `og/share.html`. Edit that file, then re-render from
`academy/web` (Git Bash) and copy the result over the Twitter image:

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 \
  --virtual-time-budget=8000 --user-data-dir="$TEMP/og-chrome" \
  --screenshot="$(cygpath -w "$PWD")\src\app\opengraph-image.png" \
  "file:///$(cygpath -m "$PWD")/og/share.html"
cp src/app/opengraph-image.png src/app/twitter-image.png
```

LinkedIn and others cache previews; re-scrape in LinkedIn Post Inspector after a change.
