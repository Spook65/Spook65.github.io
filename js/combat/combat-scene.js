/* Combat 3D Diorama MVP: a contained Three.js scene that mirrors combat state visually.
   It does not own targeting, damage, turn order, or input. */
let activeCombatDioramaScene = null;
let combatDioramaLastError = null;

function getCombatDioramaScreenState() {
  if (typeof screenState !== "undefined") {
    return screenState;
  }
  if (typeof window !== "undefined" && typeof window.screenState !== "undefined") {
    return window.screenState;
  }
  return "unknown";
}

function getCombatDioramaColor(value, fallback = "#6fefe0") {
  const safeValue = String(value || "").trim();
  if (/^#[0-9a-f]{3,8}$/i.test(safeValue) || /^rgba?\(/i.test(safeValue)) {
    return safeValue;
  }
  return fallback;
}

function getCombatDioramaActiveProgramId(state) {
  const actor = state?.turnOrder?.[state.currentTurnIndex];
  if (actor?.kind === "program" && actor.ref) {
    return actor.ref.id || actor.ref.name || "";
  }
  return state?.activeProgramId || "";
}

function getCombatDioramaStateKey(state) {
  const activeProgramId = getCombatDioramaActiveProgramId(state);
  const partyKey = Array.isArray(state?.playerParty)
    ? state.playerParty.map((program) => [
        program?.id || program?.name || "defender",
        program?.hp ?? 0,
        program?.maxHp ?? 0
      ].join(":")).join("|")
    : "";
  const threat = state?.threat || {};
  return [
    threat.id || threat.title || "threat",
    threat.hp ?? 0,
    threat.maxHp ?? 0,
    activeProgramId,
    state?.battleIntroStage || "",
    state?.visualEffect?.phase || "",
    state?.visualEffect?.targetKind || "",
    state?.visualEffect?.targetId || ""
  ].join("::") + `::${partyKey}`;
}

class CombatDioramaScene {
  constructor(container, state) {
    this.container = container;
    this.state = state;
    this.animationFrame = null;
    this.resizeObserver = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = null;
    this.materials = [];
    this.geometries = [];
    this.defenderSlots = [];
    this.enemyGroup = null;
    this.breachGroup = null;
    this.floorGroup = null;
    this.lastStateKey = "";
    this.lastStateTitle = "";
    this.lastObjectCount = 0;
    this.animationRunning = false;
    this.init();
  }

  init() {
    if (!this.container) {
      combatDioramaLastError = "Missing combat diorama container.";
      return;
    }
    if (typeof THREE === "undefined") {
      combatDioramaLastError = "THREE unavailable.";
      this.container.classList.add("is-unavailable");
      return;
    }

    try {
      this.container.innerHTML = "";
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.Fog(0x05070a, 7.5, 18);
      this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
      this.camera.position.set(0.2, 4.25, 8.7);
      this.camera.lookAt(0.15, 0.7, -1.1);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.domElement.setAttribute("aria-hidden", "true");
      this.renderer.domElement.className = "combat-diorama-canvas";
      this.container.appendChild(this.renderer.domElement);

      this.buildLighting();
      this.buildEnvironment();
      this.buildActors();
      this.resize();

      if (typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);
      } else {
        window.addEventListener("resize", this.resize);
      }

      this.update(this.state);
      this.animate();
    } catch (error) {
      combatDioramaLastError = error?.message || String(error);
      this.dispose();
      this.container?.classList.add("is-unavailable");
    }
  }

  createMaterial(options = {}) {
    const material = new THREE.MeshStandardMaterial({
      color: options.color ?? 0xffffff,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
      metalness: options.metalness ?? 0.15,
      roughness: options.roughness ?? 0.72,
      transparent: options.opacity < 1,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
      depthWrite: options.depthWrite ?? true
    });
    this.materials.push(material);
    return material;
  }

  createBasicMaterial(options = {}) {
    const material = new THREE.MeshBasicMaterial({
      color: options.color ?? 0xffffff,
      transparent: options.opacity < 1,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
      depthWrite: options.depthWrite ?? false
    });
    this.materials.push(material);
    return material;
  }

  createGeometry(GeometryClass, ...args) {
    const geometry = new GeometryClass(...args);
    this.geometries.push(geometry);
    return geometry;
  }

  addMesh(group, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.scale.set(...scale);
    group.add(mesh);
    return mesh;
  }

  buildLighting() {
    this.scene.add(new THREE.AmbientLight(0xbddad5, 0.36));
    const keyLight = new THREE.DirectionalLight(0xffbd7c, 1.15);
    keyLight.position.set(-3.5, 6.2, 3.6);
    this.scene.add(keyLight);

    const threatLight = new THREE.PointLight(0xff4967, 1.7, 11);
    threatLight.position.set(3.4, 2.2, -3.8);
    this.scene.add(threatLight);

    const defenderLight = new THREE.PointLight(0x6fefe0, 1.15, 9);
    defenderLight.position.set(-3.4, 1.4, 0.6);
    this.scene.add(defenderLight);
  }

  buildEnvironment() {
    this.floorGroup = new THREE.Group();
    this.scene.add(this.floorGroup);

    const floorMaterial = this.createMaterial({
      color: 0x091315,
      emissive: 0x071312,
      emissiveIntensity: 0.2,
      metalness: 0.22,
      roughness: 0.84
    });
    const floor = this.addMesh(
      this.floorGroup,
      this.createGeometry(THREE.PlaneGeometry, 12.5, 10.5, 1, 1),
      floorMaterial,
      [0, -0.08, -1.3],
      [-Math.PI / 2, 0, 0]
    );
    floor.name = "hospital-network-floor";

    const laneMaterial = this.createBasicMaterial({ color: 0x68e6dc, opacity: 0.18, side: THREE.DoubleSide });
    [-2.8, -1.25, 0.35, 1.95].forEach((x, index) => {
      const lane = this.addMesh(
        this.floorGroup,
        this.createGeometry(THREE.PlaneGeometry, 0.035, 8.4),
        laneMaterial,
        [x, 0.006 + (index * 0.001), -1.15],
        [-Math.PI / 2, 0, 0]
      );
      lane.name = "network-lane-line";
    });

    const cableMaterial = this.createBasicMaterial({ color: 0xffb75f, opacity: 0.22, side: THREE.DoubleSide });
    [-0.9, 0.9].forEach((x) => {
      this.addMesh(
        this.floorGroup,
        this.createGeometry(THREE.PlaneGeometry, 0.045, 5.2),
        cableMaterial,
        [x, 0.012, -2.1],
        [-Math.PI / 2, 0, x * 0.12]
      );
    });

    const padMaterial = this.createMaterial({
      color: 0x103432,
      emissive: 0x1cfff0,
      emissiveIntensity: 0.22,
      metalness: 0.34,
      roughness: 0.42,
      opacity: 0.84
    });
    this.defenderPadPositions().forEach((position) => {
      const pad = this.addMesh(
        this.floorGroup,
        this.createGeometry(THREE.CylinderGeometry, 0.48, 0.58, 0.08, 6),
        padMaterial,
        [position[0], 0.03, position[2]],
        [0, Math.PI / 6, 0],
        [1.25, 0.7, 0.82]
      );
      pad.name = "defender-deployment-pad";
    });

    const wallGroup = new THREE.Group();
    wallGroup.position.set(2.9, 1.35, -5.2);
    wallGroup.rotation.y = -0.18;
    this.scene.add(wallGroup);

    const wallMaterial = this.createMaterial({
      color: 0x17151a,
      emissive: 0x2a0d13,
      emissiveIntensity: 0.28,
      metalness: 0.25,
      roughness: 0.62
    });
    this.addMesh(wallGroup, this.createGeometry(THREE.BoxGeometry, 3.8, 2.7, 0.18), wallMaterial);

    const monitorMaterial = this.createBasicMaterial({ color: 0xff536b, opacity: 0.72 });
    [-0.95, 0, 0.95].forEach((x, index) => {
      this.addMesh(
        wallGroup,
        this.createGeometry(THREE.BoxGeometry, 0.72, 0.32, 0.04),
        monitorMaterial,
        [x, 0.55 - (index * 0.55), 0.12]
      );
    });

    this.breachGroup = new THREE.Group();
    this.breachGroup.position.set(3.2, 0.95, -3.65);
    this.scene.add(this.breachGroup);

    const breachMaterial = this.createBasicMaterial({ color: 0xff3458, opacity: 0.22, side: THREE.DoubleSide });
    this.addMesh(this.breachGroup, this.createGeometry(THREE.RingGeometry, 0.72, 1.55, 40), breachMaterial, [0, 0, 0], [0.08, -0.28, 0]);
    this.addMesh(this.breachGroup, this.createGeometry(THREE.RingGeometry, 1.85, 1.9, 48), breachMaterial, [0, 0, -0.02], [0.08, -0.28, Math.PI / 8]);
  }

  defenderPadPositions() {
    return [
      [-3.25, 0, 0.2],
      [-2.2, 0, -0.75],
      [-3.95, 0, -1.45],
      [-2.75, 0, -2.35]
    ];
  }

  buildActors() {
    this.defenderSlots = this.defenderPadPositions().map((position, index) => {
      const group = new THREE.Group();
      group.position.set(position[0], 0.2, position[2]);
      this.scene.add(group);

      const bodyMaterial = this.createMaterial({
        color: 0x7deee5,
        emissive: 0x45fff0,
        emissiveIntensity: 0.34,
        metalness: 0.18,
        roughness: 0.44,
        opacity: 0.9
      });
      const coreMaterial = this.createBasicMaterial({ color: 0xdffdf8, opacity: 0.62 });
      this.addMesh(group, this.createGeometry(THREE.CylinderGeometry, 0.16, 0.22, 0.78, 12), bodyMaterial, [0, 0.36, 0]);
      this.addMesh(group, this.createGeometry(THREE.SphereGeometry, 0.18, 12, 8), bodyMaterial, [0, 0.86, 0]);
      this.addMesh(group, this.createGeometry(THREE.RingGeometry, 0.34, 0.38, 20), coreMaterial, [0, 0.42, 0], [Math.PI / 2, 0, 0]);

      return {
        group,
        bodyMaterial,
        coreMaterial,
        basePosition: position,
        index
      };
    });

    this.enemyGroup = new THREE.Group();
    this.enemyGroup.position.set(3.2, 0.75, -3.6);
    this.scene.add(this.enemyGroup);

    const enemyMaterial = this.createMaterial({
      color: 0x2a0710,
      emissive: 0xff355c,
      emissiveIntensity: 0.58,
      metalness: 0.18,
      roughness: 0.5
    });
    const enemyCore = this.addMesh(
      this.enemyGroup,
      this.createGeometry(THREE.IcosahedronGeometry, 0.62, 1),
      enemyMaterial,
      [0, 0.32, 0],
      [0.3, 0.15, 0]
    );
    enemyCore.name = "enemy-corruption-core";

    const enemyRingMaterial = this.createBasicMaterial({ color: 0xff5a72, opacity: 0.34, side: THREE.DoubleSide });
    this.addMesh(this.enemyGroup, this.createGeometry(THREE.RingGeometry, 0.88, 0.94, 36), enemyRingMaterial, [0, 0.36, 0], [0.2, -0.15, 0]);
  }

  update(state) {
    this.state = state || this.state;
    this.lastStateKey = getCombatDioramaStateKey(this.state);
    this.lastStateTitle = this.state?.threat?.title || "";
    this.updateDefenders();
    this.updateEnemy();
  }

  updateDefenders() {
    const party = Array.isArray(this.state?.playerParty) ? this.state.playerParty : [];
    const activeId = getCombatDioramaActiveProgramId(this.state);
    this.defenderSlots.forEach((slot, index) => {
      const program = party[index] || null;
      const alive = program && program.hp > 0;
      const isActive = alive && (program.id || program.name) === activeId;
      const hpRatio = alive && Number.isFinite(program.maxHp) && program.maxHp > 0
        ? Math.max(0, Math.min(1, program.hp / program.maxHp))
        : 0;
      const color = new THREE.Color(getCombatDioramaColor(program?.color, "#6fefe0"));
      slot.group.visible = Boolean(program);
      slot.group.position.y = isActive ? 0.34 : 0.2;
      slot.group.scale.setScalar(isActive ? 1.18 : 0.92);
      slot.bodyMaterial.color.copy(color);
      slot.bodyMaterial.emissive.copy(color);
      slot.bodyMaterial.emissiveIntensity = isActive ? 0.58 : 0.22 + (hpRatio * 0.16);
      slot.bodyMaterial.opacity = alive ? 0.88 : 0.24;
      slot.coreMaterial.opacity = isActive ? 0.86 : 0.38;
    });
  }

  updateEnemy() {
    if (!this.enemyGroup) {
      return;
    }
    const threat = this.state?.threat || {};
    const hpRatio = Number.isFinite(threat.maxHp) && threat.maxHp > 0
      ? Math.max(0, Math.min(1, threat.hp / threat.maxHp))
      : 1;
    const scale = 0.9 + (hpRatio * 0.22);
    this.enemyGroup.scale.setScalar(scale);
  }

  resize = () => {
    if (!this.container || !this.renderer || !this.camera) {
      return;
    }
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  isActiveScreen() {
    return getCombatDioramaScreenState() === "combat";
  }

  animate() {
    if (!this.renderer || !this.scene || !this.camera || !this.container?.isConnected || !this.isActiveScreen()) {
      this.animationRunning = false;
      this.animationFrame = null;
      if (activeCombatDioramaScene === this) {
        activeCombatDioramaScene = null;
      }
      this.dispose();
      return;
    }

    this.animationRunning = true;
    this.animationFrame = window.requestAnimationFrame(() => this.animate());
    const elapsed = this.clock ? this.clock.getElapsedTime() : 0;

    this.defenderSlots.forEach((slot, index) => {
      if (slot.group.visible) {
        slot.group.rotation.y = Math.sin(elapsed * 0.55 + index) * 0.08;
        slot.group.position.x = slot.basePosition[0] + (Math.sin(elapsed * 0.75 + index) * 0.025);
      }
    });

    if (this.enemyGroup) {
      this.enemyGroup.rotation.y += 0.006;
      this.enemyGroup.position.y = 0.75 + (Math.sin(elapsed * 1.35) * 0.06);
    }

    if (this.breachGroup) {
      this.breachGroup.rotation.z += 0.004;
      this.breachGroup.scale.setScalar(1 + (Math.sin(elapsed * 1.9) * 0.035));
    }

    this.renderer.render(this.scene, this.camera);
    this.lastObjectCount = 0;
    this.scene.traverse(() => {
      this.lastObjectCount += 1;
    });
  }

  disposeObject(object) {
    object.geometry?.dispose?.();
  }

  dispose() {
    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.animationRunning = false;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener("resize", this.resize);
    this.scene?.traverse((object) => this.disposeObject(object));
    this.geometries.forEach((geometry) => geometry.dispose?.());
    this.materials.forEach((material) => material.dispose?.());
    this.renderer?.dispose?.();
    if (this.renderer?.domElement?.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.materials = [];
    this.geometries = [];
    this.defenderSlots = [];
    this.enemyGroup = null;
    this.breachGroup = null;
    this.floorGroup = null;
  }
}

function destroyCombatDioramaScene() {
  activeCombatDioramaScene?.dispose();
  activeCombatDioramaScene = null;
}

function mountCombatDioramaScene(container, state) {
  if (!container) {
    destroyCombatDioramaScene();
    combatDioramaLastError = "Missing mount container.";
    return null;
  }

  if (typeof THREE === "undefined") {
    combatDioramaLastError = "THREE unavailable.";
    container.classList.add("is-unavailable");
    destroyCombatDioramaScene();
    return null;
  }

  if (activeCombatDioramaScene?.container === container) {
    activeCombatDioramaScene.update(state);
    return activeCombatDioramaScene;
  }

  destroyCombatDioramaScene();
  activeCombatDioramaScene = new CombatDioramaScene(container, state);
  return activeCombatDioramaScene;
}

function updateCombatDioramaScene(state) {
  if (!activeCombatDioramaScene) {
    return null;
  }
  activeCombatDioramaScene.update(state);
  return activeCombatDioramaScene;
}

function getCombatDioramaDebugState() {
  const scene = activeCombatDioramaScene;
  const mount = scene?.container || null;
  return {
    mounted: Boolean(scene),
    rendererExists: Boolean(scene?.renderer),
    mountConnected: Boolean(mount?.isConnected),
    animationRunning: Boolean(scene?.animationRunning),
    canvasCount: mount ? mount.querySelectorAll("canvas").length : 0,
    objectCount: scene?.lastObjectCount || 0,
    lastStateTitle: scene?.lastStateTitle || "",
    lastStateKey: scene?.lastStateKey || "",
    screenState: getCombatDioramaScreenState(),
    lastError: combatDioramaLastError
  };
}

if (typeof window !== "undefined") {
  window.mountCombatDioramaScene = mountCombatDioramaScene;
  window.updateCombatDioramaScene = updateCombatDioramaScene;
  window.destroyCombatDioramaScene = destroyCombatDioramaScene;
  window.getCombatDioramaDebugState = getCombatDioramaDebugState;
  window.devCombatDioramaState = getCombatDioramaDebugState;
}
