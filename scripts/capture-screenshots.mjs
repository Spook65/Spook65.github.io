import { createServer } from "node:http";
import { access, readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { runVisualCritic } from "./critic-combat-screenshot.mjs";

const rootDir = resolve(new URL("..", import.meta.url).pathname);
const screenshotDir = join(rootDir, "artifacts", "screenshots");
const port = Number(process.env.THREATGRID_SCREENSHOT_PORT || 8876);
const cacheBust = process.env.THREATGRID_SCREENSHOT_CACHE_BUST || "dev-harness-v1";
const viewport = {
  width: Number(process.env.THREATGRID_SCREENSHOT_WIDTH || 1440),
  height: Number(process.env.THREATGRID_SCREENSHOT_HEIGHT || 900)
};

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

async function getBrowserNow(page) {
  return page.evaluate(() => {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
    return Date.now();
  });
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function writeReport(report) {
  const path = join(screenshotDir, "capture-report.json");
  const stream = createWriteStream(path);
  stream.end(`${JSON.stringify(report, null, 2)}\n`);
  await new Promise((resolveWrite) => stream.on("finish", resolveWrite));
  return path;
}

async function collectCombatDomMeasurements(page) {
  return page.evaluate(() => {
    function rectToObject(rect) {
      if (!rect) {
        return null;
      }
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left
      };
    }

    function measure(selector) {
      const element = document.querySelector(selector);
      if (!element) {
        return {
          selector,
          exists: false,
          visible: false,
          hidden: false,
          rect: null
        };
      }

      const rect = element.getBoundingClientRect();
      const computed = getComputedStyle(element);
      const hidden = computed.display === "none"
        || computed.visibility === "hidden"
        || Number(computed.opacity) === 0
        || rect.width <= 0
        || rect.height <= 0;

      return {
        selector,
        exists: true,
        visible: !hidden,
        hidden,
        rect: rectToObject(rect),
        computed: {
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          position: computed.position,
          zIndex: computed.zIndex,
          pointerEvents: computed.pointerEvents,
          overflow: computed.overflow,
          transform: computed.transform
        }
      };
    }

    function measureFirst(selectors) {
      const measurements = selectors.map(measure);
      return measurements.find((entry) => entry.visible)
        || measurements.find((entry) => entry.exists)
        || measurements[0];
    }

    return {
      shell: measure(".combat-shell"),
      dioramaMount: measure("[data-combat-diorama-stage]"),
      canvas: measure("[data-combat-diorama-stage] canvas"),
      commandMenu: measure(".combat-stage-command-cluster"),
      partyHud: measure(".combat-reserve-strip"),
      combatFeed: measure(".combat-feed"),
      enemyReadout: measureFirst([
        ".combat-stage-enemy .combat-enemy-target-readout",
        ".combat-enemy-target-readout",
        ".combat-status-box-enemy",
        ".combat-stage-enemy .combat-battler-enemy"
      ]),
      enemySpriteWrapper: measure(".combat-stage-enemy .combat-battler-sprite-wrap"),
      commandButtons: Array.from(document.querySelectorAll("[data-combat-command]")).map((button) => {
        const rect = button.getBoundingClientRect();
        const computed = getComputedStyle(button);
        const hidden = computed.display === "none"
          || computed.visibility === "hidden"
          || Number(computed.opacity) === 0
          || rect.width <= 0
          || rect.height <= 0;
        return {
          label: button.textContent.trim(),
          command: button.getAttribute("data-combat-command"),
          visible: !hidden,
          rect: rectToObject(rect)
        };
      })
    };
  });
}

async function collectWorldCityState(page) {
  return page.evaluate(() => {
    const debug = window.devCityIncidentSceneState?.() || {};
    const state = window.devWorldState?.() || {};
    const screen = document.querySelector("#world-city-screen");
    const title = document.querySelector(".world-city-heading h1");
    const screenRect = screen?.getBoundingClientRect?.();
    const titleRect = title?.getBoundingClientRect?.();
    const screenComputed = screen ? getComputedStyle(screen) : null;
    const titleComputed = title ? getComputedStyle(title) : null;
    const hologram = document.querySelector("[data-world-city-hologram]");
    const hologramRect = hologram?.getBoundingClientRect?.();
    const hologramComputed = hologram ? getComputedStyle(hologram) : null;
    const hologramVisible = Boolean(hologram
      && hologram.classList.contains("is-visible")
      && hologramComputed?.display !== "none"
      && hologramComputed?.visibility !== "hidden"
      && Number(hologramComputed?.opacity || 0) > 0
      && hologramRect?.width > 0
      && hologramRect?.height > 0);

    return {
      screenState: typeof screenState !== "undefined" ? screenState : window.screenState || "",
      worldState: state,
      debug,
      worldCityMounted: Boolean(debug.mounted),
      cityCanvasCount: debug.canvasCount || document.querySelectorAll("[data-world-city-scene] canvas").length,
      visibleIncidentNodeCount: debug.incidentNodeCount || 0,
      worldCityScreenOpacity: Number(screenComputed?.opacity || 0),
      worldCityScreenVisible: Boolean(screen
        && screenComputed?.display !== "none"
        && screenComputed?.visibility !== "hidden"
        && Number(screenComputed?.opacity || 0) > 0.9
        && screenRect?.width > 0
        && screenRect?.height > 0),
      worldCityTitleVisible: Boolean(title
        && titleComputed?.display !== "none"
        && titleComputed?.visibility !== "hidden"
        && Number(titleComputed?.opacity || 0) > 0.9
        && titleRect?.width > 0
        && titleRect?.height > 0),
      worldCityTitleText: title?.textContent?.trim?.() || "",
      hoverHologramVisible: hologramVisible
    };
  });
}

async function collectGlobeRegionState(page) {
  return page.evaluate(() => {
    const state = window.devWorldState?.() || {};
    const regionEntry = window.threatGlobe?.regionMap?.get?.("north-america") || null;
    const selectedPanel = document.querySelector(".world-region-sector-card.is-visible");
    const sectorOption = document.querySelector("[data-world-sector-open='atlantic-medical-corridor']");
    const selectedPanelRect = selectedPanel?.getBoundingClientRect?.();
    const selectedPanelStyle = selectedPanel ? getComputedStyle(selectedPanel) : null;
    const sectorRect = sectorOption?.getBoundingClientRect?.();
    const sectorStyle = sectorOption ? getComputedStyle(sectorOption) : null;
    return {
      screenState: typeof screenState !== "undefined" ? screenState : window.screenState || "",
      hoveredRegionKey: state.hoveredRegionKey || "",
      selectedRegionKey: state.selectedRegionKey || "",
      currentRegionKey: state.currentRegionKey || "",
      selectedSectorKey: state.selectedSectorKey || "",
      regionHighlightMode: state.regionHighlightMode || "",
      routeChain: state.routeChain || [],
      regionHighlightVisible: Boolean(regionEntry && regionEntry.group?.visible !== false),
      regionHoveredInScene: Boolean(regionEntry?.group?.userData?.hovered),
      regionSelectedInScene: Boolean(regionEntry?.group?.userData?.selected),
      selectedPanelVisible: Boolean(selectedPanel
        && selectedPanelStyle?.display !== "none"
        && selectedPanelStyle?.visibility !== "hidden"
        && Number(selectedPanelStyle?.opacity || 0) > 0.9
        && selectedPanelRect?.width > 0
        && selectedPanelRect?.height > 0),
      sectorOptionVisible: Boolean(sectorOption
        && sectorStyle?.display !== "none"
        && sectorStyle?.visibility !== "hidden"
        && Number(sectorStyle?.opacity || 1) > 0
        && sectorRect?.width > 0
        && sectorRect?.height > 0),
      sectorOptionText: sectorOption?.innerText?.trim?.() || ""
    };
  });
}

async function tryOpenWorldCityFromGlobeNode(page) {
  const projection = await page.evaluate(() => {
    const globe = window.threatGlobe;
    const entry = globe?.nodeMap?.get?.("tg-001");
    if (!globe || !entry?.group || !globe.camera || typeof THREE === "undefined") {
      return {
        ok: false,
        reason: "Hospital globe node or THREE camera context unavailable."
      };
    }

    globe.scene?.updateMatrixWorld?.(true);
    globe.camera.updateMatrixWorld?.(true);
    const projected = new THREE.Vector3();
    entry.group.getWorldPosition(projected);
    projected.project(globe.camera);

    return {
      ok: Number.isFinite(projected.x) && Number.isFinite(projected.y),
      x: Math.round((projected.x + 1) * window.innerWidth / 2),
      y: Math.round((-projected.y + 1) * window.innerHeight / 2),
      screenState: typeof screenState !== "undefined" ? screenState : window.screenState || "",
      threatId: entry.threat?.id || ""
    };
  });

  if (!projection.ok) {
    return { ok: false, route: "globe-route", projection };
  }

  await page.mouse.click(projection.x, projection.y);
  try {
    await page.waitForSelector("[data-world-city-scene] canvas", { timeout: 5000 });
    return { ok: true, route: "globe-route", projection };
  } catch (error) {
    return {
      ok: false,
      route: "globe-route",
      projection,
      reason: error?.message || String(error)
    };
  }
}

async function waitForCombatDioramaDebug(page, predicate, timeoutMs = 1800) {
  try {
    await page.waitForFunction(predicate, null, { timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

async function triggerCombatScanVfx(page) {
  const burstOffsetsMs = [0, 100, 200, 300, 450, 600];
  const result = {
    attempted: false,
    abilityFound: false,
    abilityLabel: "",
    vfxScreenshotCaptured: false,
    vfxFamilyCaptured: "",
    activeVfxCountAtCapture: 0,
    lastVfxSequenceId: "",
    oldBeamHidden: null,
    canvasCount: 0,
    screenshotPath: "",
    burstFrameCount: 0,
    bestVfxFrame: null,
    frames: [],
    error: ""
  };

  try {
    result.attempted = true;
    await page.click('[data-combat-command="attack"]', { timeout: 1600 });
    await page.waitForSelector("[data-combat-ability]", { timeout: 2200 });
    const abilityClickResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("[data-combat-ability]"));
      const button = buttons.find((candidate) => /deep packet scan/i.test(candidate.textContent || "")) || buttons[0];
      if (!button) {
        return { clicked: false, label: "" };
      }
      const label = (button.textContent || "").trim();
      button.click();
      return { clicked: true, label };
    });
    result.abilityFound = Boolean(abilityClickResult.clicked);
    result.abilityLabel = abilityClickResult.label || "";

    if (!result.abilityFound) {
      result.error = "No combat ability button was available for VFX capture.";
      return result;
    }

    const observedActiveVfx = await waitForCombatDioramaDebug(
      page,
      () => (window.devCombatDioramaState?.().activeVfxCount || 0) > 0,
      2200
    );
    const vfxObservedAt = observedActiveVfx ? await getBrowserNow(page) : null;
    if (!observedActiveVfx) {
      await page.waitForTimeout(220);
    }

    let previousOffset = 0;
    for (const offsetMs of burstOffsetsMs) {
      const waitMs = Math.max(0, offsetMs - previousOffset);
      if (waitMs > 0) {
        await page.waitForTimeout(waitMs);
      }
      previousOffset = offsetMs;

      const frameName = `combat-vfx-scan-${String(offsetMs).padStart(3, "0")}ms`;
      const frameDebug = await page.evaluate(() => ({
        now: typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now(),
        debug: window.devCombatDioramaState?.() || {}
      }));
      const debug = frameDebug.debug || {};
      const screenshotStartedAt = await getBrowserNow(page);
      const framePath = await capture(page, frameName);
      const screenshotFinishedAt = await getBrowserNow(page);
      const frame = {
        name: frameName,
        filename: `${frameName}.png`,
        path: framePath,
        exists: await fileExists(framePath),
        offsetMs,
        intendedOffsetMs: offsetMs,
        vfxObservedAt,
        frameDebugReadAt: frameDebug.now,
        screenshotStartedAt,
        screenshotFinishedAt,
        actualElapsedSinceVfxObserved: Number.isFinite(vfxObservedAt) ? Math.max(0, Math.round(frameDebug.now - vfxObservedAt)) : null,
        screenshotDurationMs: Math.max(0, Math.round(screenshotFinishedAt - screenshotStartedAt)),
        activeVfxCount: debug.activeVfxCount || 0,
        lastVfxFamily: debug.lastVfxFamily || "",
        lastVfxSequenceId: debug.lastVfxSequenceId || "",
        oldBeamHidden: debug.oldBeamHidden ?? null,
        canvasCount: debug.canvasCount || await page.evaluate(() => document.querySelectorAll("[data-combat-diorama-stage] canvas").length),
        persistentVfxRemainingMs: Array.isArray(debug.persistentVfxRemainingMs) ? debug.persistentVfxRemainingMs : [],
        pageErrors: []
      };
      result.frames.push(frame);
    }

    result.burstFrameCount = result.frames.filter((frame) => frame.exists).length;
    result.bestVfxFrame = result.frames.find((frame) => frame.activeVfxCount > 0 && frame.lastVfxFamily === "scan")
      || result.frames.find((frame) => frame.activeVfxCount > 0)
      || null;

    const debugAtCapture = result.bestVfxFrame || result.frames[0] || {};
    result.vfxFamilyCaptured = debugAtCapture.lastVfxFamily || "";
    result.activeVfxCountAtCapture = debugAtCapture.activeVfxCount || 0;
    result.lastVfxSequenceId = debugAtCapture.lastVfxSequenceId || "";
    result.oldBeamHidden = debugAtCapture.oldBeamHidden ?? null;
    result.canvasCount = debugAtCapture.canvasCount || 0;
    result.screenshotPath = debugAtCapture.path || "";
    result.vfxScreenshotCaptured = Boolean(debugAtCapture.exists);

    await waitForCombatDioramaDebug(
      page,
      () => (window.devCombatDioramaState?.().activeVfxCount || 0) === 0,
      2400
    );
  } catch (error) {
    result.error = error?.message || String(error);
  }

  return result;
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
      install: [
        "npm install",
        "npx playwright install chromium",
        "npm run screenshots"
      ],
      screenshots: []
    });
    const critic = await runVisualCritic({ screenshotDir, captureReportPath: reportPath });
    console.error(`Screenshot harness blocked. See ${reportPath}`);
    console.error(`Visual critic report: ${critic.artifacts.visual_critic_json}`);
    process.exitCode = 1;
    return;
  }

  const server = createStaticServer();
  const report = {
    ok: false,
    url: `http://127.0.0.1:${port}/index.html?v=${cacheBust}`,
    screenshots: [],
    blockers: [],
    notes: [],
    viewport,
    activeUrl: "",
    combat: {
      helperAvailable: false,
      helperResult: null,
      marker: "",
      canvasCount: 0,
      screenshotExists: false
    },
    globeRegion: {
      hoverScreenshotExists: false,
      selectedScreenshotExists: false,
      screenState: "",
      hoveredRegionKey: "",
      selectedRegionKey: "",
      selectedSectorKey: "",
      regionHighlightMode: "",
      regionHighlightVisible: false,
      selectedPanelVisible: false,
      sectorOptionVisible: false
    },
    worldCity: {
      helperAvailable: false,
      opened: false,
      routeForHospitalThreat: null,
      screenState: "",
      worldCityMounted: false,
      cityCanvasCount: 0,
      visibleIncidentNodeCount: 0,
      screenshotExists: false,
      hoverScreenshotExists: false,
      hoverHologramVisible: false
    }
  };

  let browser;
  try {
    await listen(server);
    browser = await playwright.chromium.launch();
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    const consoleMessages = [];
    page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
    page.on("pageerror", (error) => consoleMessages.push({ type: "pageerror", text: error.message }));

    await page.goto(report.url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    report.activeUrl = page.url();
    const menuPath = await capture(page, "menu");
    report.screenshots.push({ screen: "menu", path: menuPath, exists: await fileExists(menuPath) });

    const startedSetup = await tryClickByText(page, /starter setup/i);
    const beganRun = startedSetup ? await tryClickByText(page, /begin run/i, 1800) : false;
    if (startedSetup && beganRun) {
      await page.waitForTimeout(1800);
      const globePath = await capture(page, "globe");
      report.screenshots.push({ screen: "globe", path: globePath, exists: await fileExists(globePath) });

      const regionHoverResult = await page.evaluate(() => window.devHoverWorldRegion?.("north-america") || null);
      await page.waitForTimeout(320);
      const regionHoverPath = await capture(page, "globe-region-north-america-hover");
      const regionHoverState = await collectGlobeRegionState(page);
      report.globeRegion = {
        ...report.globeRegion,
        hoverResult: regionHoverResult,
        ...regionHoverState,
        hoverScreenshotExists: await fileExists(regionHoverPath)
      };
      report.screenshots.push({
        screen: "globe-region-north-america-hover",
        path: regionHoverPath,
        exists: report.globeRegion.hoverScreenshotExists
      });

      const regionSelectResult = await page.evaluate(() => window.devSelectWorldRegion?.("north-america") || null);
      await page.waitForTimeout(240);
      const regionSelectedPath = await capture(page, "globe-region-north-america-selected");
      const regionSelectedState = await collectGlobeRegionState(page);
      report.globeRegion = {
        ...report.globeRegion,
        selectResult: regionSelectResult,
        selected: regionSelectedState,
        selectedScreenshotExists: await fileExists(regionSelectedPath),
        selectedRegionKey: regionSelectedState.selectedRegionKey,
        selectedSectorKey: regionSelectedState.selectedSectorKey,
        regionHighlightMode: regionSelectedState.regionHighlightMode,
        selectedPanelVisible: regionSelectedState.selectedPanelVisible,
        sectorOptionVisible: regionSelectedState.sectorOptionVisible
      };
      report.screenshots.push({
        screen: "globe-region-north-america-selected",
        path: regionSelectedPath,
        exists: report.globeRegion.selectedScreenshotExists
      });

      report.worldCity.routeForHospitalThreat = await page.evaluate(() => window.devWorldRouteForThreat?.("tg-001") || null);
      const worldCityHelperAvailable = await page.evaluate(() => typeof window.devOpenWorldCity === "function");
      report.worldCity.helperAvailable = worldCityHelperAvailable;
      const globeRouteAttempt = await tryOpenWorldCityFromGlobeNode(page);
      report.worldCity.globeRouteAttempt = globeRouteAttempt;
      report.worldCity.entryRoute = globeRouteAttempt.ok ? "globe-route" : "";

      if (globeRouteAttempt.ok || worldCityHelperAvailable) {
        if (!globeRouteAttempt.ok) {
          report.worldCity.entryRoute = "dev-helper";
          report.worldCity.opened = await page.evaluate(() => window.devOpenWorldCity("hospital-lockout"));
        } else {
          report.worldCity.opened = true;
        }
        await page.waitForSelector("[data-world-city-scene] canvas", { timeout: 5000 });
        await page.waitForTimeout(700);
        const worldCityPath = await capture(page, "world-city-hospital");
        const worldCityState = await collectWorldCityState(page);
        report.worldCity = {
          ...report.worldCity,
          ...worldCityState,
          screenshotExists: await fileExists(worldCityPath)
        };
        report.screenshots.push({ screen: "world-city-hospital", path: worldCityPath, exists: report.worldCity.screenshotExists });

        const hoverNode = worldCityState.debug?.incidentNodes?.find((node) => node.hasCombat)
          || worldCityState.debug?.incidentNodes?.[0]
          || null;
        if (hoverNode?.screenX && hoverNode?.screenY) {
          await page.mouse.move(hoverNode.screenX, hoverNode.screenY);
          await page.waitForTimeout(240);
          const hoverPath = await capture(page, "world-city-hospital-hover");
          const hoverState = await collectWorldCityState(page);
          report.worldCity = {
            ...report.worldCity,
            hover: {
              node: hoverNode,
              state: hoverState
            },
            hoverScreenshotExists: await fileExists(hoverPath),
            hoverHologramVisible: hoverState.hoverHologramVisible
          };
          report.screenshots.push({ screen: "world-city-hospital-hover", path: hoverPath, exists: report.worldCity.hoverScreenshotExists });
        }
      } else {
        report.blockers.push("World-city screenshot not captured: globe route failed and devOpenWorldCity was not available on window.");
      }
    } else {
      report.blockers.push("Globe was not reachable through STARTER SETUP -> BEGIN RUN in the harness.");
    }

    const helperState = await page.evaluate(() => ({
      startHospital: typeof window.devStartHospitalCombat === "function",
      startById: typeof window.devStartCombatByThreatId === "function"
    }));
    report.combat.helperAvailable = Boolean(helperState.startHospital || helperState.startById);

    if (!report.combat.helperAvailable) {
      report.blockers.push("Combat screenshot not captured: deterministic dev combat helper was not available on window.");
    } else {
      if (report.worldCity.opened && typeof report.worldCity.screenState === "string" && report.worldCity.screenState === "world-city") {
        const combatNode = report.worldCity.hover?.node || null;
        if (combatNode?.screenX && combatNode?.screenY) {
          await page.mouse.click(combatNode.screenX, combatNode.screenY);
          report.combat.helperResult = true;
          report.combat.entryPath = "world-city-node-click";
        } else {
          report.combat.helperResult = await page.evaluate(() => window.devSelectIncidentNode?.("hospital-main-lockout") || false);
          report.combat.entryPath = "world-city-dev-select-fallback";
        }
      } else {
        report.combat.helperResult = await page.evaluate(() => {
          if (typeof window.devStartHospitalCombat === "function") {
            return window.devStartHospitalCombat();
          }
          return window.devStartCombatByThreatId("tg-001");
        });
        report.combat.entryPath = "combat-dev-helper";
      }
      await page.waitForFunction(() => Boolean(document.querySelector(".combat-shell[data-combat-art]")), null, { timeout: 5000 });
      await page.waitForFunction(() => document.querySelectorAll("[data-combat-diorama-stage] canvas").length === 1, null, { timeout: 5000 });
      await page.waitForTimeout(1200);
      const combatPath = await capture(page, "combat-hospital");
      const restingPath = await capture(page, "combat-resting");
      const combatState = await page.evaluate(() => {
        const shell = document.querySelector(".combat-shell[data-combat-art]");
        const canvasCount = document.querySelectorAll("[data-combat-diorama-stage] canvas").length;
        return {
          marker: shell?.getAttribute("data-combat-art") || "",
          canvasCount,
          screenText: document.body.innerText.slice(0, 300)
        };
      });
      const combatDom = await collectCombatDomMeasurements(page);
      report.combat = {
        ...report.combat,
        ...combatState,
        dom: combatDom,
        screenshotExists: await fileExists(combatPath),
        restingScreenshotExists: await fileExists(restingPath)
      };
      report.screenshots.push({ screen: "combat-hospital", path: combatPath, exists: report.combat.screenshotExists });
      report.screenshots.push({ screen: "combat-resting", path: restingPath, exists: report.combat.restingScreenshotExists });

      const scanVfx = await triggerCombatScanVfx(page);
      report.combat.vfx = {
        scan: scanVfx
      };
      if (scanVfx.screenshotPath) {
        report.screenshots.push({
          screen: "combat-vfx-scan",
          path: scanVfx.screenshotPath,
          exists: scanVfx.vfxScreenshotCaptured
        });
      }
      scanVfx.frames.forEach((frame) => {
        report.screenshots.push({
          screen: frame.name,
          path: frame.path,
          exists: frame.exists
        });
      });
    }

    report.consoleMessages = consoleMessages.slice(-25);
    report.ok = report.screenshots.length > 0;
  } catch (error) {
    report.blockers.push(error?.message || String(error));
    if (/Executable doesn't exist|browserType\.launch/i.test(error?.message || "")) {
      report.install = [
        "npx playwright install chromium",
        "npm run screenshots"
      ];
    }
  } finally {
    await browser?.close?.();
    await close(server);
    const reportPath = await writeReport(report);
    const critic = await runVisualCritic({ screenshotDir, captureReportPath: reportPath });
    if (report.ok) {
      console.log(`Screenshot harness completed. See ${reportPath}`);
      console.log(`Visual critic report: ${critic.artifacts.visual_critic_json}`);
      console.log(`Visual critic markdown: ${critic.artifacts.visual_critic_md}`);
      report.screenshots.forEach((shot) => console.log(`${shot.screen}: ${shot.path}`));
      if (report.blockers.length) {
        console.warn(`Blockers: ${report.blockers.join(" | ")}`);
      }
      if (!critic.accepted) {
        console.warn(`Visual critic rejected deterministic gates: ${critic.failures.join(" | ")}`);
      }
    } else {
      console.error(`Screenshot harness failed. See ${reportPath}`);
      console.error(`Visual critic report: ${critic.artifacts.visual_critic_json}`);
      process.exitCode = 1;
    }
  }
}

await main();
