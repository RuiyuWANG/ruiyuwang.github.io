# Ruiyu Wang Website

Static personal website for `ruiyuwang.github.io`.

## Project structure

- `index.html`: homepage, profile sidebar, selected publications, education, service, and contact.
- `publications.html`: full publication list.
- `cv.html`: scrollable CV page rendered from public SVG pages, with a PDF download link.
- `life.html`: generated photo gallery page.
- `blog.html`: hidden blog/template page kept for future use.
- `css/portfolio.css`: main site styling.
- `js/site.js`: interactive behavior for filters, lightbox, copy email, publication abstracts, and the blog preview.
- `data/research-keywords.json`: editable paper-to-keyword dictionary.
- `js/research-keywords.js`: generated browser data for the homepage keyword cloud.
- `scripts/`: build and audit helpers.

## Local preview

Use a high port if another local server is already running:

```sh
python3 -m http.server 8001
```

Then open `http://localhost:8001`.

## Checks

Run the local audit before pushing:

```sh
npm run check
```

This checks JavaScript syntax, missing local asset references, hidden Blog links,
and whether `life.html` is synchronized with `images/oc`.

## Research keyword cloud

The homepage word cloud is generated from `data/research-keywords.json`.
Each homepage publication card has a `data-paper-id`. The JSON `papers` object is
the paper-to-keyword dictionary used for exact click lookup: clicking one word
shows only papers whose dictionary entry contains that keyword.

The build script also derives keyword frequencies and a keyword-to-paper lookup
for the browser. If a paper uses a new keyword slug that is not listed in
`keywords`, the script will still include it with a generated label.

After adding or editing paper keywords, run:

```sh
npm run build:keywords
```

This refreshes `js/research-keywords.js`, which is loaded by `index.html`.

## Life photo gallery

The Life page gallery is generated from the files in `images/oc`.
Profile photos are not included. Wide panoramic images are placed before the
regular masonry-style photo stack.

After adding or removing photos, run:

```sh
npm run build:life
```

The script skips files whose names start with `profile_` or `profile-`.

## Privacy notes

This is a public GitHub Pages site. Keep raw CVs, private PDFs, source documents,
unselected images, notes, and local-only material in the ignored folders listed
in `.gitignore` such as `.pdfs/`, `pdfs/private/`, `images/private/`, and
`images/originals/`.

Only put photos in `images/oc` when they are intended to be public on the Life
page. `.gitignore` prevents accidental raw/private files from being added, but
it does not remove metadata from images that are already committed.
