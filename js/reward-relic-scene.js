/* Lightweight Three.js relic visual for the Recovered Modules reward preview. */
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

class RewardRelicScene {
  constructor(container, options = {}) {
    this.container = container;
    this.sourceId = options.sourceId || "default";
    this.animationFrame = null;
    this.resizeObserver = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.core = null;
    this.ring = null;
    this.orbit = null;
    this.scanBeam = null;
    this.light = null;
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
    this.camera.position.set(0, 0.15, 5.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute("aria-hidden", "true");

    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambient);

    this.light = new THREE.PointLight(getRewardRelicColor(this.sourceId), 1.35, 9);
    this.light.position.set(1.8, 1.5, 2.6);
    this.scene.add(this.light);

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: getRewardRelicColor(this.sourceId),
      emissive: getRewardRelicColor(this.sourceId),
      emissiveIntensity: 0.45,
      metalness: 0.35,
      roughness: 0.28,
      transparent: true,
      opacity: 0.9
    });
    this.core = new THREE.Mesh(new THREE.OctahedronGeometry(0.82, 1), coreMaterial);
    this.scene.add(this.core);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: getRewardRelicColor(this.sourceId),
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide
    });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.018, 12, 96), ringMaterial);
    this.ring.rotation.x = Math.PI / 2.35;
    this.scene.add(this.ring);

    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: getRewardRelicColor(this.sourceId),
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide
    });
    this.orbit = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.01, 8, 84), orbitMaterial);
    this.orbit.rotation.y = Math.PI / 2.9;
    this.scene.add(this.orbit);

    const beamMaterial = new THREE.MeshBasicMaterial({
      color: getRewardRelicColor(this.sourceId),
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.scanBeam = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 2.7), beamMaterial);
    this.scanBeam.position.set(-0.95, 0, -0.08);
    this.scanBeam.rotation.z = -0.32;
    this.scene.add(this.scanBeam);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.animate();
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

  setSource(sourceId) {
    this.sourceId = sourceId || "default";
    const color = new THREE.Color(getRewardRelicColor(this.sourceId));
    [this.core?.material, this.ring?.material, this.orbit?.material, this.scanBeam?.material].forEach((material) => {
      if (!material) {
        return;
      }

      material.color = color.clone();
      if (material.emissive) {
        material.emissive = color.clone();
      }
      material.needsUpdate = true;
    });

    if (this.light) {
      this.light.color = color;
    }
  }

  animate() {
    this.animationFrame = window.requestAnimationFrame(() => this.animate());
    const elapsed = this.clock.getElapsedTime();
    const pulse = 1 + (Math.sin(elapsed * 2.4) * 0.045);

    if (this.core) {
      this.core.rotation.x += 0.008;
      this.core.rotation.y += 0.012;
      this.core.scale.setScalar(pulse);
    }

    if (this.ring) {
      this.ring.rotation.z += 0.006;
      this.ring.material.opacity = 0.34 + (Math.sin(elapsed * 2.1) * 0.08);
    }

    if (this.orbit) {
      this.orbit.rotation.x += 0.004;
      this.orbit.rotation.z -= 0.005;
    }

    if (this.scanBeam) {
      this.scanBeam.position.x = Math.sin(elapsed * 0.9) * 0.62;
      this.scanBeam.material.opacity = 0.12 + (Math.sin(elapsed * 1.7) * 0.05);
    }

    this.renderer?.render(this.scene, this.camera);
  }

  disposeObject(object) {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose?.());
    } else {
      object.material?.dispose?.();
    }
  }

  dispose() {
    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.scene?.traverse((object) => this.disposeObject(object));
    this.renderer?.dispose?.();

    if (this.renderer?.domElement?.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
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
    activeRewardRelicScene.setSource(options.sourceId);
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
