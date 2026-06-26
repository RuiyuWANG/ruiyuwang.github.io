const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const lifePath = path.join(root, "life.html");
const photoDir = path.join(root, "images", "oc");
const thumbnailDir = path.join(root, "images", "oc-thumbs");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const wideRatio = 2.4;
const excludedPhotoPattern = /^profile[_-]/i;
const regularThumbnailSize = 760;
const wideThumbnailSize = 1800;
const eagerPhotosPerColumn = 4;

const toSitePath = (absolutePath) => {
  const relativePath = path.relative(root, absolutePath).split(path.sep);
  return relativePath.map((part) => encodeURIComponent(part)).join("/");
};

const getDimensions = (absolutePath) => {
  const output = execFileSync("identify", ["-quiet", "-format", "%w %h", absolutePath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });
  const [width, height] = output.trim().split(/\s+/).map(Number);

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(`Could not read image dimensions for ${absolutePath}`);
  }

  return { width, height };
};

const thumbNameFor = (name) => `${path.basename(name, path.extname(name))}.webp`;

const ensureThumbnail = (photo) => {
  fs.mkdirSync(thumbnailDir, { recursive: true });

  const sourcePath = path.join(photoDir, photo.name);
  const thumbnailPath = path.join(thumbnailDir, thumbNameFor(photo.name));
  const size = photo.isWide ? wideThumbnailSize : regularThumbnailSize;
  const needsUpdate = !fs.existsSync(thumbnailPath)
    || fs.statSync(thumbnailPath).mtimeMs < fs.statSync(sourcePath).mtimeMs;

  if (needsUpdate) {
    execFileSync("convert", [
      sourcePath,
      "-auto-orient",
      "-resize",
      `${size}x${size}>`,
      "-strip",
      "-quality",
      "72",
      thumbnailPath
    ], {
      stdio: ["ignore", "ignore", "inherit"]
    });
  }

  return thumbnailPath;
};

const renderPhoto = (photo, options = {}) => {
  const classes = photo.isWide ? "life-photo life-photo-wide" : "life-photo";
  const loading = options.eager ? "" : " loading=\"lazy\"";
  const fetchPriority = options.priority ? " fetchpriority=\"high\"" : "";
  const indent = options.indent || "\t\t\t";

  return [
    `${indent}<a class="${classes}" href="${photo.src}" data-lightbox-src="${photo.src}" data-lightbox-alt="Daily life photo">`,
    `${indent}\t<img src="${photo.thumbnailSrc}" alt="Daily life photo" width="${photo.width}" height="${photo.height}" decoding="async"${loading}${fetchPriority}>`,
    `${indent}</a>`
  ].join("\n");
};

const photoHeightScore = (photo) => 1 / photo.ratio;

const distributeMasonry = (photos, columnCount = 4) => {
  const columns = Array.from({ length: columnCount }, () => ({
    height: 0,
    photos: []
  }));

  const photosByHeight = photos.slice().sort((a, b) => {
    const heightDifference = photoHeightScore(b) - photoHeightScore(a);
    return heightDifference || a.index - b.index;
  });

  photosByHeight.forEach((photo) => {
    const targetColumn = columns.reduce((shortest, column) => (
      column.height < shortest.height ? column : shortest
    ), columns[0]);

    targetColumn.photos.push(photo);
    targetColumn.height += photoHeightScore(photo);
  });

  return columns.map((column) => (
    column.photos.sort((a, b) => a.index - b.index)
  ));
};

const renderStack = (photos) => {
  if (!photos.length) {
    return "";
  }

  const columns = distributeMasonry(photos);
  const eagerPhotos = new Set(columns.flatMap((column) => (
    column.slice(0, eagerPhotosPerColumn).map((photo) => photo.name)
  )));

  return [
    "\t\t\t<div class=\"life-photo-stack\">",
    columns.map((column, columnIndex) => [
      `\t\t\t\t<div class="life-photo-column" data-gallery-column="${columnIndex + 1}">`,
      column.map((photo) => renderPhoto(photo, {
        eager: eagerPhotos.has(photo.name),
        indent: "\t\t\t\t\t"
      })).join("\n"),
      "\t\t\t\t</div>"
    ].join("\n")).join("\n"),
    "\t\t\t</div>"
  ].join("\n");
};

const photoFiles = fs.readdirSync(photoDir)
  .filter((name) => imageExtensions.has(path.extname(name).toLowerCase()))
  .filter((name) => !excludedPhotoPattern.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

const photos = photoFiles.map((name, index) => {
  const absolutePath = path.join(photoDir, name);
  const dimensions = getDimensions(absolutePath);
  const ratio = dimensions.width / dimensions.height;

  return {
    index,
    name,
    src: toSitePath(absolutePath),
    width: dimensions.width,
    height: dimensions.height,
    ratio,
    isWide: ratio >= wideRatio
  };
}).map((photo) => {
  const thumbnailPath = ensureThumbnail(photo);

  return {
    ...photo,
    thumbnailSrc: toSitePath(thumbnailPath)
  };
});

const expectedThumbnailNames = new Set(photos.map((photo) => thumbNameFor(photo.name)));
if (fs.existsSync(thumbnailDir)) {
  fs.readdirSync(thumbnailDir)
    .filter((name) => path.extname(name).toLowerCase() === ".webp")
    .filter((name) => !expectedThumbnailNames.has(name))
    .forEach((name) => fs.unlinkSync(path.join(thumbnailDir, name)));
}

const widePhotos = photos
  .filter((photo) => photo.isWide)
  .sort((a, b) => b.ratio - a.ratio || a.name.localeCompare(b.name));
const regularPhotos = photos.filter((photo) => !photo.isWide);
const firstPhoto = widePhotos[0] || regularPhotos[0];

const galleryParts = [
  "\t\t<section class=\"life-photo-section\" aria-label=\"Daily life photo collection\">",
  "\t\t\t<!-- Generated by scripts/build-life-gallery.js. Edit images/oc and rerun the script. -->"
];

if (widePhotos.length) {
  galleryParts.push(widePhotos.map((photo, index) => renderPhoto(photo, {
    eager: index === 0,
    priority: index === 0
  })).join("\n"));
}

galleryParts.push(renderStack(regularPhotos));
galleryParts.push("\t\t</section>");

const generatedSection = galleryParts.filter(Boolean).join("\n");
let lifeHtml = fs.readFileSync(lifePath, "utf8");
const sectionPattern = /\t\t<section class="life-photo-section" aria-label="Daily life photo collection">[\s\S]*?\n\t\t<\/section>/;

if (!sectionPattern.test(lifeHtml)) {
  throw new Error("Could not find life photo section in life.html");
}

lifeHtml = lifeHtml.replace(sectionPattern, generatedSection);

if (firstPhoto) {
  lifeHtml = lifeHtml.replace(
    /\t<link rel="preload" as="image" href="[^"]+">\n/,
    `\t<link rel="preload" as="image" href="${firstPhoto.thumbnailSrc}">\n`
  );
} else {
  lifeHtml = lifeHtml.replace(/\t<link rel="preload" as="image" href="[^"]+">\n/, "");
}

fs.writeFileSync(lifePath, lifeHtml);

console.log(`Wrote life.html with ${regularPhotos.length} regular photos, ${widePhotos.length} wide photo${widePhotos.length === 1 ? "" : "s"}, and ${photos.length} thumbnails.`);
