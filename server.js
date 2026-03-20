const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const API_KEY = process.env.SILICONFLOW_API_KEY;
const MODEL = "Pro/deepseek-ai/DeepSeek-V3.2";
const API_URL = "https://api.siliconflow.cn/v1/chat/completions";
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendJson(res, 404, { error: "File not found." });
      return;
    }

    const extension = path.extname(filePath);
    const contentType = MIME_TYPES[extension] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

function buildPrompt(mode, text, targetLanguage) {
  const safeTargetLanguage = targetLanguage?.trim() || "English";

  switch (mode) {
    case "translate":
      return [
        {
          role: "system",
          content:
            "You are a precise multilingual translator. Preserve meaning, tone, and structure when possible.",
        },
        {
          role: "user",
          content: `Translate the following text into ${safeTargetLanguage}. Return only the translated text.\n\n${text}`,
        },
      ];
    case "summarize":
      return [
        {
          role: "system",
          content:
            "You are a concise summarization assistant. Produce a clear summary that keeps the key points and avoids filler.",
        },
        {
          role: "user",
          content:
            `Summarize the following text. Return a concise summary in ${safeTargetLanguage}.\n\n${text}`,
        },
      ];
    case "translate-summarize":
      return [
        {
          role: "system",
          content:
            "You translate accurately and then summarize clearly. Keep the output concise and useful.",
        },
        {
          role: "user",
          content:
            `First translate the following text into ${safeTargetLanguage}. Then provide a concise summary in ${safeTargetLanguage}. ` +
            'Format the response with exactly two sections titled "Translation" and "Summary".\n\n' +
            text,
        },
      ];
    default:
      return null;
  }
}

async function handleRun(req, res) {
  if (!API_KEY) {
    sendJson(res, 500, {
      error: "SILICONFLOW_API_KEY is missing. Add it to .env before starting the server.",
    });
    return;
  }

  let rawBody = "";

  req.on("data", (chunk) => {
    rawBody += chunk;
    if (rawBody.length > 1_000_000) {
      req.destroy();
    }
  });

  req.on("end", async () => {
    let payload;

    try {
      payload = JSON.parse(rawBody || "{}");
    } catch {
      sendJson(res, 400, { error: "Request body must be valid JSON." });
      return;
    }

    const text = String(payload.text || "").trim();
    const mode = String(payload.mode || "").trim();
    const targetLanguage = String(payload.targetLanguage || "").trim();

    if (!text) {
      sendJson(res, 400, { error: "Text is required." });
      return;
    }

    const messages = buildPrompt(mode, text, targetLanguage);

    if (!messages) {
      sendJson(res, 400, { error: "Invalid mode." });
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          stream: false,
          temperature: 0.2,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        sendJson(res, response.status, {
          error: data.message || data.error?.message || "SiliconFlow request failed.",
          details: data,
        });
        return;
      }

      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        sendJson(res, 502, { error: "SiliconFlow returned an empty response." });
        return;
      }

      sendJson(res, 200, { result: content });
    } catch (error) {
      sendJson(res, 500, {
        error: "Failed to reach SiliconFlow.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "POST" && requestUrl.pathname === "/api/run") {
    void handleRun(req, res);
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, normalizedPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden." });
    return;
  }

  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`callapi is running at http://localhost:${PORT}`);
});
