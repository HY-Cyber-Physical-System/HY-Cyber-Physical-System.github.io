# CPSLAB — Hanyang University ERICA

Mobile-friendly, static website for the Cyber-Physical Systems Laboratory.

**Website:** https://hy-cyber-physical-system.github.io/
**Content source:** https://cpslab.hanyang.ac.kr/
**Snapshot:** 2026-09-17

## Publish

GitHub Pages serves the `main` branch, repository root (`/`). `.nojekyll` keeps the generated HTML and assets unchanged. There is no backend, runtime dependency, or build service required to serve the site.

Content is a reviewed snapshot, **not an automatic live mirror**. Edit `content/site.json` and/or the templates in `scripts/build.py`, then regenerate and validate:

```sh
python3 scripts/build.py
python3 scripts/validate.py
node --check assets/site.js
git diff --check
```

Commit the updated source **and generated HTML** to `main`. GitHub Pages publishes that commit. Preview locally with `python3 -m http.server 8000`.

## Content and design

- Home: laboratory introduction, announcements, research areas, recent publications, and contact information.
- People: faculty, postdoctoral researchers, members, and alumni.
- Research: six research areas and three full research detail pages.
- Publications: all seven source categories, preserving original citations and category anchors.
- Projects: ongoing and past lists, with English and Korean descriptions.
- Courses: archived course listings and the Operating Systems 2019 detail page.
- Album: all source albums and available photographs, with existing category filtering.
- Responsive navigation, single-column mobile records, semantic headings, keyboard focus, reduced-motion support, and content available without JavaScript.
- Images are copied locally, resized to at most 1600 px, and encoded as WebP. Text content and image dimensions are present in the HTML; offscreen images load lazily.

The original site's author names, dates, project classifications, historical entries, and inconsistent spellings are preserved rather than inferred. The courses page is explicitly labeled as an archive. Review the source data if publication metadata or project status needs correction.

## Re-importing the source (optional)

`scripts/import_site.py` is a one-time migration tool, separate from build and deployment. It accesses only the public laboratory website and requires `beautifulsoup4` and `Pillow`. It writes `content/site.json` and local media. Review the resulting diff before publishing. It caches downloads under `/tmp/cps-source-cache`; remove that cache before an intentional refresh.

```sh
python3 -m venv .venv
.venv/bin/pip install -r scripts/import-requirements.txt
.venv/bin/python scripts/import_site.py
.venv/bin/python scripts/optimize_images.py
python3 scripts/build.py
python3 scripts/validate.py
```

## Migration boundaries

- Six linked paper PDFs on the original site return HTTP 404. Citations are retained; dead download links are labeled “Source PDF unavailable.” Checks are recorded in `content/migration.json`. Restore those links in that file only after the PDFs are available.
- The 2019 course announcement and course login require authentication on the original site; these intentionally remain external links. No credentials, login service, or restricted material is migrated.
- All 41 album photographs and all available profile/research images are served locally. Responsive 400/800 px variants reduce mobile image transfers. Fonts and their SIL Open Font Licenses are local in `assets/fonts/`.

## Domain

The initial deployment uses the GitHub Pages address. No `CNAME` is added, and the current `cpslab.hanyang.ac.kr` DNS/site remains unchanged. A later domain migration requires control of the university DNS and GitHub Pages custom-domain settings; update canonical URLs and the sitemap in `scripts/build.py` when that migration is authorized.

## Attribution

Research content, member photographs, and album photographs originate from the laboratory's existing website and retain their original ownership. This repository does not grant a new license to those assets.
