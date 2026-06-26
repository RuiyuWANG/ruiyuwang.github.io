const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "publications.json");
const indexPath = path.join(root, "index.html");
const publicationsPath = path.join(root, "publications.html");

const publications = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const escapeAttribute = (value) => escapeHtml(value).replace(/`/g, "&#96;");

const slugify = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const plainText = (value) => String(value || "").replace(/<[^>]*>/g, " ");

const isExternal = (url) => /^(https?:)?\/\//i.test(url);

const getTopics = (paper) => unique([
  ...(paper.tags || []).map(slugify),
  slugify(paper.type)
]);

const getSearch = (paper) => unique([
  paper.title,
  paper.authors,
  paper.venue,
  paper.venueShort,
  paper.year,
  paper.type,
  ...(paper.tags || []),
  ...(paper.keywords || [])
]).join(" ").toLowerCase();

const renderLinks = (paper) => {
  const links = paper.links || [];
  const renderedLinks = links.map((link) => {
    const target = isExternal(link.url) ? " target=\"_blank\" rel=\"noopener\"" : "";
    return `<a href="${escapeAttribute(link.url)}"${target}>${escapeHtml(link.label || "Link")}</a>`;
  });

  renderedLinks.push("<button class=\"publication-toggle\" type=\"button\" aria-expanded=\"false\" data-collapsed-label=\"Abstract\" data-expanded-label=\"Hide abstract\">Abstract</button>");

  return renderedLinks.join("\n\t\t\t\t\t\t\t");
};

const renderImage = (paper, className, indent) => {
  if (!paper.image) {
    return "";
  }

  return [
    `${indent}<figure class="${className}">`,
    `${indent}\t<img src="${escapeAttribute(paper.image)}" alt="${escapeAttribute(paper.title)} teaser" loading="lazy">`,
    `${indent}</figure>`
  ].join("\n");
};

const renderSelectedCard = (paper) => {
  const topics = getTopics(paper).join(" ");
  const search = getSearch(paper);
  const featured = paper.featured ? " data-featured-publication=\"true\"" : "";
  const media = renderImage(paper, "publication-thumb", "\t\t\t\t\t\t");
  const mediaClass = paper.image ? "" : " no-media";

  return `<article class="publication-card${mediaClass}" data-paper-id="${escapeAttribute(paper.id)}"${featured} data-topic="${escapeAttribute(topics)}" data-search="${escapeAttribute(search)}">
${media}
\t\t\t\t\t\t<div class="publication-body">
\t\t\t\t\t\t\t<div class="publication-kicker">
\t\t\t\t\t\t\t\t<span>${escapeHtml(paper.venueShort || paper.venue || paper.year)}</span>
\t\t\t\t\t\t\t\t<span>${escapeHtml(paper.type || "Publication")}</span>
\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t<h3>${escapeHtml(paper.title)}</h3>
\t\t\t\t\t\t\t<p>${escapeHtml(paper.authors)}</p>
\t\t\t\t\t\t\t<div class="publication-links">
\t\t\t\t\t\t\t\t${renderLinks(paper)}
\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t<div class="publication-details publication-abstract" hidden>
\t\t\t\t\t\t\t\t<p>${escapeHtml(paper.abstract || "Abstract coming soon.")}</p>
\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t</div>
\t\t\t\t\t</article>`;
};

const renderFullItem = (paper) => {
  const topics = getTopics(paper).join(" ");
  const search = getSearch(paper);
  const media = renderImage(paper, "publication-thumb", "\t\t\t\t\t");
  const mediaClass = paper.image ? " has-media" : " no-media";

  return `<article class="publication-list-item${mediaClass}" data-publication-item data-paper-id="${escapeAttribute(paper.id)}" data-topic="${escapeAttribute(topics)}" data-search="${escapeAttribute(search)}">
${media}
\t\t\t\t\t<div class="publication-content">
\t\t\t\t\t\t<h3>${escapeHtml(paper.title)}</h3>
\t\t\t\t\t\t<p>${escapeHtml(paper.authors)}</p>
\t\t\t\t\t\t<p><em>${escapeHtml(paper.venue || paper.venueShort || "Publication venue")}</em></p>
\t\t\t\t\t\t<div class="publication-links">
\t\t\t\t\t\t\t${renderLinks(paper)}
\t\t\t\t\t\t</div>
\t\t\t\t\t\t<div class="publication-details publication-abstract" hidden>
\t\t\t\t\t\t\t<p>${escapeHtml(paper.abstract || "Abstract coming soon.")}</p>
\t\t\t\t\t\t</div>
\t\t\t\t\t</div>
\t\t\t\t</article>`;
};

const renderFullSections = () => {
  const byYear = new Map();

  publications
    .slice()
    .sort((a, b) => Number(b.year || 0) - Number(a.year || 0) || String(a.title).localeCompare(String(b.title)))
    .forEach((paper) => {
      const year = String(paper.year || "Forthcoming");
      if (!byYear.has(year)) {
        byYear.set(year, []);
      }
      byYear.get(year).push(paper);
    });

  return Array.from(byYear.entries()).map(([year, papers]) => `<section class="publication-list-section publication-year-section" data-publication-section aria-labelledby="publications-${escapeAttribute(year)}-title">
\t\t\t<div class="publication-year-divider">
\t\t\t\t<h2 id="publications-${escapeAttribute(year)}-title">${escapeHtml(year)}</h2>
\t\t\t</div>
\t\t\t<div class="publication-list">
\t\t\t\t${papers.map(renderFullItem).join("\n")}
\t\t\t</div>
\t\t</section>`).join("\n\n\t\t");
};

const replaceBlock = (html, startMarker, endMarker, contents) => {
  const pattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
  if (!pattern.test(html)) {
    throw new Error(`Could not find generated block ${startMarker}`);
  }
  return html.replace(pattern, `${startMarker}\n${contents}\n\t\t\t\t\t\t\t${endMarker}`);
};

const selectedContents = publications.map(renderSelectedCard).join("\n");
const fullContents = renderFullSections();

let indexHtml = fs.readFileSync(indexPath, "utf8");
indexHtml = replaceBlock(indexHtml, "<!-- PUBLICATIONS_SELECTED_START -->", "<!-- PUBLICATIONS_SELECTED_END -->", selectedContents);
fs.writeFileSync(indexPath, indexHtml);

let publicationsHtml = fs.readFileSync(publicationsPath, "utf8");
publicationsHtml = replaceBlock(publicationsHtml, "<!-- PUBLICATIONS_FULL_START -->", "<!-- PUBLICATIONS_FULL_END -->", fullContents);
fs.writeFileSync(publicationsPath, publicationsHtml);

console.log(`Rendered ${publications.length} publication${publications.length === 1 ? "" : "s"} into index.html and publications.html.`);
