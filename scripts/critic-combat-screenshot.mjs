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

function getCombatScreenshot(report) {
  return asArray(report?.screenshots).find((shot) => shot?.screen === "combat-hospital") || null;
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
  const combatScreenshotExists = Boolean(combatShot?.path && await fileExists(combatShot.path));
  const combat = report?.combat || {};
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
      combat: combatShot?.path || "",
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
