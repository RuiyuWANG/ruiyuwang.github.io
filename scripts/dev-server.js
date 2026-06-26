const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contentPath = path.join(root, "data", "site-content.json");
const requestedPort = Number(process.env.PORT || process.argv[2] || 8000);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp"
};

const send = (response, status, body, type = "text/plain; charset=utf-8") => {
  response.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  response.end(body);
};

const readRequestBody = (request) => new Promise((resolve, reject) => {
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  request.on("error", reject);
});

const safeFilePath = (urlPath) => {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(decodedPath === "/" ? "/index.html" : decodedPath);
  const absolutePath = path.join(root, normalized);

  if (!absolutePath.startsWith(root)) {
    return null;
  }

  return absolutePath;
};

const handleApi = async (request, response) => {
  if (request.url === "/api/content" && request.method === "GET") {
    send(response, 200, fs.readFileSync(contentPath, "utf8"), "application/json; charset=utf-8");
    return true;
  }

  if (request.url === "/api/content" && request.method === "POST") {
    const body = await readRequestBody(request);
    const parsed = JSON.parse(body);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      send(response, 400, "Expected a JSON object.");
      return true;
    }

    fs.writeFileSync(contentPath, `${JSON.stringify(parsed, null, 2)}\n`);
    send(response, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
    return true;
  }

  return false;
};

const createServer = () => http.createServer(async (request, response) => {
  try {
    if (await handleApi(request, response)) {
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      send(response, 405, "Method not allowed.");
      return;
    }

    const absolutePath = safeFilePath(request.url);
    if (!absolutePath || !fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      send(response, 404, "Not found.");
      return;
    }

    const type = contentTypes[path.extname(absolutePath).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    fs.createReadStream(absolutePath).pipe(response);
  } catch (error) {
    send(response, 500, error.message || "Server error.");
  }
});

const listen = (port, attemptsLeft = 10) => {
  const server = createServer();

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      listen(port + 1, attemptsLeft - 1);
      return;
    }

    throw error;
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`Template dev server running at http://localhost:${port}`);
    console.log(`Open http://localhost:${port}/?edit=1 to edit text in place.`);
  });
};

listen(requestedPort);
