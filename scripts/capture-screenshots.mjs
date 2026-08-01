import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const rootDir = resolve(new URL("..", import.meta.url).pathname);
const screenshotDir = join(rootDir, "artifacts", "screenshots");
const port = Number(process.env.THREATGRID_SCREENSHOT_PORT || 8876);
const cacheBust = process.env.THREATGRID_SCREENSHOT_CACHE_BUST || "visual-harness";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".webp": "image/webp"
};

function getContentType(filePath) {
  return contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream";
}

function createStaticServer() {
  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", `http://127.0.0.1:${port}`);
      const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
      const filePath = normalize(join(rootDir, decodeURIComponent(pathname)));

      if (!filePath.startsWith(rootDir)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      const body = await readFile(filePath);
      response.writeHead(200, { "Content-Type": getContentType(filePath) });
      response.end(body);
    } catch (error) {
      response.writeHead(error?.code === "ENOENT" ? 404 : 500);
      response.end(error?.code === "ENOENT" ? "Not found" : "Server error");
    }
  });
}

async function listen(server) {
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, "127.0.0.1", resolveListen);
  });
}

async function close(server) {
  await new Promise((resolveClose) => server.close(resolveClose));
}

async function tryClickByText(page, textPattern, timeout = 1200) {
  const locator = page.getByRole("button", { name: textPattern });
  try {
    await locator.first().click({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function capture(page, name) {
  const path = join(screenshotDir, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function writeReport(report) {
  const path = join(screenshotDir, "capture-report.json");
  const stream = createWriteStream(path);
  stream.end(`${JSON.stringify(report, null, 2)}\n`);
  await new Promise((resolveWrite) => stream.on("finish", resolveWrite));
  return path;
}

async function main() {
  await mkdir(screenshotDir, { recursive: true });

  let playwright;
  try {
    playwright = await import("playwright");
  } catch (error) {
    const reportPath = await writeReport({
      ok: false,
      blocker: "Playwright is not installed. Install it locally before running this harness.",
      details: error?.message || String(error),
      screenshots: []
    });
    console.error(`Screenshot harness blocked. See ${reportPath}`);
    process.exitCode = 1;
    return;
  }

  const server = createStaticServer();
  const report = {
    ok: false,
    url: `http://127.0.0.1:${port}/index.html?v=${cacheBust}`,
    screenshots: [],
    blockers: [],
    notes: []
  };

  let browser;
  try {
    await listen(server);
    browser = await playwright.chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const consoleMessages = [];
    page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
    page.on("pageerror", (error) => consoleMessages.push({ type: "pageerror", text: error.message }));

    await page.goto(report.url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    report.screenshots.push({ screen: "menu", path: await capture(page, "menu") });

    const startedSetup = await tryClickByText(page, /starter setup/i);
    const beganRun = startedSetup ? await tryClickByText(page, /begin run/i, 1800) : false;
    if (startedSetup && beganRun) {
      await page.waitForTimeout(1800);
      report.screenshots.push({ screen: "globe", path: await capture(page, "globe") });
    } else {
      report.blockers.push("Globe was not reachable through STARTER SETUP -> BEGIN RUN in the harness.");
    }

    report.blockers.push("Combat screenshot not captured: no deterministic dev combat entry helper exists yet.");
    report.notes.push('Recommended future helper: window.devStartCombatByThreatId("hospital-network-lockout").');
    report.consoleMessages = consoleMessages.slice(-25);
    report.ok = report.screenshots.length > 0;
  } catch (error) {
    report.blockers.push(error?.message || String(error));
  } finally {
    await browser?.close?.();
    await close(server);
    const reportPath = await writeReport(report);
    if (report.ok) {
      console.log(`Screenshot harness completed. See ${reportPath}`);
      report.screenshots.forEach((shot) => console.log(`${shot.screen}: ${shot.path}`));
      if (report.blockers.length) {
        console.warn(`Blockers: ${report.blockers.join(" | ")}`);
      }
    } else {
      console.error(`Screenshot harness failed. See ${reportPath}`);
      process.exitCode = 1;
    }
  }
}

await main();
