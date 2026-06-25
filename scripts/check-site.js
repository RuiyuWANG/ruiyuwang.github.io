const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const htmlPages = ["index.html", "publications.html", "cv.html", "life.html", "blog.html"];
const sourceFiles = [
  ...htmlPages,
  "css/portfolio.css",
  "js/site.js",
  "js/research-keywords.js",
  "scripts/build-life-gallery.js",
  "scripts/build-research-keywords.js"
];
const referenceSourceFiles = [
  ...htmlPages,
  "css/portfolio.css"
];
const requiredFiles = [
  ...htmlPages,
  "favicon.svg",
  "css/portfolio.css",
  "js/site.js",
  "js/research-keywords.js",
  "data/research-keywords.json",
  "scripts/build-life-gallery.js",
  "scripts/build-research-keywords.js",
  "pdfs/CV_Ruiyu_Wang.pdf"
];
const externalRefPattern = /^(?:https?:|mailto:|tel:|data:|javascript:|\/\/)/i;
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

const toRootPath = (filePath) => path.join(root, filePath);
const exists = (filePath) => fs.existsSync(toRootPath(filePath));

const cleanRef = (ref) => {
  const stripped = ref.trim().split("#")[0].split("?")[0].replace(/^\.\//, "");
  return stripped ? decodeURIComponent(stripped) : "";
};

const localRef = (fromFile, rawRef, options = {}) => {
  if (!rawRef || rawRef.startsWith("#") || externalRefPattern.test(rawRef)) {
    return null;
  }

  const cleaned = cleanRef(rawRef);
  if (!cleaned || cleaned.startsWith("/")) {
    return null;
  }

  if (options.fromCss) {
    return path.normalize(path.join(path.dirname(fromFile), cleaned)).replace(/\\/g, "/");
  }

  return path.normalize(cleaned).replace(/\\/g, "/");
};

const fail = (message, details = []) => {
  console.error(message);
  details.forEach((detail) => console.error(`  - ${detail}`));
  process.exit(1);
};

const missingRequired = requiredFiles.filter((file) => !exists(file));
if (missingRequired.length) {
  fail("Missing required site files:", missingRequired);
}

const refs = new Map();
referenceSourceFiles.forEach((file) => {
  const text = fs.readFileSync(toRootPath(file), "utf8");

  for (const match of text.matchAll(/\b(?:href|src|poster)=["']([^"']+)["']/g)) {
    const ref = localRef(file, match[1]);
    if (ref) {
      refs.set(ref, file);
    }
  }

  if (file.endsWith(".css")) {
    for (const match of text.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      const ref = localRef(file, match[1], { fromCss: true });
      if (ref) {
        refs.set(ref, file);
      }
    }
  }
});

const missingRefs = Array.from(refs.entries())
  .filter(([ref]) => !exists(ref))
  .map(([ref, source]) => `${ref} referenced from ${source}`);
if (missingRefs.length) {
  fail("Missing referenced files:", missingRefs);
}

const linkedLegacyAssets = Array.from(refs.keys()).filter((ref) => (
  ref.includes("bootstrap")
  || ref.includes("jquery")
  || ref.includes("owl.")
  || ref.includes("clean-blog")
  || ref.includes("style2.css")
  || ref.includes("bib-list")
));
if (linkedLegacyAssets.length) {
  fail("Legacy template assets are still linked:", linkedLegacyAssets);
}

const visibleBlogLinks = htmlPages
  .filter((file) => fs.readFileSync(toRootPath(file), "utf8").includes("href=\"blog.html\""));
if (visibleBlogLinks.length) {
  fail("Blog is hidden for now, but these pages still link to it:", visibleBlogLinks);
}

const ocDir = toRootPath("images/oc");
const expectedLifePhotos = fs.readdirSync(ocDir)
  .filter((name) => imageExtensions.has(path.extname(name).toLowerCase()))
  .filter((name) => !/^profile[_-]/i.test(name))
  .map((name) => `images/oc/${name}`)
  .sort();
const lifeHtml = fs.readFileSync(toRootPath("life.html"), "utf8");
const renderedLifePhotos = Array.from(lifeHtml.matchAll(/<img src="(images\/oc\/[^"]+)"/g))
  .map((match) => cleanRef(match[1]))
  .sort();
const missingLifePhotos = expectedLifePhotos.filter((file) => !renderedLifePhotos.includes(file));
const extraLifePhotos = renderedLifePhotos.filter((file) => !expectedLifePhotos.includes(file));
const duplicateLifePhotos = renderedLifePhotos.filter((file, index) => renderedLifePhotos.indexOf(file) !== index);

if (missingLifePhotos.length || extraLifePhotos.length || duplicateLifePhotos.length) {
  fail("Life gallery is not synchronized with images/oc:", [
    ...missingLifePhotos.map((file) => `missing ${file}`),
    ...extraLifePhotos.map((file) => `extra ${file}`),
    ...duplicateLifePhotos.map((file) => `duplicate ${file}`)
  ]);
}

console.log(`ok: ${sourceFiles.length} source files, ${refs.size} local references, ${renderedLifePhotos.length} life photos`);
