/* Combat 3D Diorama MVP: a contained Three.js scene that mirrors combat state visually.
   It does not own targeting, damage, turn order, or input. */
let activeCombatDioramaScene = null;
let combatDioramaLastError = null;
let combatDioramaLastPlayedVfxSequenceId = "";
let combatDioramaLastPlayedVfxFamily = "";
let combatDioramaPersistentVfx = [];

function getCombatDioramaNowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function pruneCombatDioramaPersistentVfx(nowMs = getCombatDioramaNowMs()) {
  combatDioramaPersistentVfx = combatDioramaPersistentVfx.filter((entry) => {
    const durationMs = Number.isFinite(entry?.durationMs) ? entry.durationMs : 800;
    return entry?.sequenceId && nowMs - entry.startedAtMs < durationMs;
  });
}

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
  if (state?.activeDefenderId) {
    return state.activeDefenderId;
  }
  const actor = state?.turnOrder?.[state.currentTurnIndex];
  if (actor?.kind === "program" && actor.ref) {
    return actor.ref.id || actor.ref.name || "";
  }
  return state?.activeProgramId || "";
}

function getCombatDioramaDefenders(state) {
  if (Array.isArray(state?.defenders)) {
    return state.defenders;
  }
  if (Array.isArray(state?.playerParty)) {
    const activeId = getCombatDioramaActiveProgramId(state);
    const recentlyHitIds = Array.isArray(state?.recentlyHitProgramIds) ? state.recentlyHitProgramIds : [];
    return state.playerParty.slice(0, 4).map((program, index) => {
      const hp = Number.isFinite(program?.hp) ? program.hp : 0;
      const maxHp = Number.isFinite(program?.maxHp) ? program.maxHp : 0;
      const id = program?.id || program?.name || `defender-${index + 1}`;
      return {
        id,
        name: program?.name || `Defender ${index + 1}`,
        slotIndex: index + 1,
        hp,
        maxHp,
        hpRatio: maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0,
        fainted: hp <= 0,
        active: id === activeId,
        recentlyHit: state?.recentlyHitProgramId === id || recentlyHitIds.includes(id),
        role: program?.role || "",
        domain: program?.domain || "",
        affinity: program?.affinity || "",
        color: program?.color || "#6fefe0",
        spriteKey: getCombatDioramaSpriteKey(program),
        statusFlags: Array.isArray(program?.statusEffects) ? program.statusEffects : []
      };
    });
  }
  return [];
}

function getCombatDioramaEnemy(state) {
  if (state?.enemy) {
    return state.enemy;
  }
  const threat = state?.threat || {};
  const hp = Number.isFinite(threat.hp) ? threat.hp : 0;
  const maxHp = Number.isFinite(threat.maxHp) ? threat.maxHp : 0;
  return {
    id: threat.id || threat.title || "threat",
    title: threat.title || "Unknown Threat",
    hp,
    maxHp,
    hpRatio: maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 1,
    level: threat.level || 1,
    type: threat.type || getCombatDioramaSpriteKey(threat)
  };
}

function getCombatDioramaSpriteKey(entity) {
  const raw = String(entity?.spriteKey || entity?.id || entity?.name || "").toLowerCase();
  if (raw.includes("firewall")) {
    return "firewall";
  }
  if (raw.includes("ids") || raw.includes("intrusion")) {
    return "ids";
  }
  if (raw.includes("honeypot")) {
    return "honeypot";
  }
  if (raw.includes("antivirus") || raw.includes("purifier")) {
    return "antivirus";
  }
  return "standard";
}

function getCombatDioramaStateKey(state) {
  const activeProgramId = getCombatDioramaActiveProgramId(state);
  const defenderKey = getCombatDioramaDefenders(state)
    .map((defender) => [
        defender?.id || defender?.name || "defender",
        defender?.hp ?? 0,
        defender?.maxHp ?? 0,
        defender?.active ? "active" : "",
        defender?.recentlyHit ? "hit" : ""
      ].join(":")).join("|")
  const threat = getCombatDioramaEnemy(state);
  return [
    threat.id || threat.title || "threat",
    threat.hp ?? 0,
    threat.maxHp ?? 0,
    activeProgramId,
    state?.battleIntroStage || "",
    state?.visualEffect?.phase || "",
    state?.visualEffect?.targetKind || "",
    state?.visualEffect?.targetId || ""
  ].join("::") + `::${defenderKey}`;
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
    this.defenderAvatarGroup = null;
    this.defenderAvatarCount = 0;
    this.activeDefenderId = "";
    this.defenderIds = [];
    this.adapterUsed = false;
    this.deploymentPads = [];
    this.enemyGroup = null;
    this.breachGroup = null;
    this.floorGroup = null;
    this.enemyCore = null;
    this.enemyCoreMaterial = null;
    this.enemyShellMaterial = null;
    this.enemyHaloMaterial = null;
    this.enemyOwnership = "environment";
    this.characterPlaceholderMode = "disabled";
    this.enemyPlaceholderMode = "disabled";
    this.vfxGroup = null;
    this.activeVfx = [];
    this.lastVfxSequenceId = combatDioramaLastPlayedVfxSequenceId;
    this.lastVfxFamily = combatDioramaLastPlayedVfxFamily;
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
      this.clock = new THREE.Clock();
      this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
      this.camera.position.set(0.1, 4.45, 9.2);
      this.camera.lookAt(0.2, 0.5, -1.35);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.domElement.setAttribute("aria-hidden", "true");
      this.renderer.domElement.className = "combat-diorama-canvas";
      this.container.appendChild(this.renderer.domElement);

      this.buildLighting();
      this.buildEnvironment();
      this.buildActors();
      this.buildVfxLayer();
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

    this.defenderPadPositions().forEach((position) => {
      const padMaterial = this.createMaterial({
        color: 0x103432,
        emissive: 0x1cfff0,
        emissiveIntensity: 0.18,
        metalness: 0.34,
        roughness: 0.42,
        opacity: 0.82
      });
      const pad = this.addMesh(
        this.floorGroup,
        this.createGeometry(THREE.CylinderGeometry, 0.48, 0.58, 0.08, 6),
        padMaterial,
        [position[0], 0.03, position[2]],
        [0, Math.PI / 6, 0],
        [1.25, 0.7, 0.82]
      );
      pad.name = "defender-deployment-pad";

      const contactMaterial = this.createBasicMaterial({ color: 0x72fff2, opacity: 0.12, side: THREE.DoubleSide });
      const contactGlow = this.addMesh(
        this.floorGroup,
        this.createGeometry(THREE.RingGeometry, 0.62, 0.68, 24),
        contactMaterial,
        [position[0], 0.078, position[2]],
        [-Math.PI / 2, 0, 0]
      );
      contactGlow.name = "defender-contact-glow";
      this.deploymentPads.push({ pad, contactGlow, padMaterial, contactMaterial, basePosition: position });
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
    const breachCoreMaterial = this.createBasicMaterial({ color: 0xff5a72, opacity: 0.34, side: THREE.DoubleSide });
    const breachSocket = this.addMesh(
      this.breachGroup,
      this.createGeometry(THREE.CircleGeometry, 0.32, 28),
      breachCoreMaterial,
      [0, 0, -0.04],
      [0.08, -0.28, 0]
    );
    breachSocket.name = "environmental-breach-socket";
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
    this.defenderSlots = [];
    this.buildDefenderAvatars();
    this.buildEnemyBreachAnchor();
    this.characterPlaceholderMode = "threejs-defenders";
    this.enemyPlaceholderMode = "threejs-breach";
    this.enemyOwnership = "threejs-breach";
  }

  buildDefenderAvatars() {
    this.defenderAvatarGroup = new THREE.Group();
    this.defenderAvatarGroup.name = "threejs-defender-avatar-group";
    this.scene.add(this.defenderAvatarGroup);

    this.defenderPadPositions().forEach((position, index) => {
      const avatarRoot = new THREE.Group();
      avatarRoot.name = `threejs-defender-avatar-slot-${index + 1}`;
      avatarRoot.position.set(position[0], 0.24, position[2]);
      avatarRoot.rotation.y = -0.12;
      this.defenderAvatarGroup.add(avatarRoot);

      const baseMaterial = this.createMaterial({
        color: 0x071212,
        emissive: 0x1bfff0,
        emissiveIntensity: 0.14,
        metalness: 0.34,
        roughness: 0.46,
        opacity: 0.78
      });
      const bodyMaterial = this.createMaterial({
        color: 0x163331,
        emissive: 0x35f4e6,
        emissiveIntensity: 0.18,
        metalness: 0.28,
        roughness: 0.54,
        opacity: 0.88
      });
      const coreMaterial = this.createMaterial({
        color: 0x8ffff4,
        emissive: 0x5ffff1,
        emissiveIntensity: 0.72,
        metalness: 0.08,
        roughness: 0.34,
        opacity: 0.92
      });
      const plateMaterial = this.createMaterial({
        color: 0x25413f,
        emissive: 0x32dacf,
        emissiveIntensity: 0.2,
        metalness: 0.38,
        roughness: 0.5,
        opacity: 0.84
      });
      const haloMaterial = this.createBasicMaterial({ color: 0x6fefe0, opacity: 0.18, side: THREE.DoubleSide });
      const shadowMaterial = this.createBasicMaterial({ color: 0x7cffef, opacity: 0.13, side: THREE.DoubleSide });

      const shadow = this.addMesh(
        avatarRoot,
        this.createGeometry(THREE.RingGeometry, 0.48, 0.64, 28),
        shadowMaterial,
        [0, -0.17, 0],
        [-Math.PI / 2, 0, 0],
        [1.25, 0.82, 0.72]
      );
      shadow.name = "threejs-defender-contact-shadow";

      const base = this.addMesh(
        avatarRoot,
        this.createGeometry(THREE.CylinderGeometry, 0.24, 0.34, 0.16, 6),
        baseMaterial,
        [0, -0.08, 0],
        [0, Math.PI / 6, 0],
        [1.1, 0.78, 0.9]
      );
      base.name = "threejs-defender-avatar-base";

      const torso = this.addMesh(
        avatarRoot,
        this.createGeometry(THREE.CylinderGeometry, 0.2, 0.28, 0.7, 6),
        bodyMaterial,
        [0, 0.3, 0],
        [0.04, Math.PI / 6, 0],
        [0.82, 1, 0.7]
      );
      torso.name = "threejs-defender-avatar-torso";

      const core = this.addMesh(
        avatarRoot,
        this.createGeometry(THREE.OctahedronGeometry, 0.15, 0),
        coreMaterial,
        [0, 0.34, 0.18],
        [0.2, 0.4, 0],
        [0.9, 1.12, 0.9]
      );
      core.name = "threejs-defender-avatar-core";

      const head = this.addMesh(
        avatarRoot,
        this.createGeometry(THREE.DodecahedronGeometry, 0.18, 0),
        plateMaterial,
        [0, 0.78, 0.02],
        [0.08, 0.28, 0],
        [0.86, 0.74, 0.86]
      );
      head.name = "threejs-defender-avatar-head";

      const leftShoulder = this.addMesh(
        avatarRoot,
        this.createGeometry(THREE.BoxGeometry, 0.24, 0.12, 0.14),
        plateMaterial,
        [-0.28, 0.54, 0.02],
        [0.04, 0.18, -0.2],
        [1, 0.8, 1]
      );
      leftShoulder.name = "threejs-defender-avatar-shoulder-left";

      const rightShoulder = this.addMesh(
        avatarRoot,
        this.createGeometry(THREE.BoxGeometry, 0.24, 0.12, 0.14),
        plateMaterial,
        [0.28, 0.54, 0.02],
        [0.04, -0.18, 0.2],
        [1, 0.8, 1]
      );
      rightShoulder.name = "threejs-defender-avatar-shoulder-right";

      const halo = this.addMesh(
        avatarRoot,
        this.createGeometry(THREE.TorusGeometry, 0.44, 0.012, 8, 36),
        haloMaterial,
        [0, 0.42, 0.04],
        [Math.PI / 2.18, 0, 0],
        [0.88, 0.88, 0.88]
      );
      halo.name = "threejs-defender-avatar-halo";

      this.defenderSlots.push({
        root: avatarRoot,
        base,
        torso,
        core,
        head,
        leftShoulder,
        rightShoulder,
        halo,
        shadow,
        baseMaterial,
        bodyMaterial,
        coreMaterial,
        plateMaterial,
        haloMaterial,
        shadowMaterial,
        basePosition: position,
        defender: null,
        active: false,
        fainted: false,
        recentlyHit: false,
        roleKey: "standard",
        bobOffset: index * 0.72
      });
    });

    this.defenderAvatarCount = this.defenderSlots.length;
  }

  buildEnemyBreachAnchor() {
    this.enemyGroup = new THREE.Group();
    this.enemyGroup.position.set(3.18, 1.05, -3.62);
    this.enemyGroup.rotation.y = -0.22;
    this.scene.add(this.enemyGroup);

    this.enemyShellMaterial = this.createMaterial({
      color: 0x321018,
      emissive: 0xff2448,
      emissiveIntensity: 0.3,
      metalness: 0.24,
      roughness: 0.48,
      opacity: 0.9
    });
    this.enemyCoreMaterial = this.createMaterial({
      color: 0xff4b63,
      emissive: 0xff223c,
      emissiveIntensity: 0.74,
      metalness: 0.12,
      roughness: 0.38,
      opacity: 0.86
    });
    this.enemyHaloMaterial = this.createBasicMaterial({ color: 0xff536b, opacity: 0.2, side: THREE.DoubleSide });

    const socketMaterial = this.createMaterial({
      color: 0x1a0b10,
      emissive: 0xff314b,
      emissiveIntensity: 0.28,
      metalness: 0.38,
      roughness: 0.5,
      opacity: 0.86
    });
    this.addMesh(
      this.enemyGroup,
      this.createGeometry(THREE.CylinderGeometry, 0.72, 0.88, 0.18, 6),
      socketMaterial,
      [0, -0.6, 0.02],
      [Math.PI / 2, Math.PI / 6, 0],
      [1.18, 0.78, 1]
    );

    this.enemyCore = this.addMesh(
      this.enemyGroup,
      this.createGeometry(THREE.IcosahedronGeometry, 0.58, 0),
      this.enemyCoreMaterial,
      [0, 0, 0],
      [0.16, 0.38, 0.08],
      [1, 1.25, 1]
    );
    this.enemyCore.name = "threejs-threat-breach-core";

    const shell = this.addMesh(
      this.enemyGroup,
      this.createGeometry(THREE.OctahedronGeometry, 0.82, 0),
      this.enemyShellMaterial,
      [0, 0, -0.02],
      [0.2, 0.42, 0.08],
      [1.04, 1.24, 1.04]
    );
    shell.name = "threejs-threat-breach-shell";

    const halo = this.addMesh(
      this.enemyGroup,
      this.createGeometry(THREE.TorusGeometry, 1.06, 0.018, 8, 42),
      this.enemyHaloMaterial,
      [0, 0.02, -0.06],
      [0.16, -0.28, 0.14]
    );
    halo.name = "threejs-threat-breach-halo";

    const shardMaterial = this.createBasicMaterial({ color: 0xff8c63, opacity: 0.24, side: THREE.DoubleSide });
    [
      [-0.86, 0.08, -0.04, 0.34],
      [0.86, -0.04, -0.02, -0.32],
      [-0.42, 0.78, -0.08, 0.12],
      [0.48, -0.72, -0.05, -0.18]
    ].forEach(([x, y, z, rotation]) => {
      this.addMesh(
        this.enemyGroup,
        this.createGeometry(THREE.BoxGeometry, 0.08, 0.58, 0.035),
        shardMaterial,
        [x, y, z],
        [0.08, -0.12, rotation]
      );
    });
  }

  buildVfxLayer() {
    this.vfxGroup = new THREE.Group();
    this.vfxGroup.name = "threejs-combat-ability-vfx-group";
    this.scene.add(this.vfxGroup);
  }

  getVfxDefenderPosition(defenderId) {
    const matchingSlot = this.defenderSlots.find((slot) => slot.defender?.id === defenderId);
    const position = matchingSlot?.root?.position || this.defenderSlots.find((slot) => slot.root?.visible)?.root?.position;
    if (position) {
      return new THREE.Vector3(position.x, Math.max(0.55, position.y + 0.34), position.z + 0.12);
    }
    return new THREE.Vector3(-3.2, 0.7, -0.45);
  }

  getVfxEnemyPosition() {
    if (this.enemyGroup) {
      return new THREE.Vector3(
        this.enemyGroup.position.x,
        this.enemyGroup.position.y + 0.12,
        this.enemyGroup.position.z + 0.08
      );
    }
    return new THREE.Vector3(3.18, 1.12, -3.55);
  }

  createVfxMaterial(color, opacity = 0.72) {
    return this.createBasicMaterial({
      color,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  addVfxMesh(group, geometry, material, position = new THREE.Vector3(), rotation = [0, 0, 0], scale = [1, 1, 1]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.set(...rotation);
    mesh.scale.set(...scale);
    group.add(mesh);
    return mesh;
  }

  addVfxCylinderBetween(group, start, end, radius, color, opacity = 0.68) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = Math.max(0.01, direction.length());
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const geometry = this.createGeometry(THREE.CylinderGeometry, radius, radius, length, 8, 1, true);
    const material = this.createVfxMaterial(color, opacity);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(midpoint);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    group.add(mesh);
    return mesh;
  }

  queueCombatVfx(effect, options = {}) {
    if (!this.vfxGroup || !effect) {
      return;
    }
    const sequenceId = String(effect.sequenceId || effect.effectId || effect.createdAt || "");
    if (!sequenceId) {
      return;
    }
    if (!options.restore && (sequenceId === this.lastVfxSequenceId || sequenceId === combatDioramaLastPlayedVfxSequenceId)) {
      return;
    }

    const profile = effect.vfxProfile || {};
    const family = effect.vfxFamily || profile.family || "generic_strike";
    const color = getCombatDioramaColor(profile.color, family === "purge" ? "#ff6f4d" : "#f5d07a");
    const secondaryColor = getCombatDioramaColor(profile.secondaryColor, "#6fefe0");
    const durationMs = Number.isFinite(profile.durationMs) ? profile.durationMs : 820;
    const nowMs = getCombatDioramaNowMs();
    const startedAtMs = Number.isFinite(options.startedAtMs) ? options.startedAtMs : nowMs;
    const elapsedMs = Math.max(0, nowMs - startedAtMs);
    if (elapsedMs >= durationMs) {
      pruneCombatDioramaPersistentVfx(nowMs);
      return;
    }
    const origin = effect.attackerKind === "program"
      ? this.getVfxDefenderPosition(effect.attackerId)
      : this.getVfxEnemyPosition();
    const target = effect.targetKind === "program"
      ? this.getVfxDefenderPosition(effect.targetId)
      : this.getVfxEnemyPosition();
    const root = new THREE.Group();
    root.name = `threejs-combat-vfx-${family}`;
    root.userData.family = family;
    root.userData.createdAt = (this.clock ? this.clock.getElapsedTime() : 0) - (elapsedMs / 1000);
    root.userData.duration = durationMs / 1000;
    root.userData.baseScale = 1;
    root.userData.origin = origin.clone();
    root.userData.target = target.clone();
    this.vfxGroup.add(root);

    if (family === "scan") {
      this.buildScanVfx(root, origin, target, color, secondaryColor);
    } else if (family === "purge") {
      this.buildPurgeVfx(root, origin, target, color, secondaryColor);
    } else if (family === "containment") {
      this.buildContainmentVfx(root, target, color, secondaryColor);
    } else if (family === "firewall" || family === "recovery") {
      this.buildDefensiveVfx(root, origin, color, secondaryColor, family);
    } else if (family === "enemy_payload") {
      this.buildEnemyPayloadVfx(root, origin, target, color, secondaryColor);
    } else {
      this.buildGenericStrikeVfx(root, origin, target, color, secondaryColor);
    }

    this.activeVfx.push({ root, sequenceId, family });
    this.lastVfxSequenceId = sequenceId;
    this.lastVfxFamily = family;
    if (!options.restore) {
      combatDioramaLastPlayedVfxSequenceId = sequenceId;
      combatDioramaLastPlayedVfxFamily = family;
      pruneCombatDioramaPersistentVfx(nowMs);
      if (!combatDioramaPersistentVfx.some((entry) => entry.sequenceId === sequenceId)) {
        combatDioramaPersistentVfx.push({
          sequenceId,
          family,
          effect: {
            ...effect,
            vfxProfile: effect.vfxProfile && typeof effect.vfxProfile === "object" ? { ...effect.vfxProfile } : null
          },
          durationMs,
          startedAtMs
        });
      }
    }
  }

  buildScanVfx(root, origin, target, color, secondaryColor) {
    const originPulse = this.addVfxMesh(
      root,
      this.createGeometry(THREE.RingGeometry, 0.36, 0.44, 34),
      this.createVfxMaterial(color, 0.5),
      origin.clone().add(new THREE.Vector3(0, -0.32, 0)),
      [-Math.PI / 2, 0, 0]
    );
    originPulse.userData.scalePulse = 0.9;

    this.addVfxCylinderBetween(root, origin, target, 0.01, color, 0.14);

    [-0.22, 0.02, 0.26].forEach((offset, index) => {
      const ring = this.addVfxMesh(
        root,
        this.createGeometry(THREE.RingGeometry, 0.42 + index * 0.2, 0.46 + index * 0.2, 40),
        this.createVfxMaterial(index === 1 ? secondaryColor : color, index === 1 ? 0.42 : 0.56),
        new THREE.Vector3(target.x, target.y + offset, target.z),
        [0.18, -0.32, index * 0.18]
      );
      ring.userData.scalePulse = 0.72 + index * 0.24;
    });

    const targetFlash = this.addVfxMesh(
      root,
      this.createGeometry(THREE.CircleGeometry, 0.24, 28),
      this.createVfxMaterial(color, 0.34),
      target.clone().add(new THREE.Vector3(0, 0.04, -0.02)),
      [0.18, -0.32, 0]
    );
    targetFlash.userData.scalePulse = 1.1;

    [0.18, 0.28, 0.38, 0.5, 0.62, 0.74, 0.84].forEach((mix, index) => {
      const packetPosition = origin.clone().lerp(target, mix);
      const packet = this.addVfxMesh(
        root,
        this.createGeometry(THREE.BoxGeometry, 0.16, 0.035, 0.035),
        this.createVfxMaterial(index % 2 ? secondaryColor : color, 0.78),
        packetPosition,
        [0.2, -0.45, 0.12]
      );
      packet.userData.travelPulse = index * 0.045;
      packet.userData.scalePulse = 0.18;
    });
  }

  buildPurgeVfx(root, origin, target, color, secondaryColor) {
    this.addVfxCylinderBetween(root, origin, target, 0.032, color, 0.74);
    this.addVfxCylinderBetween(root, origin.clone().add(new THREE.Vector3(0, 0.08, 0.05)), target, 0.012, secondaryColor, 0.48);
    const burst = this.addVfxMesh(
      root,
      this.createGeometry(THREE.OctahedronGeometry, 0.34, 0),
      this.createVfxMaterial(color, 0.62),
      target,
      [0.2, 0.4, 0.1]
    );
    burst.userData.scalePulse = 1.2;
  }

  buildContainmentVfx(root, target, color, secondaryColor) {
    [0.58, 0.86, 1.12].forEach((radius, index) => {
      const ring = this.addVfxMesh(
        root,
        this.createGeometry(THREE.TorusGeometry, radius, 0.018, 8, 44),
        this.createVfxMaterial(index === 1 ? secondaryColor : color, index === 1 ? 0.32 : 0.48),
        target.clone().add(new THREE.Vector3(0, index * 0.18 - 0.12, 0)),
        [Math.PI / 2.8, -0.2, index * 0.4]
      );
      ring.userData.scalePulse = 0.34 + index * 0.12;
    });
    [-0.6, -0.2, 0.2, 0.6].forEach((xOffset) => {
      this.addVfxMesh(
        root,
        this.createGeometry(THREE.BoxGeometry, 0.035, 1.22, 0.035),
        this.createVfxMaterial(color, 0.38),
        target.clone().add(new THREE.Vector3(xOffset, 0, 0.05)),
        [0.08, -0.28, 0]
      );
    });
  }

  buildDefensiveVfx(root, origin, color, secondaryColor, family) {
    const baseOpacity = family === "recovery" ? 0.42 : 0.5;
    const ring = this.addVfxMesh(
      root,
      this.createGeometry(THREE.RingGeometry, 0.62, 0.7, 34),
      this.createVfxMaterial(color, baseOpacity),
      origin.clone().add(new THREE.Vector3(0, -0.28, 0)),
      [-Math.PI / 2, 0, 0]
    );
    ring.userData.scalePulse = 0.85;
    [-0.34, 0, 0.34].forEach((xOffset, index) => {
      const plate = this.addVfxMesh(
        root,
        this.createGeometry(THREE.BoxGeometry, 0.28, 0.58, 0.05),
        this.createVfxMaterial(index === 1 ? secondaryColor : color, 0.42),
        origin.clone().add(new THREE.Vector3(xOffset, 0.18 + index * 0.05, 0.2)),
        [0.08, -0.15 + xOffset * 0.22, 0.04]
      );
      plate.userData.scalePulse = 0.28 + index * 0.08;
    });
  }

  buildEnemyPayloadVfx(root, origin, target, color, secondaryColor) {
    this.addVfxCylinderBetween(root, origin, target, 0.026, color, 0.58);
    const corruption = this.addVfxMesh(
      root,
      this.createGeometry(THREE.TorusGeometry, 0.42, 0.02, 8, 30),
      this.createVfxMaterial(secondaryColor, 0.38),
      target,
      [Math.PI / 2.4, 0.25, 0.2]
    );
    corruption.userData.scalePulse = 0.65;
  }

  buildGenericStrikeVfx(root, origin, target, color, secondaryColor) {
    this.addVfxCylinderBetween(root, origin, target, 0.024, color, 0.58);
    const impact = this.addVfxMesh(
      root,
      this.createGeometry(THREE.IcosahedronGeometry, 0.22, 0),
      this.createVfxMaterial(secondaryColor, 0.5),
      target,
      [0.1, 0.4, 0.2]
    );
    impact.userData.scalePulse = 0.95;
  }

  updateCombatVfxFromPresentationState(presentationState) {
    const effect = presentationState?.visualEffect;
    if (!effect || effect.phase === "recover") {
      return;
    }
    this.queueCombatVfx(effect);
  }

  restorePersistentVfx() {
    if (!this.vfxGroup) {
      return;
    }
    const nowMs = getCombatDioramaNowMs();
    pruneCombatDioramaPersistentVfx(nowMs);
    combatDioramaPersistentVfx.forEach((entry) => {
      if (this.activeVfx.some((activeEntry) => activeEntry.sequenceId === entry.sequenceId)) {
        return;
      }
      this.queueCombatVfx(entry.effect, { restore: true, startedAtMs: entry.startedAtMs });
    });
  }

  updateActiveVfx(elapsed) {
    this.activeVfx = this.activeVfx.filter((entry) => {
      const root = entry.root;
      if (!root?.parent) {
        return false;
      }
      const duration = root.userData.duration || 0.8;
      const age = elapsed - (root.userData.createdAt ?? elapsed);
      const progress = Math.max(0, Math.min(1, age / duration));
      const fade = Math.max(0, 1 - progress);
      root.children.forEach((child, index) => {
        if (child.material) {
          child.material.opacity = Math.max(0, (child.material.opacity || 0) * 0.86 + fade * 0.14);
        }
        if (child.userData.scalePulse) {
          const pulse = 1 + (Math.sin(progress * Math.PI) * child.userData.scalePulse);
          child.scale.setScalar(pulse);
        }
        if (child.userData.travelPulse !== undefined) {
          const origin = root.userData.origin;
          const target = root.userData.target;
          const travel = Math.max(0, Math.min(1, progress + child.userData.travelPulse));
          child.position.copy(origin.clone().lerp(target, travel));
          child.rotation.x += 0.06;
          child.rotation.y += 0.08 + index * 0.01;
        } else {
          child.rotation.z += 0.012 + index * 0.002;
        }
      });
      if (progress >= 1) {
        this.disposeVfxRoot(root);
        return false;
      }
      return true;
    });
  }

  disposeVfxRoot(root) {
    root?.traverse?.((object) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose?.());
      } else {
        object.material?.dispose?.();
      }
    });
    root?.parent?.remove?.(root);
  }

  clearCombatVfx() {
    this.activeVfx.forEach((entry) => this.disposeVfxRoot(entry.root));
    this.activeVfx = [];
    if (this.vfxGroup) {
      while (this.vfxGroup.children.length) {
        this.disposeVfxRoot(this.vfxGroup.children[0]);
      }
    }
  }

  update(state) {
    this.state = state || this.state;
    this.adapterUsed = Array.isArray(this.state?.defenders);
    this.lastStateKey = getCombatDioramaStateKey(this.state);
    this.lastStateTitle = this.state?.threatTitle || this.state?.threat?.title || this.state?.enemy?.title || "";
    this.activeDefenderId = getCombatDioramaActiveProgramId(this.state);
    this.updateDeploymentPads();
    this.updateDefenderAvatars();
    this.updateBreach();
    this.restorePersistentVfx();
    this.updateCombatVfxFromPresentationState(this.state);
  }

  updateDeploymentPads() {
    const defenders = getCombatDioramaDefenders(this.state);
    this.deploymentPads.forEach((slot, index) => {
      const defender = defenders[index] || null;
      const visible = Boolean(defender);
      const alive = visible && !defender.fainted;
      const isActive = alive && Boolean(defender.active);
      const hpRatio = Number.isFinite(defender?.hpRatio) ? defender.hpRatio : 0;
      const color = new THREE.Color(getCombatDioramaColor(defender?.color, "#6fefe0"));
      slot.pad.visible = visible;
      slot.contactGlow.visible = visible;
      slot.pad.scale.set(isActive ? 1.38 : 1.18, 0.7, isActive ? 0.92 : 0.78);
      slot.contactGlow.scale.setScalar(isActive ? 1.24 : 0.95);
      slot.padMaterial.color.copy(color);
      slot.padMaterial.emissive.copy(color);
      slot.padMaterial.emissiveIntensity = isActive ? 0.34 : 0.12 + (hpRatio * 0.08);
      slot.padMaterial.opacity = alive ? 0.76 : 0.24;
      slot.contactMaterial.color.copy(color);
      slot.contactMaterial.opacity = isActive ? 0.34 : alive ? 0.12 : 0.04;
      slot.contactBaseOpacity = slot.contactMaterial.opacity;
    });
  }

  updateDefenderAvatars() {
    const defenders = getCombatDioramaDefenders(this.state);
    this.defenderIds = defenders.map((defender) => defender?.id).filter(Boolean);
    this.defenderSlots.forEach((slot, index) => {
      const defender = defenders[index] || null;
      const visible = Boolean(defender);
      const active = visible && Boolean(defender.active);
      const fainted = visible && Boolean(defender.fainted);
      const recentlyHit = visible && Boolean(defender.recentlyHit);
      const hpRatio = Number.isFinite(defender?.hpRatio) ? defender.hpRatio : 0;
      const color = new THREE.Color(getCombatDioramaColor(defender?.color, "#6fefe0"));
      const hitColor = new THREE.Color(0xff5d70);
      const displayColor = recentlyHit ? hitColor : color;
      const roleKey = defender?.spriteKey || "standard";

      slot.root.visible = visible;
      slot.defender = defender;
      slot.active = active;
      slot.fainted = fainted;
      slot.recentlyHit = recentlyHit;
      slot.roleKey = roleKey;

      if (!visible) {
        return;
      }

      const lift = fainted ? -0.12 : active ? 0.1 : 0;
      slot.root.position.set(slot.basePosition[0], 0.24 + lift, slot.basePosition[2]);
      slot.root.scale.setScalar(fainted ? 0.78 : active ? 1.12 : 0.96);
      slot.root.rotation.y = active ? -0.24 : -0.12;

      slot.baseMaterial.color.copy(displayColor).multiplyScalar(fainted ? 0.28 : 0.34);
      slot.baseMaterial.emissive.copy(displayColor);
      slot.baseMaterial.emissiveIntensity = fainted ? 0.04 : active ? 0.28 : 0.12 + (hpRatio * 0.1);
      slot.baseMaterial.opacity = fainted ? 0.28 : 0.76;

      slot.bodyMaterial.color.copy(displayColor).multiplyScalar(fainted ? 0.22 : 0.42);
      slot.bodyMaterial.emissive.copy(displayColor);
      slot.bodyMaterial.emissiveIntensity = fainted ? 0.04 : active ? 0.34 : 0.16 + (hpRatio * 0.08);
      slot.bodyMaterial.opacity = fainted ? 0.34 : 0.86;

      slot.coreMaterial.color.copy(displayColor);
      slot.coreMaterial.emissive.copy(displayColor);
      slot.coreMaterial.emissiveIntensity = fainted ? 0.08 : active ? 1.08 : recentlyHit ? 0.98 : 0.56 + (hpRatio * 0.22);
      slot.coreMaterial.opacity = fainted ? 0.3 : 0.92;

      slot.plateMaterial.color.copy(displayColor).multiplyScalar(fainted ? 0.24 : 0.5);
      slot.plateMaterial.emissive.copy(displayColor);
      slot.plateMaterial.emissiveIntensity = fainted ? 0.04 : active ? 0.32 : 0.14;
      slot.plateMaterial.opacity = fainted ? 0.28 : 0.82;

      slot.haloMaterial.color.copy(displayColor);
      slot.haloMaterial.opacity = fainted ? 0.03 : active ? 0.34 : 0.16;
      slot.shadowMaterial.color.copy(displayColor);
      slot.shadowMaterial.opacity = fainted ? 0.04 : active ? 0.22 : 0.12;

      const isFirewall = roleKey === "firewall";
      const isIds = roleKey === "ids";
      const isHoneypot = roleKey === "honeypot";
      const isAntivirus = roleKey === "antivirus";
      slot.torso.scale.set(isFirewall ? 1.04 : isIds ? 0.74 : 0.86, isFirewall ? 1.06 : isHoneypot ? 0.9 : 1, isIds ? 0.62 : 0.72);
      slot.head.scale.set(isHoneypot ? 0.78 : 0.86, isAntivirus ? 0.9 : 0.74, isHoneypot ? 1.08 : 0.86);
      slot.leftShoulder.scale.set(isFirewall ? 1.28 : isAntivirus ? 0.7 : 1, isFirewall ? 1.1 : 0.8, 1);
      slot.rightShoulder.scale.copy(slot.leftShoulder.scale);
      slot.halo.visible = !fainted && (active || isIds || isAntivirus);
      slot.halo.scale.setScalar(active ? 1.08 : isIds ? 1 : 0.84);
    });
  }

  updateBreach() {
    if (!this.breachGroup) {
      return;
    }
    const threat = getCombatDioramaEnemy(this.state);
    const hpRatio = Number.isFinite(threat.hpRatio) ? threat.hpRatio : 1;
    this.breachGroup.scale.setScalar(0.96 + (hpRatio * 0.06));
    if (this.enemyGroup) {
      this.enemyGroup.scale.setScalar(0.86 + (hpRatio * 0.12));
    }
    if (this.enemyCoreMaterial) {
      this.enemyCoreMaterial.emissiveIntensity = 0.42 + (hpRatio * 0.46);
      this.enemyCoreMaterial.opacity = 0.72 + (hpRatio * 0.16);
    }
    if (this.enemyShellMaterial) {
      this.enemyShellMaterial.emissiveIntensity = 0.18 + (hpRatio * 0.24);
    }
    if (this.enemyHaloMaterial) {
      this.enemyHaloMaterial.opacity = 0.12 + (hpRatio * 0.12);
    }
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

    this.deploymentPads.forEach((slot, index) => {
      if (slot.contactGlow.visible) {
        slot.contactGlow.rotation.z = Math.sin(elapsed * 0.45 + index) * 0.08;
        slot.contactMaterial.opacity = Math.max(0.04, (slot.contactBaseOpacity || 0.08) + (Math.sin(elapsed * 1.4 + index) * 0.018));
      }
    });

    this.defenderSlots.forEach((slot) => {
      if (!slot.root.visible || slot.fainted) {
        return;
      }
      const pulse = Math.sin(elapsed * (slot.active ? 1.7 : 1.05) + slot.bobOffset);
      slot.root.position.y = 0.24 + (slot.active ? 0.1 : 0) + (pulse * (slot.active ? 0.045 : 0.024));
      slot.core.rotation.x += slot.active ? 0.014 : 0.008;
      slot.core.rotation.y += slot.active ? 0.018 : 0.01;
      slot.halo.rotation.z += slot.active ? 0.012 : 0.006;
      slot.shadowMaterial.opacity = Math.max(0.04, (slot.active ? 0.2 : 0.1) + (pulse * 0.018));
    });

    if (this.breachGroup) {
      this.breachGroup.rotation.z += 0.004;
      this.breachGroup.scale.setScalar(1 + (Math.sin(elapsed * 1.9) * 0.035));
    }
    if (this.enemyGroup) {
      this.enemyGroup.rotation.z = Math.sin(elapsed * 0.5) * 0.035;
    }
    if (this.enemyCore) {
      this.enemyCore.rotation.x += 0.0035;
      this.enemyCore.rotation.y += 0.005;
      this.enemyCore.position.y = Math.sin(elapsed * 1.4) * 0.045;
    }

    this.restorePersistentVfx();
    this.updateActiveVfx(elapsed);

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
    this.clearCombatVfx();
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
    this.defenderAvatarGroup = null;
    this.defenderAvatarCount = 0;
    this.activeDefenderId = "";
    this.defenderIds = [];
    this.adapterUsed = false;
    this.deploymentPads = [];
    this.enemyGroup = null;
    this.breachGroup = null;
    this.floorGroup = null;
    this.enemyCore = null;
    this.enemyCoreMaterial = null;
    this.enemyShellMaterial = null;
    this.enemyHaloMaterial = null;
    this.vfxGroup = null;
    this.activeVfx = [];
    this.lastVfxSequenceId = combatDioramaLastPlayedVfxSequenceId;
    this.lastVfxFamily = combatDioramaLastPlayedVfxFamily;
  }
}

function getCombatDioramaMarker(mount) {
  return mount?.closest?.(".combat-shell")?.getAttribute("data-combat-art") || "";
}

function getCombatDioramaWorldLayerPresent(mount) {
  return Boolean(mount?.closest?.(".combat-world-layer"));
}

function isCombatDioramaEnemyHtmlSpriteHidden(mount) {
  const root = mount?.closest?.(".combat-shell");
  const sprite = root?.querySelector?.(".combat-stage-enemy .combat-battler-sprite-wrap");
  if (!sprite) {
    return false;
  }
  if (typeof getComputedStyle !== "function") {
    return sprite.hidden || sprite.getAttribute("aria-hidden") === "true";
  }
  return getComputedStyle(sprite).display === "none" || getComputedStyle(sprite).visibility === "hidden";
}

function isCombatDioramaOldBeamHidden(mount) {
  const root = mount?.closest?.(".combat-shell");
  const beam = root?.querySelector?.(".combat-beam");
  if (!beam) {
    return true;
  }
  if (typeof getComputedStyle !== "function") {
    return beam.hidden || beam.getAttribute("aria-hidden") === "true";
  }
  const style = getComputedStyle(beam);
  return style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0;
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
    marker: getCombatDioramaMarker(mount),
    worldLayerPresent: getCombatDioramaWorldLayerPresent(mount),
    enemyHtmlSpriteHidden: isCombatDioramaEnemyHtmlSpriteHidden(mount),
    lastStateTitle: scene?.lastStateTitle || "",
    lastStateKey: scene?.lastStateKey || "",
    characterPlaceholders: scene?.characterPlaceholderMode || "disabled",
    defenderAvatarCount: scene?.defenderAvatarCount || 0,
    activeDefenderId: scene?.activeDefenderId || "",
    defenderIds: scene?.defenderIds || [],
    adapterUsed: Boolean(scene?.adapterUsed),
    enemyPlaceholder: scene?.enemyPlaceholderMode || "disabled",
    enemyOwnership: scene?.enemyOwnership || "none",
    activeVfxCount: scene?.activeVfx?.length || 0,
    lastVfxSequenceId: scene?.lastVfxSequenceId || combatDioramaLastPlayedVfxSequenceId || "",
    lastVfxFamily: scene?.lastVfxFamily || combatDioramaLastPlayedVfxFamily || "",
    vfxGroupExists: Boolean(scene?.vfxGroup),
    persistentVfxCount: combatDioramaPersistentVfx.length,
    persistentVfxFamilies: combatDioramaPersistentVfx.map((entry) => entry.family).filter(Boolean),
    persistentVfxRemainingMs: combatDioramaPersistentVfx.map((entry) => Math.max(0, Math.round((entry.durationMs || 0) - (getCombatDioramaNowMs() - entry.startedAtMs)))),
    oldBeamHidden: isCombatDioramaOldBeamHidden(mount),
    screenState: getCombatDioramaScreenState(),
    lastError: combatDioramaLastError
  };
}

if (typeof globalThis !== "undefined") {
  globalThis.mountCombatDioramaScene = mountCombatDioramaScene;
  globalThis.updateCombatDioramaScene = updateCombatDioramaScene;
  globalThis.destroyCombatDioramaScene = destroyCombatDioramaScene;
  globalThis.getCombatDioramaDebugState = getCombatDioramaDebugState;
  globalThis.devCombatDioramaState = getCombatDioramaDebugState;
}
