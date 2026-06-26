const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data", "research-keywords.json");
const publicationsPath = path.join(root, "data", "publications.json");
const outputPath = path.join(root, "js", "research-keywords.js");

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const publications = fs.existsSync(publicationsPath)
  ? JSON.parse(fs.readFileSync(publicationsPath, "utf8"))
  : [];

const slugify = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const publicationPapers = {};
publications.forEach((paper) => {
  if (!paper.id) {
    return;
  }

  publicationPapers[paper.id] = unique([
    ...(paper.keywords || []).map(slugify),
    ...(paper.tags || []).map(slugify)
  ]);
});

const papers = {
  ...publicationPapers,
  ...(source.papers || {})
};
const paperEntries = Object.entries(papers);
const counts = new Map();
const keywordToPapers = {};

paperEntries.forEach(([, keywords]) => {
  new Set(keywords.map(slugify)).forEach((keyword) => {
    counts.set(keyword, (counts.get(keyword) || 0) + 1);
  });
});

paperEntries.forEach(([paperId, keywords]) => {
  new Set(keywords.map(slugify)).forEach((keyword) => {
    if (!keywordToPapers[keyword]) {
      keywordToPapers[keyword] = [];
    }
    keywordToPapers[keyword].push(paperId);
  });
});

const maxCount = Math.max(...counts.values(), 1);
const minCount = Math.min(...counts.values(), maxCount);
const spread = Math.max(1, maxCount - minCount);
const groupColors = {
  robotics: "#0f766e",
  vision: "#2563eb",
  "data-efficiency": "#1d4ed8",
  generalization: "#a13d1c",
  visuomotor: "#0f766e",
  reasoning: "#6d28d9",
  language: "#6d28d9",
  systems: "#475569",
  evaluation: "#7c3aed",
  other: "#334155"
};

const toLabel = (slug) => slug.replace(/-/g, " ");

const stableHash = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

const keywordDefinitions = new Map();

(source.keywords || []).forEach((keyword) => {
  if (keyword.slug) {
    keywordDefinitions.set(slugify(keyword.slug), {
      ...keyword,
      slug: slugify(keyword.slug)
    });
  }
});

counts.forEach((count, slug) => {
  if (!keywordDefinitions.has(slug)) {
    keywordDefinitions.set(slug, {
      slug,
      label: toLabel(slug),
      group: "other"
    });
  }
});

const keywords = Array.from(keywordDefinitions.values())
  .map((keyword) => {
    const count = counts.get(keyword.slug) || 0;
    const ratio = count ? (count - minCount) / spread : 0;
    const scale = 0.88 + ratio * 1.87;
    const explicitOrder = Number(keyword.order);

    return {
      slug: keyword.slug,
      label: keyword.label || toLabel(keyword.slug),
      group: keyword.group || "other",
      count,
      scale: Number(scale.toFixed(2)),
      sortOrder: Number.isFinite(explicitOrder) ? explicitOrder : stableHash(keyword.slug),
      highlight: Boolean(keyword.highlight),
      color: keyword.color || groupColors[keyword.group] || "#334155"
    };
  })
  .filter((keyword) => keyword.count > 0)
  .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
  .map((keyword, index) => {
    const { sortOrder, ...publicKeyword } = keyword;
    return {
      ...publicKeyword,
      order: index + 1
    };
  });

const data = {
  generatedAt: new Date().toISOString(),
  keywords,
  papers,
  keywordToPapers
};

const contents = `window.RESEARCH_KEYWORD_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(outputPath, contents);

console.log(`Wrote ${path.relative(root, outputPath)} with ${keywords.length} keywords for ${paperEntries.length} papers.`);
