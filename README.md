# T-Green website

One static page in Russian. Everything that gets published lives in `site/`:

```
site/index.html          all text, links and captions
site/assets/css/site.css colours, fonts, layout (colours are at the top, in :root)
site/assets/js/site.js   photo viewer, video behaviour, copy buttons, small animations
site/assets/img|video|fonts
```

No build step is needed to change text. Open `site/index.html` in any editor; each section starts with a comment such as `<!-- 3. Что мы делаем -->`.

## Change text

Edit the Russian text directly in `site/index.html`.

- `&nbsp;` is a non-breaking space; it keeps short words like «в», «и», «с» attached to the next word. Keep it when you edit nearby.
- Page title and link-preview text: `<title>` and the `description` / `og:` tags at the top.

## Change contacts and links

Search `site/index.html` for these and replace every match:

- Telegram: `https://t.me/+Zo_IBpd2KXM1MzM6` (3 places: two buttons and the contacts list)
- Team e-mail: `tgreen0team@gmail.com` (the `mailto:` link, the visible address, the copy button's `data-copy` and `aria-label`)
- Founder e-mail: `aostriagin@gmail.com` (same four spots)

## Change photos and videos

1. Put the original in `media-source/`.
2. Add it to the `photos` list in `scripts/build-media.mjs`, then run `npm run media`. This writes resized WebP and JPEG versions into `site/assets/img/`.
3. Copy one of the `<li class="board-item">` blocks in `site/index.html` and change the file names, the `alt` description and the `<figcaption>`.

Only use real T-Green photos here, with captions that say what actually happened.

Videos: `swift scripts/transcode.swift <in.mp4> site/assets/video/<name>.mp4 950000` makes a web-friendly MP4. `swift scripts/frame.swift <video> <seconds> media-source/<poster>.jpg` saves a poster frame.

After rebuilding images, run `.claude/skills/impeccable/scripts/impeccable embed-prompt <image> --prompt "Origin: ..."` for new files so each image records where it came from.

## Preview and check

Needs Node.js (installed in `~/.local/node`) and Python 3.

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm run serve      # http://127.0.0.1:4321
npm run verify     # in a second terminal: Playwright checks + screenshots in .impeccable/review/
```

The checks never open Telegram and never send e-mail.

## Publishing

The site is hosted on GitHub Pages. Every push to the `main` branch runs `.github/workflows/pages.yml`, which publishes the `site/` folder; the new version is live a minute or two later. To publish a change:

```bash
git add -A
git commit -m "Describe the change"
git push
```

If the address ever changes (for example a custom domain), update `og:url` and `og:image` at the top of `site/index.html`.

Two supplied photos (the factory's printed banner and photo collage) are deliberately not used and are kept out of the repository by `.gitignore`.
