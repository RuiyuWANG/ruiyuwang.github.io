# Personal Website

Static personal website, hosted at `ruiyuwang.github.io`.

The root `.nojekyll` file is required because the Life gallery includes image
filenames that start with `_`; GitHub Pages/Jekyll otherwise hides those files.

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

To preview the site locally, run:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

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
regular photo stack.

The build script also generates compressed WebP thumbnails in `images/oc-thumbs`.
The page loads those thumbnails for speed, while each click still opens the
original full-size image in the lightbox. The script precomputes a four-column
layout and writes it into `life.html`, so the online gallery does not reshuffle
while large images are loading.

After adding or removing photos, run:

```sh
npm run build:life
```

The script skips files whose names start with `profile_` or `profile-`.

## Logo and favicon

The browser tab icon and the header logo both use `favicon.svg`. To update the
site mark, replace that file and update the version query attached to
`favicon.svg` in the HTML pages, for example `?v=20260626-rw-logo`. The version
query helps GitHub Pages and browsers stop showing an old cached icon.

## Privacy notes

Keep raw CVs, private PDFs, source documents,
unselected images, notes, and local-only material in the ignored folders listed
in `.gitignore` such as `.pdfs/`, `pdfs/private/`, `images/private/`, and
`images/originals/`.

Only put photos in `images/oc` when they are intended to be public on the Life
page. `.gitignore` prevents accidental raw/private files from being added, but
it does not remove metadata from images that are already committed.
