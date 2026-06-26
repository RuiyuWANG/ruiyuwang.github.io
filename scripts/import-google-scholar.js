const fs = require("fs");
const https = require("https");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "publications.json");

const args = process.argv.slice(2);

const getArg = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
};

const hasFlag = (name) => args.includes(name);

const decodeHtml = (value) => String(value || "")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, "\"")
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const stripTags = (value) => decodeHtml(String(value || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

const slugify = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 80);

const titleKeywords = (title) => {
  const stopwords = new Set(["a", "an", "and", "as", "by", "for", "from", "in", "of", "on", "or", "the", "to", "via", "with"]);
  return String(title || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !stopwords.has(word))
    .slice(0, 8);
};

const extractScholarUser = (profile) => {
  if (!profile) {
    return "";
  }

  const userMatch = profile.match(/[?&]user=([^&#]+)/);
  return userMatch ? decodeURIComponent(userMatch[1]) : profile;
};

const fetchUrl = (url) => new Promise((resolve, reject) => {
  const request = https.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 academic-template-importer"
    }
  }, (response) => {
    if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      fetchUrl(response.headers.location).then(resolve, reject);
      return;
    }

    if (response.statusCode !== 200) {
      reject(new Error(`Request failed with HTTP ${response.statusCode}`));
      response.resume();
      return;
    }

    const chunks = [];
    response.on("data", (chunk) => chunks.push(chunk));
    response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

  request.on("error", reject);
  request.setTimeout(15000, () => {
    request.destroy(new Error("Request timed out."));
  });
});

const parseScholarHtml = (html) => {
  const rows = Array.from(String(html).matchAll(/<tr class="gsc_a_tr">([\s\S]*?)<\/tr>/g)).map((match) => match[1]);

  return rows.map((row) => {
    const titleMatch = row.match(/<a[^>]*class="gsc_a_at"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) {
      return null;
    }

    const grayBlocks = Array.from(row.matchAll(/<div class="gs_gray">([\s\S]*?)<\/div>/g)).map((match) => stripTags(match[1]));
    const yearMatch = row.match(/<span[^>]*class="gsc_a_h[^"]*"[^>]*>([\s\S]*?)<\/span>/);
    const href = decodeHtml(titleMatch[1]);
    const link = href.startsWith("http") ? href : `https://scholar.google.com${href}`;
    const title = stripTags(titleMatch[2]);
    const yearText = yearMatch ? stripTags(yearMatch[1]) : "";
    const year = Number(yearText) || "";

    return {
      id: slugify(`${year || "paper"}-${title}`),
      title,
      authors: grayBlocks[0] || "Author list",
      year,
      venue: grayBlocks[1] || "Publication venue",
      venueShort: year ? `Scholar ${year}` : "Scholar",
      type: "Imported",
      featured: false,
      image: "",
      tags: ["imported"],
      keywords: titleKeywords(title),
      abstract: "",
      links: [
        {
          label: "Google Scholar",
          url: link
        }
      ]
    };
  }).filter(Boolean);
};

const fetchScholarProfile = async (user) => {
  const papers = [];
  const seenIds = new Set();

  for (let cstart = 0; cstart < 1000; cstart += 100) {
    const url = `https://scholar.google.com/citations?user=${encodeURIComponent(user)}&hl=en&pagesize=100&cstart=${cstart}`;
    const html = await fetchUrl(url);
    const pagePapers = parseScholarHtml(html).filter((paper) => !seenIds.has(paper.id));

    pagePapers.forEach((paper) => {
      seenIds.add(paper.id);
      papers.push(paper);
    });

    if (pagePapers.length < 100) {
      break;
    }
  }

  return papers;
};

const mergePublications = (existing, imported, replace) => {
  if (replace) {
    return imported;
  }

  const byTitle = new Map(existing.map((paper) => [String(paper.title || "").toLowerCase(), paper]));

  imported.forEach((paper) => {
    const key = String(paper.title || "").toLowerCase();
    if (!byTitle.has(key)) {
      byTitle.set(key, paper);
    }
  });

  return Array.from(byTitle.values());
};

const main = async () => {
  const fromHtml = getArg("--from-html");
  const profile = getArg("--profile") || getArg("--user");
  const replace = hasFlag("--replace");
  let imported = [];

  if (fromHtml) {
    imported = parseScholarHtml(fs.readFileSync(path.resolve(fromHtml), "utf8"));
  } else if (profile) {
    imported = await fetchScholarProfile(extractScholarUser(profile));
  } else {
    console.error("Usage:");
    console.error("  npm run import:scholar -- --profile \"https://scholar.google.com/citations?user=SCHOLAR_ID&hl=en\"");
    console.error("  npm run import:scholar -- --from-html scholar-profile.html");
    process.exit(1);
  }

  if (!imported.length) {
    throw new Error("No publications were found. If Google Scholar blocked the request, save your profile page as HTML and use --from-html.");
  }

  const existing = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, "utf8")) : [];
  const merged = mergePublications(existing, imported, replace)
    .sort((a, b) => Number(b.year || 0) - Number(a.year || 0) || String(a.title).localeCompare(String(b.title)));

  fs.writeFileSync(dataPath, `${JSON.stringify(merged, null, 2)}\n`);
  execFileSync("node", ["scripts/build-publications.js"], { cwd: root, stdio: "inherit" });
  execFileSync("node", ["scripts/build-research-keywords.js"], { cwd: root, stdio: "inherit" });

  console.log(`Imported ${imported.length} Google Scholar publication${imported.length === 1 ? "" : "s"} into data/publications.json.`);
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
