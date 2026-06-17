/* Lightweight Three.js gear relic visual for the Recovered Modules reward preview. */
const rewardRelicSourceColors = {
  oracle_ids: "#61dcff",
  hermes_relay: "#3ddcb1",
  athena_firewall: "#ffce57",
  hephaestus_forge: "#ff8056",
  asclepius_recovery: "#67e8a8",
  arachne_web: "#c77eff",
  default: "#7fb7b0"
};

let activeRewardRelicScene = null;

function getRewardRelicColor(sourceId) {
  return rewardRelicSourceColors[sourceId] || rewardRelicSourceColors.default;
}

function getRewardRelicType(options = {}) {
  const relicType = String(options.relicType || "").trim().toLowerCase();
  if (["lens", "relay", "shield", "plate", "disk", "web"].includes(relicType)) {
    return relicType;
  }

  const sourceId = String(options.sourceId || "").trim().toLowerCase();
  if (sourceId === "oracle_ids") {
    return "lens";
  }
  if (sourceId === "hermes_relay") {
    return "relay";
  }
  if (sourceId === "athena_firewall") {
    return "shield";
  }
  if (sourceId === "hephaestus_forge") {
    return "plate";
  }
  if (sourceId === "asclepius_recovery") {
    return "disk";
  }
  if (sourceId === "arachne_web") {
    return "web";
  }

  return "lens";
}

class RewardRelicScene {
  constructor(container, options = {}) {
    this.container = container;
    this.sourceId = options.sourceId || "default";
    this.relicType = getRewardRelicType(options);
    this.animationFrame = null;
    this.resizeObserver = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.relicGroup = null;
    this.pulseGroup = null;
    this.scanBeam = null;
    this.light = null;
    this.materials = [];
    this.clock = new THREE.Clock();

    this.init();
  }

  init() {
    if (!this.container || typeof THREE === "undefined") {
      return;
    }

    this.container.innerHTML = "";
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    this.camera.position.set(0, 0.14, 5.4);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute("aria-hidden", "true");

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.38));
    this.light = new THREE.PointLight(getRewardRelicColor(this.sourceId), 1.4, 9);
    this.light.position.set(1.8, 1.5, 2.7);
    this.scene.add(this.light);

    this.relicGroup = new THREE.Group();
    this.pulseGroup = new THREE.Group();
    this.scene.add(this.pulseGroup);
    this.scene.add(this.relicGroup);

    this.buildRelic();
    this.addScanBeam();
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.animate();
  }

  createMaterial(kind = "standard", opacity = 1) {
    const color = getRewardRelicColor(this.sourceId);
    const material = kind === "basic"
      ? new THREE.MeshBasicMaterial({
          color,
          transparent: opacity < 1,
          opacity,
          side: THREE.DoubleSide,
          depthWrite: opacity >= 0.85
        })
      : new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.38,
          metalness: 0.42,
          roughness: 0.3,
          transparent: opacity < 1,
          opacity
        });
    this.materials.push(material);
    return material;
  }

  addMesh(group, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.scale.set(...scale);
    group.add(mesh);
    return mesh;
  }

  buildRelic() {
    if (this.relicType === "relay") {
      this.buildRelayRelic();
      return;
    }
    if (this.relicType === "shield") {
      this.buildShieldRelic();
      return;
    }
    if (this.relicType === "plate") {
      this.buildPlateRelic();
      return;
    }
    if (this.relicType === "disk") {
      this.buildDiskRelic();
      return;
    }
    if (this.relicType === "web") {
      this.buildWebRelic();
      return;
    }
    this.buildLensRelic();
  }

  buildLensRelic() {
    const glass = this.createMaterial("basic", 0.34);
    const metal = this.createMaterial("standard", 0.94);
    this.addMesh(this.relicGroup, new THREE.CylinderGeometry(0.82, 0.82, 0.08, 72), glass, [0, 0, 0], [Math.PI / 2, 0, 0]);
    this.addMesh(this.relicGroup, new THREE.TorusGeometry(0.86, 0.035, 12, 96), metal, [0, 0, 0], [Math.PI / 2, 0, 0]);
    this.addMesh(this.relicGroup, new THREE.BoxGeometry(1.18, 0.52, 0.08), metal, [0, -0.12, -0.2], [0, 0, 0], [1, 1, 1]);
    this.addMesh(this.pulseGroup, new THREE.TorusGeometry(1.18, 0.012, 8, 96), this.createMaterial("basic", 0.28), [0, 0, -0.04], [Math.PI / 2.7, 0, 0]);
  }

  buildRelayRelic() {
    const metal = this.createMaterial("standard", 0.92);
    const glow = this.createMaterial("basic", 0.35);
    this.addMesh(this.relicGroup, new THREE.TorusGeometry(0.78, 0.065, 16, 96), metal, [0, 0, 0], [Math.PI / 2.4, 0, 0]);
    this.addMesh(this.relicGroup, new THREE.TorusGeometry(1.08, 0.018, 10, 96), glow, [0, 0, 0], [Math.PI / 2.9, 0.45, 0]);
    [[0.92, 0.26, 0], [-0.86, -0.18, 0], [0.04, 0.72, 0]].forEach((position) => {
      this.addMesh(this.relicGroup, new THREE.SphereGeometry(0.09, 18, 18), metal, position);
    });
    this.addMesh(this.pulseGroup, new THREE.TorusGeometry(1.34, 0.012, 8, 96), glow, [0, 0, -0.05], [Math.PI / 2.2, 0, 0.3]);
  }

  buildShieldRelic() {
    const metal = this.createMaterial("standard", 0.94);
    const glow = this.createMaterial("basic", 0.3);
    this.addMesh(this.relicGroup, new THREE.BoxGeometry(0.88, 1.22, 0.08), metal, [0, 0, 0], [0, 0, 0], [0.86, 1, 1]);
    this.addMesh(this.relicGroup, new THREE.BoxGeometry(0.18, 1.48, 0.1), metal, [0, 0, 0.05], [0, 0, -0.68]);
    this.addMesh(this.relicGroup, new THREE.BoxGeometry(0.18, 1.48, 0.1), metal, [0, 0, 0.05], [0, 0, 0.68]);
    this.addMesh(this.relicGroup, new THREE.TorusGeometry(0.58, 0.02, 8, 64), glow, [0, 0.03, 0.12], [Math.PI / 2, 0, 0]);
    this.addMesh(this.pulseGroup, new THREE.TorusGeometry(1.18, 0.012, 8, 96), glow, [0, 0, -0.06], [Math.PI / 2.35, 0, 0]);
  }

  buildPlateRelic() {
    const metal = this.createMaterial("standard", 0.94);
    const glow = this.createMaterial("basic", 0.32);
    this.addMesh(this.relicGroup, new THREE.BoxGeometry(1.34, 0.86, 0.12), metal, [0, 0, 0]);
    this.addMesh(this.relicGroup, new THREE.BoxGeometry(0.08, 1.08, 0.08), glow, [-0.42, 0, 0.09]);
    this.addMesh(this.relicGroup, new THREE.BoxGeometry(0.08, 1.08, 0.08), glow, [0.42, 0, 0.09]);
    this.addMesh(this.relicGroup, new THREE.BoxGeometry(1.58, 0.05, 0.08), glow, [0, 0.28, 0.1]);
    this.addMesh(this.relicGroup, new THREE.BoxGeometry(1.58, 0.05, 0.08), glow, [0, -0.28, 0.1]);
    this.addMesh(this.pulseGroup, new THREE.TorusGeometry(1.18, 0.012, 8, 96), glow, [0, 0, -0.05], [Math.PI / 2.5, 0, 0.45]);
  }

  buildDiskRelic() {
    const metal = this.createMaterial("standard", 0.94);
    const glow = this.createMaterial("basic", 0.34);
    this.addMesh(this.relicGroup, new THREE.CylinderGeometry(0.72, 0.72, 0.14, 72), metal, [0, 0, 0], [Math.PI / 2, 0, 0]);
    this.addMesh(this.relicGroup, new THREE.TorusGeometry(0.46, 0.02, 8, 72), glow, [0, 0, 0.09], [Math.PI / 2, 0, 0]);
    this.addMesh(this.relicGroup, new THREE.TorusGeometry(0.86, 0.014, 8, 96), glow, [0, 0, -0.02], [Math.PI / 2.25, 0, 0]);
    this.addMesh(this.pulseGroup, new THREE.TorusGeometry(1.18, 0.012, 8, 96), glow, [0, 0, -0.06], [Math.PI / 2.35, 0, 0]);
  }

  buildWebRelic() {
    const metal = this.createMaterial("standard", 0.9);
    const glow = this.createMaterial("basic", 0.32);
    this.addMesh(this.relicGroup, new THREE.OctahedronGeometry(0.34, 0), metal, [0, 0, 0]);
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      const x = Math.cos(angle) * 0.72;
      const y = Math.sin(angle) * 0.72;
      this.addMesh(this.relicGroup, new THREE.SphereGeometry(0.07, 14, 14), metal, [x, y, 0]);
      this.addMesh(this.relicGroup, new THREE.BoxGeometry(0.72, 0.018, 0.018), glow, [x / 2, y / 2, 0], [0, 0, angle]);
    }
    this.addMesh(this.pulseGroup, new THREE.TorusGeometry(1.1, 0.012, 8, 96), glow, [0, 0, -0.05], [Math.PI / 2.5, 0, 0]);
  }

  addScanBeam() {
    this.scanBeam = this.addMesh(
      this.scene,
      new THREE.PlaneGeometry(0.34, 2.8),
      this.createMaterial("basic", 0.16),
      [-0.88, 0, -0.14],
      [0, 0, -0.32]
    );
    this.scanBeam.material.blending = THREE.AdditiveBlending;
    this.scanBeam.material.depthWrite = false;
  }

  resize() {
    if (!this.container || !this.renderer || !this.camera) {
      return;
    }

    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  animate() {
    this.animationFrame = window.requestAnimationFrame(() => this.animate());
    const elapsed = this.clock.getElapsedTime();
    const pulse = 1 + (Math.sin(elapsed * 2.4) * 0.035);

    if (this.relicGroup) {
      this.relicGroup.rotation.y += 0.009;
      this.relicGroup.rotation.x = Math.sin(elapsed * 0.55) * 0.12;
      this.relicGroup.scale.setScalar(pulse);
    }

    if (this.pulseGroup) {
      this.pulseGroup.rotation.z += 0.007;
      this.pulseGroup.scale.setScalar(1 + (Math.sin(elapsed * 1.8) * 0.055));
    }

    if (this.scanBeam) {
      this.scanBeam.position.x = Math.sin(elapsed * 0.9) * 0.58;
      this.scanBeam.material.opacity = 0.1 + (Math.sin(elapsed * 1.7) * 0.045);
    }

    this.renderer?.render(this.scene, this.camera);
  }

  disposeObject(object) {
    object.geometry?.dispose?.();
  }

  dispose() {
    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.scene?.traverse((object) => this.disposeObject(object));
    this.materials.forEach((material) => material.dispose?.());
    this.renderer?.dispose?.();

    if (this.renderer?.domElement?.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.materials = [];
  }
}

function destroyRewardRelicScene() {
  activeRewardRelicScene?.dispose();
  activeRewardRelicScene = null;
}

function mountRewardRelicScene(container, options = {}) {
  if (!container || typeof THREE === "undefined" || typeof ResizeObserver === "undefined") {
    return null;
  }

  if (activeRewardRelicScene?.container === container) {
    return activeRewardRelicScene;
  }

  destroyRewardRelicScene();
  activeRewardRelicScene = new RewardRelicScene(container, options);
  return activeRewardRelicScene;
}

if (typeof window !== "undefined") {
  window.mountRewardRelicScene = mountRewardRelicScene;
  window.destroyRewardRelicScene = destroyRewardRelicScene;
  window.getRewardRelicColor = getRewardRelicColor;
}
