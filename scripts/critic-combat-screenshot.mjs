import { access, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const rootDir = resolve(new URL("..", import.meta.url).pathname);
const defaultScreenshotDir = join(rootDir, "artifacts", "screenshots");

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getScreenshot(report, screen) {
  return asArray(report?.screenshots).find((shot) => shot?.screen === screen) || null;
}

function getCombatScreenshot(report) {
  return getScreenshot(report, "combat-hospital");
}

function isPageError(message) {
  const type = String(message?.type || "").toLowerCase();
  return type === "error" || type === "pageerror";
}

function isVisibleBox(measurement) {
  return Boolean(measurement?.exists && measurement?.visible && measurement?.rect?.width > 0 && measurement?.rect?.height > 0);
}

function ratioAtLeast(child, parent, threshold) {
  const childRect = child?.rect;
  const parentRect = parent?.rect;
  if (!childRect || !parentRect || parentRect.width <= 0 || parentRect.height <= 0) {
    return false;
  }
  return childRect.width >= parentRect.width * threshold && childRect.height >= parentRect.height * threshold;
}

function viewportRatioAtLeast(measurement, viewport, threshold) {
  const rect = measurement?.rect;
  if (!rect || !viewport?.width || !viewport?.height) {
    return false;
  }
  return rect.width >= viewport.width * threshold && rect.height >= viewport.height * threshold;
}

function scoreFromFailures(base, failures, penalty) {
  return Math.max(0, base - failures.length * penalty);
}

function buildMarkdownReport(result) {
  const lines = [
    "# Combat Visual Critic Report",
    "",
    `- Accepted: ${result.accepted ? "true" : "false"}`,
    `- Acceptance scope: ${result.acceptance_scope}`,
    `- Manual review required: ${result.manual_review_required ? "true" : "false"}`,
    `- Performance risk: ${result.performance_risk}`,
    "",
    "## Scores",
    "",
    `- Technical correctness: ${result.scores.technical_correctness}/10`,
    `- Visual composition: ${result.scores.visual_composition}/10`,
    `- Game feel: ${result.scores.game_feel}/10`,
    `- UI readability: ${result.scores.ui_readability}/10`,
    "",
    "## Deterministic Checks",
    ""
  ];

  result.deterministic_checks.forEach((check) => {
    const status = check.pass ? "PASS" : "FAIL";
    const requirement = check.required ? "required" : "informational";
    lines.push(`- ${status}: ${check.label} (${requirement})`);
    if (check.detail) {
      lines.push(`  ${check.detail}`);
    }
  });

  lines.push("", "## Failures", "");
  if (result.failures.length) {
    result.failures.forEach((failure) => lines.push(`- ${failure}`));
  } else {
    lines.push("- None for deterministic technical gates.");
  }

  lines.push("", "## Manual Review Rubric", "");
  result.manual_review_items.forEach((item) => {
    lines.push(`- ${item.label}`);
    lines.push(`  ${item.prompt}`);
  });

  lines.push("", "## Ability VFX Capture", "");
  if (result.vfx) {
    lines.push(`- Scan screenshot exists: ${result.vfx.scan_screenshot_exists ? "true" : "false"}`);
    lines.push(`- Burst frame count: ${result.vfx.burst_frame_count}`);
    lines.push(`- Best VFX frame: ${result.vfx.best_vfx_frame || "missing"}`);
    lines.push(`- Active VFX observed: ${result.vfx.active_vfx_observed ? "true" : "false"}`);
    lines.push(`- VFX family captured: ${result.vfx.family_captured || "missing"}`);
    lines.push(`- Active VFX count at capture: ${result.vfx.active_vfx_count_at_capture}`);
    lines.push(`- Old beam hidden: ${result.vfx.old_beam_hidden === null ? "unknown" : result.vfx.old_beam_hidden}`);
    lines.push(`- Canvas count: ${result.vfx.canvas_count ?? "missing"}`);
    lines.push(`- Manual review required: ${result.vfx.manual_review_required ? "true" : "false"}`);
    if (result.vfx.error) {
      lines.push(`- Error: ${result.vfx.error}`);
    }
    if (result.vfx.timing) {
      lines.push(`- Timing reliable: ${result.vfx.timing.timing_reliable ? "true" : "false"}`);
      lines.push(`- Intended offsets: ${result.vfx.timing.intended_offsets_ms.join(", ") || "missing"}`);
      lines.push(`- Actual elapsed times: ${result.vfx.timing.actual_elapsed_ms.join(", ") || "missing"}`);
    }
  } else {
    lines.push("- No VFX section recorded.");
  }

  lines.push("", "## World City Capture", "");
  if (result.world_city) {
    lines.push(`- Screenshot exists: ${result.world_city.screenshot_exists ? "true" : "false"}`);
    lines.push(`- Hover screenshot exists: ${result.world_city.hover_screenshot_exists ? "true" : "false"}`);
    lines.push(`- Screen state: ${result.world_city.screen_state || "missing"}`);
    lines.push(`- Mounted: ${result.world_city.mounted ? "true" : "false"}`);
    lines.push(`- City canvas count: ${result.world_city.canvas_count ?? "missing"}`);
    lines.push(`- Incident node count: ${result.world_city.incident_node_count ?? "missing"}`);
    lines.push(`- Entry route: ${result.world_city.entry_route || "missing"}`);
    lines.push(`- Route chain: ${asArray(result.world_city.route_chain).join(" -> ") || "missing"}`);
    lines.push(`- Screen opacity: ${result.world_city.screen_opacity ?? "missing"}`);
    lines.push(`- Title visible: ${result.world_city.title_visible ? "true" : "false"}`);
    lines.push(`- Hover hologram visible: ${result.world_city.hover_hologram_visible ? "true" : "false"}`);
    lines.push(`- Manual review required: ${result.world_city.manual_review_required ? "true" : "false"}`);
  } else {
    lines.push("- No world-city section recorded.");
  }

  lines.push("", "## Globe Region Capture", "");
  if (result.globe_region) {
    lines.push(`- Hover screenshot exists: ${result.globe_region.hover_screenshot_exists ? "true" : "false"}`);
    lines.push(`- Selected screenshot exists: ${result.globe_region.selected_screenshot_exists ? "true" : "false"}`);
    lines.push(`- Screen state: ${result.globe_region.screen_state || "missing"}`);
    lines.push(`- Hovered region: ${result.globe_region.hovered_region_key || "missing"}`);
    lines.push(`- Selected region: ${result.globe_region.selected_region_key || "missing"}`);
    lines.push(`- Highlight mode: ${result.globe_region.region_highlight_mode || "missing"}`);
    lines.push(`- Surface highlight object exists: ${result.globe_region.surface_highlight_object_exists ? "true" : "false"}`);
    lines.push(`- Surface highlight visible: ${result.globe_region.surface_highlight_visible ? "true" : "false"}`);
    lines.push(`- Selected panel visible: ${result.globe_region.selected_panel_visible ? "true" : "false"}`);
    lines.push(`- Region highlight visible: ${result.globe_region.region_highlight_visible ? "true" : "false"}`);
    lines.push(`- Sector option visible: ${result.globe_region.sector_option_visible ? "true" : "false"}`);
    lines.push(`- Manual review required: ${result.globe_region.manual_review_required ? "true" : "false"}`);
  } else {
    lines.push("- No globe-region section recorded.");
  }

  lines.push("", "## What Still Looks Fake", "");
  result.what_still_looks_fake.forEach((item) => lines.push(`- ${item}`));

  lines.push("", "## What Should Not Be Touched Next", "");
  result.what_should_not_be_touched_next.forEach((item) => lines.push(`- ${item}`));

  lines.push("", "## Artifacts", "");
  Object.entries(result.artifacts).forEach(([name, path]) => {
    lines.push(`- ${name}: ${path || "missing"}`);
  });

  return `${lines.join("\n")}\n`;
}

export async function runVisualCritic({
  screenshotDir = defaultScreenshotDir,
  captureReportPath = join(screenshotDir, "capture-report.json")
} = {}) {
  const jsonPath = join(screenshotDir, "visual-critic-report.json");
  const markdownPath = join(screenshotDir, "visual-critic-report.md");

  let report = {};
  let captureReportExists = false;
  try {
    const raw = await readFile(captureReportPath, "utf8");
    report = JSON.parse(raw);
    captureReportExists = true;
  } catch (error) {
    report = {
      ok: false,
      blockers: [`Capture report could not be read: ${error?.message || String(error)}`]
    };
  }

  const combatShot = getCombatScreenshot(report);
  const worldCityShot = getScreenshot(report, "world-city-hospital");
  const worldCityHoverShot = getScreenshot(report, "world-city-hospital-hover");
  const globeRegionHoverShot = getScreenshot(report, "globe-region-north-america-hover");
  const globeRegionSelectedShot = getScreenshot(report, "globe-region-north-america-selected");
  const scanVfxShot = getScreenshot(report, "combat-vfx-scan");
  const burstFrameShots = asArray(report?.screenshots).filter((shot) => /^combat-vfx-scan-\d+ms$/.test(String(shot?.screen || "")));
  const combatScreenshotExists = Boolean(combatShot?.path && await fileExists(combatShot.path));
  const worldCityScreenshotExists = Boolean(worldCityShot?.path && await fileExists(worldCityShot.path));
  const worldCityHoverScreenshotExists = Boolean(worldCityHoverShot?.path && await fileExists(worldCityHoverShot.path));
  const globeRegionHoverScreenshotExists = Boolean(globeRegionHoverShot?.path && await fileExists(globeRegionHoverShot.path));
  const globeRegionSelectedScreenshotExists = Boolean(globeRegionSelectedShot?.path && await fileExists(globeRegionSelectedShot.path));
  const scanVfxScreenshotExists = Boolean(scanVfxShot?.path && await fileExists(scanVfxShot.path));
  const existingBurstFrameCount = (await Promise.all(burstFrameShots.map((shot) => fileExists(shot.path)))).filter(Boolean).length;
  const combat = report?.combat || {};
  const worldCity = report?.worldCity || {};
  const globeRegion = report?.globeRegion || {};
  const scanVfx = combat?.vfx?.scan || {};
  const scanVfxFrames = asArray(scanVfx.frames);
  const bestVfxFrame = scanVfx.bestVfxFrame || scanVfxFrames.find((frame) => frame?.activeVfxCount > 0 && frame?.lastVfxFamily === "scan") || null;
  const vfxTimingFrames = scanVfxFrames.map((frame) => ({
    filename: frame.filename || "",
    intended_offset_ms: frame.intendedOffsetMs ?? frame.offsetMs ?? null,
    actual_elapsed_since_vfx_observed_ms: frame.actualElapsedSinceVfxObserved ?? null,
    frame_debug_read_at: frame.frameDebugReadAt ?? null,
    screenshot_started_at: frame.screenshotStartedAt ?? null,
    screenshot_finished_at: frame.screenshotFinishedAt ?? null,
    screenshot_duration_ms: frame.screenshotDurationMs ?? null,
    active_vfx_count: frame.activeVfxCount || 0,
    last_vfx_family: frame.lastVfxFamily || "",
    last_vfx_sequence_id: frame.lastVfxSequenceId || "",
    persistent_vfx_remaining_ms: asArray(frame.persistentVfxRemainingMs),
    old_beam_hidden: frame.oldBeamHidden ?? null,
    canvas_count: frame.canvasCount ?? null
  }));
  const timingReliable = vfxTimingFrames.length > 0
    && vfxTimingFrames.every((frame) => Number.isFinite(frame.intended_offset_ms) && Number.isFinite(frame.actual_elapsed_since_vfx_observed_ms));
  const dom = combat?.dom || {};
  const viewport = report?.viewport || {};
  const pageErrors = asArray(report?.consoleMessages).filter(isPageError);
  const commandButtonCount = asArray(dom?.commandButtons).filter((button) => button?.visible).length;
  const enemySpriteDetectable = Boolean(dom?.enemySpriteWrapper?.exists);
  const enemySpriteHidden = enemySpriteDetectable ? Boolean(dom.enemySpriteWrapper.hidden) : null;

  const deterministicChecks = [
    {
      id: "capture_report_exists",
      label: "capture-report.json exists and is parseable",
      pass: captureReportExists,
      required: true
    },
    {
      id: "combat_screenshot_exists",
      label: "combat screenshot exists",
      pass: combatScreenshotExists,
      required: true,
      detail: combatShot?.path || "No combat screenshot path recorded."
    },
    {
      id: "combat_marker_exists",
      label: "combat marker exists",
      pass: Boolean(combat.marker),
      required: true,
      detail: combat.marker ? `marker: ${combat.marker}` : "No data-combat-art marker recorded."
    },
    {
      id: "canvas_count_one",
      label: "combat diorama canvas count equals 1",
      pass: combat.canvasCount === 1,
      required: true,
      detail: `canvasCount: ${combat.canvasCount ?? "missing"}`
    },
    {
      id: "viewport_recorded",
      label: "viewport size recorded",
      pass: Boolean(viewport.width && viewport.height),
      required: true,
      detail: viewport.width && viewport.height ? `${viewport.width}x${viewport.height}` : "No viewport recorded."
    },
    {
      id: "no_page_errors",
      label: "no page errors recorded",
      pass: pageErrors.length === 0,
      required: true,
      detail: pageErrors.length ? pageErrors.map((entry) => entry.text).join(" | ") : "No console error/pageerror entries."
    },
    {
      id: "world_city_screenshot_exists",
      label: "world-city hospital screenshot exists",
      pass: worldCityScreenshotExists,
      required: true,
      detail: worldCityShot?.path || "No world-city screenshot path recorded."
    },
    {
      id: "world_city_screen_state",
      label: "world-city screenState was captured",
      pass: worldCity.screenState === "world-city",
      required: true,
      detail: `screenState: ${worldCity.screenState || "missing"}`
    },
    {
      id: "world_city_mounted",
      label: "world-city scene mounted",
      pass: worldCity.worldCityMounted === true,
      required: true,
      detail: `worldCityMounted: ${worldCity.worldCityMounted ?? "missing"}`
    },
    {
      id: "world_city_canvas_count_one",
      label: "world-city canvas count equals 1",
      pass: worldCity.cityCanvasCount === 1,
      required: true,
      detail: `cityCanvasCount: ${worldCity.cityCanvasCount ?? "missing"}`
    },
    {
      id: "world_city_incident_node_count",
      label: "world-city incident node count is at least 2",
      pass: Number(worldCity.visibleIncidentNodeCount || 0) >= 2,
      required: true,
      detail: `visibleIncidentNodeCount: ${worldCity.visibleIncidentNodeCount ?? "missing"}`
    },
    {
      id: "world_city_screen_visible_opacity",
      label: "world-city visible screen opacity is above 0.9",
      pass: Number(worldCity.worldCityScreenOpacity || 0) > 0.9 && worldCity.worldCityScreenVisible === true,
      required: true,
      detail: `opacity: ${worldCity.worldCityScreenOpacity ?? "missing"}, visible: ${worldCity.worldCityScreenVisible ?? "missing"}`
    },
    {
      id: "world_city_title_visible",
      label: "world-city title/header is visible",
      pass: worldCity.worldCityTitleVisible === true,
      required: true,
      detail: worldCity.worldCityTitleText ? `title: ${worldCity.worldCityTitleText}` : "No visible world-city title text recorded."
    },
    {
      id: "world_city_entry_route_recorded",
      label: "world-city entry route recorded",
      pass: Boolean(worldCity.entryRoute),
      required: false,
      detail: `entryRoute: ${worldCity.entryRoute || "missing"}`
    },
    {
      id: "world_city_route_chain_recorded",
      label: "world-city route chain includes region, sector, and city",
      pass: asArray(worldCity.worldState?.routeChain).includes("north-america")
        && asArray(worldCity.worldState?.routeChain).includes("atlantic-medical-corridor")
        && asArray(worldCity.worldState?.routeChain).includes("hospital-lockout"),
      required: false,
      detail: `routeChain: ${asArray(worldCity.worldState?.routeChain).join(" -> ") || "missing"}`
    },
    {
      id: "world_city_hover_hologram",
      label: "world-city hover hologram was captured if hover frame exists",
      pass: worldCityHoverScreenshotExists ? worldCity.hoverHologramVisible === true : true,
      required: false,
      detail: `hoverHologramVisible: ${worldCity.hoverHologramVisible ?? "missing"}`
    },
    {
      id: "globe_region_hover_screenshot_exists",
      label: "North America region hover screenshot exists",
      pass: globeRegionHoverScreenshotExists,
      required: true,
      detail: globeRegionHoverShot?.path || "No globe region hover screenshot path recorded."
    },
    {
      id: "globe_region_screen_state",
      label: "globe region capture stayed on game screen",
      pass: globeRegion.screenState === "game",
      required: true,
      detail: `screenState: ${globeRegion.screenState || "missing"}`
    },
    {
      id: "globe_region_hover_key",
      label: "North America region hover was recorded",
      pass: globeRegion.hoveredRegionKey === "north-america",
      required: true,
      detail: `hoveredRegionKey: ${globeRegion.hoveredRegionKey || "missing"}`
    },
    {
      id: "globe_region_highlight_visible",
      label: "North America region highlight is present",
      pass: globeRegion.regionHighlightVisible === true,
      required: true,
      detail: `regionHighlightVisible: ${globeRegion.regionHighlightVisible ?? "missing"}`
    },
    {
      id: "globe_region_surface_highlight_exists",
      label: "North America surface highlight mesh exists",
      pass: globeRegion.regionSurfaceHighlightObjectExists === true,
      required: true,
      detail: `regionSurfaceHighlightObjectExists: ${globeRegion.regionSurfaceHighlightObjectExists ?? "missing"}`
    },
    {
      id: "globe_region_surface_highlight_visible",
      label: "North America surface highlight is visible during capture",
      pass: globeRegion.regionSurfaceHighlightVisible === true,
      required: true,
      detail: `regionSurfaceHighlightVisible: ${globeRegion.regionSurfaceHighlightVisible ?? "missing"}, opacity: ${globeRegion.regionSurfaceHighlightOpacity ?? "missing"}`
    },
    {
      id: "globe_region_sector_option_visible",
      label: "Atlantic Medical Corridor sector option appears after selection",
      pass: globeRegionSelectedScreenshotExists ? globeRegion.sectorOptionVisible === true : true,
      required: false,
      detail: `sectorOptionVisible: ${globeRegion.sectorOptionVisible ?? "missing"}`
    },
    {
      id: "globe_region_selected_panel_visible",
      label: "selected North America route dossier is visible",
      pass: globeRegionSelectedScreenshotExists ? globeRegion.selectedPanelVisible === true : true,
      required: false,
      detail: `selectedPanelVisible: ${globeRegion.selectedPanelVisible ?? "missing"}`
    },
    {
      id: "shell_viewport_sized",
      label: "combat shell is approximately viewport-sized",
      pass: viewportRatioAtLeast(dom.shell, viewport, 0.9),
      required: true,
      detail: dom.shell?.rect ? `shell: ${Math.round(dom.shell.rect.width)}x${Math.round(dom.shell.rect.height)}` : "No shell rect recorded."
    },
    {
      id: "mount_fills_shell",
      label: "diorama mount approximately fills combat shell",
      pass: ratioAtLeast(dom.dioramaMount, dom.shell, 0.9),
      required: true,
      detail: dom.dioramaMount?.rect ? `mount: ${Math.round(dom.dioramaMount.rect.width)}x${Math.round(dom.dioramaMount.rect.height)}` : "No diorama mount rect recorded."
    },
    {
      id: "party_hud_visible",
      label: "party HUD is visible",
      pass: isVisibleBox(dom.partyHud),
      required: true
    },
    {
      id: "command_menu_visible",
      label: "command menu is visible",
      pass: isVisibleBox(dom.commandMenu) || commandButtonCount > 0,
      required: true,
      detail: `visible command buttons: ${commandButtonCount}`
    },
    {
      id: "enemy_readout_visible",
      label: "enemy readout/status is visible",
      pass: isVisibleBox(dom.enemyReadout),
      required: false
    },
    {
      id: "old_enemy_sprite_hidden",
      label: "old HTML enemy sprite is hidden if detectable",
      pass: enemySpriteDetectable ? enemySpriteHidden === true : true,
      required: false,
      detail: enemySpriteDetectable ? `hidden: ${enemySpriteHidden}` : "Enemy sprite wrapper not detected."
    },
    {
      id: "scan_vfx_screenshot_exists",
      label: "scan VFX screenshot exists",
      pass: scanVfxScreenshotExists,
      required: true,
      detail: scanVfxShot?.path || "No scan VFX screenshot path recorded."
    },
    {
      id: "scan_vfx_burst_frames_exist",
      label: "scan VFX burst screenshots exist",
      pass: existingBurstFrameCount >= 6,
      required: true,
      detail: `burst frame count: ${existingBurstFrameCount}`
    },
    {
      id: "scan_vfx_best_frame_named",
      label: "best scan VFX frame was identified",
      pass: Boolean(bestVfxFrame?.path || bestVfxFrame?.filename),
      required: true,
      detail: bestVfxFrame?.path || bestVfxFrame?.filename || "No best VFX frame recorded."
    },
    {
      id: "scan_vfx_active_observed",
      label: "scan VFX active frame was observed",
      pass: Number(scanVfx.activeVfxCountAtCapture || 0) > 0 || scanVfxFrames.some((frame) => Number(frame?.activeVfxCount || 0) > 0),
      required: true,
      detail: `activeVfxCountAtCapture: ${scanVfx.activeVfxCountAtCapture ?? "missing"}`
    },
    {
      id: "scan_vfx_old_beam_hidden",
      label: "old combat beam hidden during scan VFX capture",
      pass: scanVfx.oldBeamHidden === true,
      required: true,
      detail: `oldBeamHidden: ${scanVfx.oldBeamHidden ?? "missing"}`
    },
    {
      id: "scan_vfx_canvas_count_one",
      label: "scan VFX capture kept one diorama canvas",
      pass: scanVfx.canvasCount === 1,
      required: true,
      detail: `canvasCount: ${scanVfx.canvasCount ?? "missing"}`
    }
  ];

  const failures = deterministicChecks
    .filter((check) => check.required && !check.pass)
    .map((check) => check.label);

  const manualReviewItems = [
    {
      id: "full_screen_battlefield",
      label: "Does combat read as a full-screen 3D battlefield?",
      manual_review_required: true,
      prompt: "Inspect combat-hospital.png for full-viewport world ownership rather than a framed inner stage."
    },
    {
      id: "box_inside_box",
      label: "Does the 3D world avoid box-inside-box framing?",
      manual_review_required: true,
      prompt: "Look for black margins, visible old panel frames, or a diorama that appears trapped inside another container."
    },
    {
      id: "defender_grounding",
      label: "Are defenders grounded or still pasted on?",
      manual_review_required: true,
      prompt: "Check whether HTML defenders align with stage pads/floor perspective."
    },
    {
      id: "enemy_anchor",
      label: "Is the enemy anchored to the breach?",
      manual_review_required: true,
      prompt: "Confirm the visible enemy-side 3D breach/core owns the threat body presence without duplicate enemy sprites."
    },
    {
      id: "ui_center_blockage",
      label: "Does command UI block the battlefield center?",
      manual_review_required: true,
      prompt: "Check whether tactical controls obscure the main action silhouette or preserve readable combat space."
    },
    {
      id: "party_hud_anchor",
      label: "Does party HUD sit bottom-right?",
      manual_review_required: true,
      prompt: "Use the screenshot and DOM rects to verify the reserve strip feels anchored to the combat viewport."
    },
    {
      id: "duplicate_representations",
      label: "Are there duplicate enemy/defender representations?",
      manual_review_required: true,
      prompt: "Look for repeated combatants caused by HTML sprites plus 3D placeholders competing for ownership."
    }
  ];

  const technicalScore = scoreFromFailures(10, failures, 2);
  const visibleUiChecks = [dom.partyHud, dom.commandMenu, dom.enemyReadout].filter(isVisibleBox).length;
  const uiReadabilityScore = failures.includes("party HUD is visible") || failures.includes("command menu is visible")
    ? Math.max(0, 5 + visibleUiChecks)
    : 8;
  const result = {
    generatedAt: new Date().toISOString(),
    accepted: failures.length === 0,
    acceptance_scope: "deterministic technical gates only",
    manual_review_required: true,
    performance_risk: pageErrors.length || combat.canvasCount > 1 ? "high" : combat.canvasCount === 1 ? "low" : "medium",
    scores: {
      technical_correctness: technicalScore,
      visual_composition: failures.length ? 4 : 6,
      game_feel: failures.length ? 4 : 6,
      ui_readability: uiReadabilityScore
    },
    deterministic_checks: deterministicChecks,
    failures,
    manual_review_items: manualReviewItems,
    vfx: {
      manual_review_required: true,
      scan_screenshot_exists: scanVfxScreenshotExists,
      burst_frame_count: existingBurstFrameCount,
      best_vfx_frame: bestVfxFrame?.path || "",
      active_vfx_observed: Number(scanVfx.activeVfxCountAtCapture || 0) > 0 || scanVfxFrames.some((frame) => Number(frame?.activeVfxCount || 0) > 0),
      family_captured: scanVfx.vfxFamilyCaptured || "",
      active_vfx_count_at_capture: scanVfx.activeVfxCountAtCapture || 0,
      last_vfx_sequence_id: scanVfx.lastVfxSequenceId || "",
      old_beam_hidden: scanVfx.oldBeamHidden ?? null,
      canvas_count: scanVfx.canvasCount ?? null,
      ability_label: scanVfx.abilityLabel || "",
      screenshot: scanVfxShot?.path || "",
      frames: scanVfxFrames.map((frame) => ({
        filename: frame.filename || "",
        path: frame.path || "",
        offset_ms: frame.offsetMs ?? null,
        intended_offset_ms: frame.intendedOffsetMs ?? frame.offsetMs ?? null,
        actual_elapsed_since_vfx_observed_ms: frame.actualElapsedSinceVfxObserved ?? null,
        screenshot_duration_ms: frame.screenshotDurationMs ?? null,
        persistent_vfx_remaining_ms: asArray(frame.persistentVfxRemainingMs),
        active_vfx_count: frame.activeVfxCount || 0,
        last_vfx_family: frame.lastVfxFamily || "",
        last_vfx_sequence_id: frame.lastVfxSequenceId || "",
        old_beam_hidden: frame.oldBeamHidden ?? null,
        canvas_count: frame.canvasCount ?? null
      })),
      timing: {
        manual_review_required: true,
        timing_reliable: timingReliable,
        intended_offsets_ms: vfxTimingFrames.map((frame) => frame.intended_offset_ms),
        actual_elapsed_ms: vfxTimingFrames.map((frame) => frame.actual_elapsed_since_vfx_observed_ms),
        best_vfx_frame: bestVfxFrame?.path || bestVfxFrame?.filename || "",
        active_vfx_observed: Number(scanVfx.activeVfxCountAtCapture || 0) > 0 || scanVfxFrames.some((frame) => Number(frame?.activeVfxCount || 0) > 0),
        old_beam_hidden: scanVfx.oldBeamHidden ?? null,
        frames: vfxTimingFrames
      },
      error: scanVfx.error || ""
    },
    world_city: {
      manual_review_required: true,
      screenshot_exists: worldCityScreenshotExists,
      hover_screenshot_exists: worldCityHoverScreenshotExists,
      screen_state: worldCity.screenState || "",
      mounted: worldCity.worldCityMounted === true,
      canvas_count: worldCity.cityCanvasCount ?? null,
      incident_node_count: worldCity.visibleIncidentNodeCount ?? null,
      entry_route: worldCity.entryRoute || "",
      route_chain: asArray(worldCity.worldState?.routeChain),
      route_for_hospital_threat: worldCity.routeForHospitalThreat || null,
      screen_opacity: worldCity.worldCityScreenOpacity ?? null,
      screen_visible: worldCity.worldCityScreenVisible === true,
      title_visible: worldCity.worldCityTitleVisible === true,
      title_text: worldCity.worldCityTitleText || "",
      hover_hologram_visible: worldCity.hoverHologramVisible === true,
      screenshot: worldCityShot?.path || "",
      hover_screenshot: worldCityHoverShot?.path || ""
    },
    globe_region: {
      manual_review_required: true,
      hover_screenshot_exists: globeRegionHoverScreenshotExists,
      selected_screenshot_exists: globeRegionSelectedScreenshotExists,
      screen_state: globeRegion.screenState || "",
      hovered_region_key: globeRegion.hoveredRegionKey || "",
      selected_region_key: globeRegion.selectedRegionKey || "",
      selected_sector_key: globeRegion.selectedSectorKey || "",
      region_highlight_mode: globeRegion.regionHighlightMode || "",
      surface_highlight_object_exists: globeRegion.regionSurfaceHighlightObjectExists === true,
      surface_highlight_visible: globeRegion.regionSurfaceHighlightVisible === true,
      surface_highlight_opacity: globeRegion.regionSurfaceHighlightOpacity ?? null,
      region_highlight_visible: globeRegion.regionHighlightVisible === true,
      selected_panel_visible: globeRegion.selectedPanelVisible === true,
      sector_option_visible: globeRegion.sectorOptionVisible === true,
      hover_screenshot: globeRegionHoverShot?.path || "",
      selected_screenshot: globeRegionSelectedShot?.path || ""
    },
    what_still_looks_fake: [
      "Automated tooling cannot judge whether the battlefield feels cinematic or grounded without human review.",
      "Defender grounding and enemy anchoring still require screenshot inspection against the combat presentation spec.",
      "This critic detects layout/runtime failures, not subjective art quality."
    ],
    what_should_not_be_touched_next: [
      "Combat math, targeting, turn order, modules, rewards, Forge, globe, AudioManager, and save data.",
      "Additional decorative CSS overlays that do not solve a specific composition problem.",
      "Multiple combat canvases or independent render loops."
    ],
    artifacts: {
      capture_report: captureReportPath,
      menu: asArray(report?.screenshots).find((shot) => shot?.screen === "menu")?.path || "",
      globe: asArray(report?.screenshots).find((shot) => shot?.screen === "globe")?.path || "",
      globe_region_north_america_hover: globeRegionHoverShot?.path || "",
      globe_region_north_america_selected: globeRegionSelectedShot?.path || "",
      world_city_hospital: worldCityShot?.path || "",
      world_city_hospital_hover: worldCityHoverShot?.path || "",
      combat: combatShot?.path || "",
      combat_resting: getScreenshot(report, "combat-resting")?.path || "",
      combat_vfx_scan: scanVfxShot?.path || "",
      visual_critic_json: jsonPath,
      visual_critic_md: markdownPath
    }
  };

  await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(markdownPath, buildMarkdownReport(result));

  return result;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runVisualCritic()
    .then((result) => {
      console.log(`Visual critic ${result.accepted ? "accepted" : "rejected"} deterministic gates.`);
      console.log(result.artifacts.visual_critic_json);
      if (result.failures.length) {
        console.error(`Failures: ${result.failures.join(" | ")}`);
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error?.message || String(error));
      process.exitCode = 1;
    });
}
