# Academic Portfolio Website Template

A static, GitHub Pages friendly academic website template with a profile sidebar,
selected publications, interactive keyword cloud, full publication page, CV page,
photo gallery, contact section, and hidden Markdown blog template.

The branch is intentionally filled with pseudo content. Replace the demo text,
SVGs, and publication data with your own public material before publishing.

The root `.nojekyll` file is kept so GitHub Pages serves image filenames that
begin with `_`, which is common for camera exports.

## Local Preview

For normal preview:

```sh
python3 -m http.server 8000
```

For preview plus in-place text editing:

```sh
npm run dev
```

Then open:

```text
http://localhost:8000/?edit=1
```

The edit mode is only enabled on localhost. It saves text into
`data/site-content.json` when served by `npm run dev`. If you use a plain static
server, the editor downloads a JSON backup instead because browsers cannot write
files directly.

## Project Structure

- `index.html`: homepage, profile sidebar, keyword cloud, selected publications,
  education map, service, and contact.
- `publications.html`: generated full publication list.
- `cv.html`: scrollable CV page rendered from public SVG pages.
- `life.html`: generated photo gallery page.
- `blog.html`: hidden Markdown blog/template page kept for future use.
- `css/portfolio.css`: main site styling.
- `js/site.js`: filters, keyword cloud behavior, abstracts, lightbox, copy
  email, and Markdown preview.
- `js/template-editor.js`: localhost-only in-place text editing.
- `data/site-content.json`: editable homepage/page text used by edit mode.
- `data/publications.json`: source of truth for publications.
- `data/research-keywords.json`: highlighted keyword definitions.
- `js/research-keywords.js`: generated browser data for the keyword cloud.
- `scripts/`: build, import, local server, and audit helpers.

## Publications

Edit `data/publications.json` to add, remove, or update papers. Each paper can
include:

- `id`: stable unique slug.
- `title`, `authors`, `year`, `venue`, `venueShort`, `type`.
- `featured`: `true` to show in the default homepage selection.
- `image`: optional teaser path.
- `tags`: broad filters used on the publication page.
- `keywords`: exact lookup words for the homepage word cloud.
- `abstract`: text shown by the Abstract button.
- `links`: paper, code, website, demo, or project links.

After editing publications, run:

```sh
npm run build:publications
npm run build:keywords
```

or run everything:

```sh
npm run build
```

## Import From Google Scholar

Google Scholar has no official public API and can block automated requests. The
template includes a best-effort importer that writes to `data/publications.json`
and rebuilds the generated publication/keyword files.

Try direct import:

```sh
npm run import:scholar -- --profile "https://scholar.google.com/citations?user=SCHOLAR_ID&hl=en"
```

If Google blocks the request, open the profile in your browser, save the page as
HTML, and run:

```sh
npm run import:scholar -- --from-html scholar-profile.html
```

By default, imported papers are merged with existing papers by title. To replace
the demo list entirely:

```sh
npm run import:scholar -- --profile "https://scholar.google.com/citations?user=SCHOLAR_ID&hl=en" --replace
```

Imported entries usually need manual cleanup because Scholar profile rows do not
include abstracts, PDFs, teaser images, or project links.

## Keyword Cloud

The homepage word cloud is generated from paper keywords and tags in
`data/publications.json`. The highlighted words and optional display labels live
in `data/research-keywords.json`.

Clicking a word shows only publications whose paper-to-keyword dictionary
contains that word. The dictionary is rebuilt by:

```sh
npm run build:keywords
```

## Photo Gallery

The Life page gallery is generated from public images in `images/oc`. The script
supports `jpg`, `jpeg`, `png`, `gif`, `webp`, and `svg`. Wide images are placed
first; regular images are pre-balanced into a four-column desktop layout so the
online page keeps a stable order while loading.

For raster images, `npm run build:life` creates compressed WebP thumbnails in
`images/oc-thumbs` and keeps the original image for the click-to-view full-size
lightbox. SVG demo images are used directly and do not need thumbnails.

After adding or removing photos:

```sh
npm run build:life
```

The script skips files whose names start with `profile_` or `profile-`.

## CV

Replace the demo SVG pages in `images/cv-pages/` with exported pages from your
own public CV. If you want a PDF download, add a public PDF in `pdfs/` and link
to it from `cv.html`.

## Checks

Run the local audit before pushing:

```sh
npm run check
```

This checks JavaScript syntax, required template files, missing local references,
hidden Blog links, and whether `life.html` is synchronized with `images/oc`.

## Privacy Notes

Keep private CV drafts, raw PDFs, source documents, notes, raw photos, and
unselected images in ignored folders listed in `.gitignore`, such as `.pdfs/`,
`pdfs/private/`, `images/private/`, and `images/originals/`.

Only put files in public folders when they are intended to be published by
GitHub Pages. The ignore file does not strip metadata from images that are
already committed.
