/* Three.js city incident diorama for the Hospital Network Lockout world-city slice. */
let citySceneState = {
  mounted: false,
  renderer: null,
  scene: null,
  camera: null,
  container: null,
  animationFrameId: null,
  resizeObserver: null,
  raycaster: null,
  pointer: null,
  nodeMeshes: [],
  landmarks: [],
  disposable: [],
  data: null,
  callbacks: {},
  hoveredIncidentId: "",
  lastError: "",
  startedAt: 0
};

function getCityScreenState() {
  if (typeof screenState !== "undefined") {
    return screenState;
  }
  if (typeof window !== "undefined" && typeof window.screenState !== "undefined") {
    return window.screenState;
  }
  return "";
}

function trackCityDisposable(object) {
  citySceneState.disposable.push(object);
  return object;
}

function createCityMaterial(options) {
  return trackCityDisposable(new THREE.MeshStandardMaterial(options));
}

function createCityLineMaterial(options) {
  return trackCityDisposable(new THREE.LineBasicMaterial(options));
}

function addBox(scene, size, position, material) {
  const geometry = trackCityDisposable(new THREE.BoxGeometry(size.x, size.y, size.z));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y, position.z);
  scene.add(mesh);
  return mesh;
}

function addBoxRotated(scene, size, position, rotation, material) {
  const mesh = addBox(scene, size, position, material);
  mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
  return mesh;
}

function addCylinder(scene, radiusTop, radiusBottom, height, radialSegments, position, rotation, material) {
  const geometry = trackCityDisposable(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
  scene.add(mesh);
  return mesh;
}

function addPlane(scene, size, position, rotation, material) {
  const geometry = trackCityDisposable(new THREE.PlaneGeometry(size.x, size.y));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.rotation.set(rotation.x, rotation.y, rotation.z);
  scene.add(mesh);
  return mesh;
}

function addLine(scene, points, material) {
  const geometry = trackCityDisposable(new THREE.BufferGeometry().setFromPoints(points));
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  return line;
}

function addLandmark(name, object) {
  object.name = name;
  citySceneState.landmarks.push(name);
  return object;
}

function buildHospitalCityScene(scene, data) {
  const floorMaterial = createCityMaterial({
    color: 0x050b10,
    roughness: 0.94,
    metalness: 0.1
  });
  addPlane(
    scene,
    { x: 9.6, y: 6.6 },
    { x: 0, y: -0.04, z: 0 },
    { x: -Math.PI / 2, y: 0, z: 0 },
    floorMaterial
  );

  const roadMaterial = createCityMaterial({
    color: 0x101b20,
    roughness: 0.86,
    metalness: 0.12,
    transparent: true,
    opacity: 0.88
  });
  const roadStripeMaterial = createCityMaterial({
    color: 0xffc874,
    emissive: 0xff8b3d,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.62
  });
  addLandmark("emergency-road-loop", addPlane(scene, { x: 7.6, y: 0.42 }, { x: 0, y: -0.025, z: 0.92 }, { x: -Math.PI / 2, y: 0, z: 0.02 }, roadMaterial));
  addPlane(scene, { x: 0.42, y: 5.15 }, { x: -1.5, y: -0.022, z: -0.15 }, { x: -Math.PI / 2, y: 0, z: 0.1 }, roadMaterial);
  addPlane(scene, { x: 2.2, y: 0.3 }, { x: 0.05, y: -0.02, z: -1.83 }, { x: -Math.PI / 2, y: 0, z: -0.12 }, roadMaterial);
  for (let i = 0; i < 8; i += 1) {
    addPlane(scene, { x: 0.18, y: 0.018 }, { x: -3.05 + i * 0.84, y: -0.006, z: 0.93 }, { x: -Math.PI / 2, y: 0, z: 0.02 }, roadStripeMaterial);
  }
  for (let i = 0; i < 5; i += 1) {
    addPlane(scene, { x: 0.018, y: 0.16 }, { x: -1.5, y: -0.004, z: -1.95 + i * 0.78 }, { x: -Math.PI / 2, y: 0, z: 0.1 }, roadStripeMaterial);
  }

  const hospitalMaterial = createCityMaterial({
    color: 0x223039,
    roughness: 0.72,
    metalness: 0.16,
    emissive: 0x102c2b,
    emissiveIntensity: 0.22
  });
  const hospitalDarkMaterial = createCityMaterial({
    color: 0x17242a,
    roughness: 0.78,
    metalness: 0.18,
    emissive: 0x071614,
    emissiveIntensity: 0.2
  });
  addLandmark("ehr-hospital-main-tower", addBox(scene, { x: 1.9, y: 1.38, z: 0.78 }, { x: 0.6, y: 0.65, z: -1.28 }, hospitalMaterial));
  addBox(scene, { x: 0.68, y: 2.08, z: 0.62 }, { x: 1.66, y: 1.0, z: -1.08 }, hospitalDarkMaterial);
  addBox(scene, { x: 1.2, y: 0.78, z: 0.44 }, { x: -0.34, y: 0.34, z: -1.18 }, hospitalDarkMaterial);
  addBox(scene, { x: 0.86, y: 0.55, z: 0.42 }, { x: 0.72, y: 0.24, z: -2.0 }, hospitalDarkMaterial);

  const coreMaterial = createCityMaterial({
    color: 0x26151d,
    roughness: 0.56,
    metalness: 0.22,
    emissive: 0xd95735,
    emissiveIntensity: 0.58
  });
  addLandmark("ransomware-ehr-core", addBox(scene, { x: 0.48, y: 1.74, z: 0.46 }, { x: 1.68, y: 1.04, z: -0.58 }, coreMaterial));
  addBox(scene, { x: 0.62, y: 0.08, z: 0.62 }, { x: 1.68, y: 1.96, z: -0.58 }, coreMaterial);

  const windowMaterial = createCityMaterial({
    color: 0x63f0d6,
    emissive: 0x18d2bc,
    emissiveIntensity: 0.72,
    transparent: true,
    opacity: 0.58
  });
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 3; row += 1) {
      addBox(scene, { x: 0.18, y: 0.08, z: 0.03 }, { x: 0.05 + column * 0.36, y: 0.54 + row * 0.22, z: -0.92 }, windowMaterial);
    }
  }
  for (let column = 0; column < 2; column += 1) {
    for (let row = 0; row < 5; row += 1) {
      addBox(scene, { x: 0.12, y: 0.08, z: 0.03 }, { x: 1.5 + column * 0.26, y: 0.48 + row * 0.25, z: -0.75 }, windowMaterial);
    }
  }

  const crossMaterial = createCityMaterial({
    color: 0xffd88c,
    emissive: 0xff9f43,
    emissiveIntensity: 0.62
  });
  addBox(scene, { x: 0.38, y: 0.08, z: 0.04 }, { x: 0.65, y: 1.34, z: -0.92 }, crossMaterial);
  addBox(scene, { x: 0.08, y: 0.38, z: 0.04 }, { x: 0.65, y: 1.34, z: -0.91 }, crossMaterial);

  const helipadMaterial = createCityMaterial({
    color: 0x0f2428,
    emissive: 0x1cdcc8,
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide
  });
  const helipadLineMaterial = createCityMaterial({
    color: 0xddeee7,
    emissive: 0x91fff0,
    emissiveIntensity: 0.48,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });
  addLandmark("rooftop-medical-helipad", addCylinder(scene, 0.32, 0.32, 0.02, 32, { x: 0.72, y: 1.36, z: -1.28 }, { x: 0, y: 0, z: 0 }, helipadMaterial));
  addBox(scene, { x: 0.34, y: 0.018, z: 0.028 }, { x: 0.72, y: 1.38, z: -1.28 }, helipadLineMaterial);
  addBox(scene, { x: 0.03, y: 0.018, z: 0.36 }, { x: 0.72, y: 1.385, z: -1.28 }, helipadLineMaterial);

  const propMaterial = createCityMaterial({
    color: 0x14262b,
    roughness: 0.82,
    metalness: 0.18,
    emissive: 0x061615,
    emissiveIntensity: 0.2
  });
  const amberMaterial = createCityMaterial({
    color: 0x4a2b19,
    roughness: 0.68,
    metalness: 0.24,
    emissive: 0xff7a2f,
    emissiveIntensity: 0.45
  });
  const cyanMaterial = createCityMaterial({
    color: 0x13333a,
    roughness: 0.7,
    metalness: 0.28,
    emissive: 0x19d9c4,
    emissiveIntensity: 0.36
  });
  addLandmark("backup-generator-yard", addBox(scene, { x: 0.95, y: 0.18, z: 0.72 }, { x: -1.76, y: 0.06, z: 0.54 }, propMaterial));
  for (let i = 0; i < 3; i += 1) {
    addCylinder(scene, 0.1, 0.1, 0.5, 14, { x: -2.05 + i * 0.28, y: 0.2, z: 0.54 }, { x: 0, y: 0, z: Math.PI / 2 }, amberMaterial);
  }
  addBox(scene, { x: 0.98, y: 0.05, z: 0.04 }, { x: -1.75, y: 0.3, z: 0.18 }, amberMaterial);

  addLandmark("ambulance-intake-bay", addBox(scene, { x: 0.72, y: 0.44, z: 0.58 }, { x: -0.55, y: 0.2, z: -0.8 }, propMaterial));
  addBox(scene, { x: 0.95, y: 0.08, z: 0.34 }, { x: -0.55, y: 0.46, z: -0.45 }, crossMaterial);
  addBox(scene, { x: 0.34, y: 0.08, z: 0.18 }, { x: -0.88, y: 0.08, z: -0.35 }, cyanMaterial);
  addBox(scene, { x: 0.34, y: 0.08, z: 0.18 }, { x: -0.22, y: 0.08, z: -0.35 }, cyanMaterial);

  addLandmark("dispatch-comms-mast", addBox(scene, { x: 0.82, y: 0.2, z: 0.36 }, { x: 0.9, y: 0.08, z: 1.15 }, propMaterial));
  addCylinder(scene, 0.025, 0.025, 0.85, 8, { x: 1.02, y: 0.56, z: 1.15 }, { x: 0, y: 0, z: 0 }, cyanMaterial);
  addCylinder(scene, 0.42, 0.42, 0.01, 36, { x: 1.02, y: 0.78, z: 1.15 }, { x: Math.PI / 2, y: 0, z: 0 }, helipadMaterial);
  addCylinder(scene, 0.26, 0.26, 0.01, 36, { x: 1.02, y: 0.86, z: 1.15 }, { x: Math.PI / 2, y: 0, z: 0 }, helipadMaterial);

  addLandmark("service-tunnel-mouth", addBox(scene, { x: 0.78, y: 0.32, z: 0.14 }, { x: -2.75, y: 0.12, z: 1.17 }, hospitalDarkMaterial));
  addBox(scene, { x: 0.5, y: 0.17, z: 0.04 }, { x: -2.75, y: 0.17, z: 1.08 }, cyanMaterial);
  addBoxRotated(scene, { x: 0.7, y: 0.08, z: 0.06 }, { x: -2.74, y: 0.31, z: 1.14 }, { x: 0, y: 0, z: 0.14 }, amberMaterial);

  addLandmark("radiology-network-wing", addBox(scene, { x: 0.76, y: 0.86, z: 0.42 }, { x: 1.18, y: 0.42, z: -1.85 }, hospitalDarkMaterial));
  addCylinder(scene, 0.18, 0.18, 0.16, 24, { x: 1.18, y: 0.9, z: -1.85 }, { x: Math.PI / 2, y: 0, z: 0 }, cyanMaterial);

  const lineMaterial = createCityLineMaterial({
    color: 0x47e4cc,
    transparent: true,
    opacity: 0.38
  });
  const emergencyLineMaterial = createCityLineMaterial({
    color: 0xff7d4a,
    transparent: true,
    opacity: 0.34
  });
  [
    [new THREE.Vector3(-2.5, 0.025, 1.35), new THREE.Vector3(1.65, 0.025, -1.25)],
    [new THREE.Vector3(-1.75, 0.03, 0.55), new THREE.Vector3(1.65, 0.03, -1.25)],
    [new THREE.Vector3(-0.55, 0.035, -0.8), new THREE.Vector3(1.65, 0.035, -1.25)],
    [new THREE.Vector3(0.9, 0.035, 1.15), new THREE.Vector3(1.65, 0.035, -1.25)]
  ].forEach((points) => addLine(scene, points, lineMaterial));
  [
    [new THREE.Vector3(-0.55, 0.04, -0.45), new THREE.Vector3(-1.5, 0.04, 0.9), new THREE.Vector3(0.9, 0.04, 1.15)],
    [new THREE.Vector3(-1.75, 0.045, 0.55), new THREE.Vector3(-0.85, 0.045, -0.8), new THREE.Vector3(1.65, 0.045, -1.25)]
  ].forEach((points) => addLine(scene, points, emergencyLineMaterial));

  const supportBuildingMaterial = createCityMaterial({
    color: 0x101d22,
    roughness: 0.9,
    metalness: 0.1,
    emissive: 0x061110,
    emissiveIntensity: 0.14
  });
  [
    { x: -2.55, z: -0.35, sx: 0.52, sy: 0.48, sz: 0.54 },
    { x: -2.25, z: -1.35, sx: 0.48, sy: 0.7, sz: 0.46 },
    { x: 2.55, z: 0.1, sx: 0.64, sy: 0.6, sz: 0.58 },
    { x: 2.25, z: 1.15, sx: 0.5, sy: 0.42, sz: 0.5 },
    { x: -0.05, z: 1.72, sx: 0.66, sy: 0.36, sz: 0.4 }
  ].forEach((building, index) => {
    addBox(scene, { x: building.sx, y: building.sy, z: building.sz }, { x: building.x, y: building.sy / 2 - 0.02, z: building.z }, supportBuildingMaterial);
    if (index < 3) {
      addBox(scene, { x: 0.18, y: 0.035, z: 0.035 }, { x: building.x, y: building.sy + 0.02, z: building.z + 0.2 }, windowMaterial);
    }
  });

  const ringMaterial = createCityMaterial({
    color: 0x5fffe0,
    emissive: 0x34f4d0,
    emissiveIntensity: 0.82,
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide
  });
  const criticalMaterial = createCityMaterial({
    color: 0xff7b4b,
    emissive: 0xff5a32,
    emissiveIntensity: 1,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });
  const hitMaterial = createCityMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0
  });

  citySceneState.nodeMeshes = data.incidents.map((incident) => {
    const position = incident.cityPosition || { x: 0, y: 0.08, z: 0 };
    const group = new THREE.Group();
    group.position.set(position.x, position.y + 0.04, position.z);
    group.userData.incidentId = incident.id;

    const ringGeometry = trackCityDisposable(new THREE.TorusGeometry(0.22, 0.012, 8, 32));
    const ring = new THREE.Mesh(ringGeometry, incident.severity === "critical" ? criticalMaterial : ringMaterial);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const beaconGeometry = trackCityDisposable(new THREE.ConeGeometry(0.08, 0.34, 5));
    const beacon = new THREE.Mesh(beaconGeometry, incident.severity === "critical" ? criticalMaterial : ringMaterial);
    beacon.position.y = 0.24;
    group.add(beacon);

    const hitGeometry = trackCityDisposable(new THREE.SphereGeometry(0.38, 16, 10));
    const hit = new THREE.Mesh(hitGeometry, hitMaterial);
    hit.userData.incidentId = incident.id;
    group.add(hit);

    scene.add(group);
    return { incident, group, ring, beacon, hit };
  });
}

function resizeCityIncidentScene() {
  const { container, renderer, camera } = citySceneState;
  if (!container || !renderer || !camera) {
    return;
  }

  const rect = container.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animateCityIncidentScene() {
  if (!citySceneState.mounted || getCityScreenState() !== "world-city") {
    citySceneState.animationFrameId = null;
    return;
  }

  const elapsed = (performance.now() - citySceneState.startedAt) / 1000;
  citySceneState.nodeMeshes.forEach((node, index) => {
    const isHovered = node.incident.id === citySceneState.hoveredIncidentId;
    const pulse = 1 + Math.sin(elapsed * 2.2 + index * 0.7) * 0.06 + (isHovered ? 0.16 : 0);
    node.ring.scale.setScalar(pulse);
    node.beacon.position.y = 0.24 + Math.sin(elapsed * 2.8 + index) * 0.025 + (isHovered ? 0.06 : 0);
  });

  citySceneState.renderer.render(citySceneState.scene, citySceneState.camera);
  citySceneState.animationFrameId = window.requestAnimationFrame(animateCityIncidentScene);
}

function getPointerIntersection(event) {
  const { container, camera, raycaster, pointer } = citySceneState;
  if (!container || !camera || !raycaster || !pointer) {
    return null;
  }

  const rect = container.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hitTargets = citySceneState.nodeMeshes.map((node) => node.hit);
  const intersections = raycaster.intersectObjects(hitTargets, false);
  if (!intersections.length) {
    return null;
  }

  const incidentId = intersections[0].object.userData.incidentId;
  return citySceneState.nodeMeshes.find((node) => node.incident.id === incidentId) || null;
}

function handleCityPointerMove(event) {
  if (getCityScreenState() !== "world-city") {
    return;
  }

  const node = getPointerIntersection(event);
  const nextId = node?.incident?.id || "";
  if (citySceneState.hoveredIncidentId === nextId) {
    if (node && citySceneState.callbacks.onIncidentHover) {
      citySceneState.callbacks.onIncidentHover(node.incident, event);
    }
    return;
  }

  citySceneState.hoveredIncidentId = nextId;
  if (node && citySceneState.callbacks.onIncidentHover) {
    citySceneState.callbacks.onIncidentHover(node.incident, event);
  } else if (citySceneState.callbacks.onIncidentLeave) {
    citySceneState.callbacks.onIncidentLeave();
  }
}

function handleCityPointerLeave() {
  citySceneState.hoveredIncidentId = "";
  citySceneState.callbacks.onIncidentLeave?.();
}

function handleCityClick(event) {
  if (getCityScreenState() !== "world-city") {
    return;
  }

  const node = getPointerIntersection(event);
  if (!node) {
    return;
  }

  citySceneState.callbacks.onIncidentSelect?.(node.incident, event);
}

function mountCityIncidentScene(container, data, callbacks = {}) {
  destroyCityIncidentScene();

  if (!container || typeof THREE === "undefined") {
    citySceneState.lastError = !container ? "Missing city scene container." : "THREE is unavailable.";
    container?.classList.add("is-unavailable");
    return false;
  }

  try {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03070b);
    scene.fog = new THREE.Fog(0x03070b, 5.2, 9.8);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 3.55, 4.9);
    camera.lookAt(0.18, 0.28, -0.25);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.domElement.className = "world-city-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x7fd8cc, 0.58);
    const key = new THREE.DirectionalLight(0xffb36d, 1.15);
    key.position.set(2.5, 4.5, 3.5);
    const rim = new THREE.PointLight(0x37f0d4, 1.1, 7);
    rim.position.set(-2.2, 1.6, 1.8);
    scene.add(ambient, key, rim);

    citySceneState = {
      mounted: true,
      renderer,
      scene,
      camera,
      container,
      animationFrameId: null,
      resizeObserver: null,
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      nodeMeshes: [],
      landmarks: [],
      disposable: [],
      data,
      callbacks,
      hoveredIncidentId: "",
      lastError: "",
      startedAt: performance.now()
    };

    buildHospitalCityScene(scene, data);
    resizeCityIncidentScene();
    citySceneState.resizeObserver = new ResizeObserver(resizeCityIncidentScene);
    citySceneState.resizeObserver.observe(container);
    renderer.domElement.addEventListener("pointermove", handleCityPointerMove);
    renderer.domElement.addEventListener("pointerleave", handleCityPointerLeave);
    renderer.domElement.addEventListener("click", handleCityClick);
    animateCityIncidentScene();
    return true;
  } catch (error) {
    citySceneState.lastError = error?.message || String(error);
    destroyCityIncidentScene();
    container.classList.add("is-unavailable");
    return false;
  }
}

function updateCityIncidentScene(data) {
  citySceneState.data = data || citySceneState.data;
}

function destroyCityIncidentScene() {
  if (citySceneState.animationFrameId !== null) {
    window.cancelAnimationFrame(citySceneState.animationFrameId);
  }

  if (citySceneState.renderer?.domElement) {
    citySceneState.renderer.domElement.removeEventListener("pointermove", handleCityPointerMove);
    citySceneState.renderer.domElement.removeEventListener("pointerleave", handleCityPointerLeave);
    citySceneState.renderer.domElement.removeEventListener("click", handleCityClick);
  }

  citySceneState.resizeObserver?.disconnect?.();
  citySceneState.disposable.forEach((item) => item?.dispose?.());
  citySceneState.renderer?.dispose?.();

  if (citySceneState.container) {
    citySceneState.container.innerHTML = "";
    citySceneState.container.classList.remove("is-unavailable");
  }

  citySceneState = {
    mounted: false,
    renderer: null,
    scene: null,
    camera: null,
    container: null,
    animationFrameId: null,
    resizeObserver: null,
    raycaster: null,
    pointer: null,
    nodeMeshes: [],
    landmarks: [],
    disposable: [],
    data: null,
    callbacks: {},
    hoveredIncidentId: "",
    lastError: citySceneState.lastError || "",
    startedAt: 0
  };
}

function getCityIncidentSceneDebugState() {
  const canvasCount = citySceneState.container
    ? citySceneState.container.querySelectorAll("canvas").length
    : document.querySelectorAll("[data-world-city-scene] canvas").length;
  const rect = citySceneState.container?.getBoundingClientRect?.() || null;
  const incidentNodes = citySceneState.nodeMeshes.map((node) => {
    const position = new THREE.Vector3();
    node.group.getWorldPosition(position);
    if (citySceneState.camera && rect) {
      position.project(citySceneState.camera);
    }
    return {
      id: node.incident.id,
      title: node.incident.title,
      severity: node.incident.severity,
      hasCombat: Boolean(node.incident.combatThreatId),
      screenX: rect ? Math.round(rect.left + (position.x + 1) * rect.width / 2) : null,
      screenY: rect ? Math.round(rect.top + (-position.y + 1) * rect.height / 2) : null
    };
  });

  return {
    mounted: citySceneState.mounted,
    rendererExists: Boolean(citySceneState.renderer),
    mountConnected: Boolean(citySceneState.container?.isConnected),
    animationRunning: citySceneState.animationFrameId !== null,
    canvasCount,
    incidentNodeCount: citySceneState.nodeMeshes.length,
    incidentNodes,
    landmarkCount: citySceneState.landmarks.length,
    landmarks: [...citySceneState.landmarks],
    hoveredIncidentId: citySceneState.hoveredIncidentId,
    cityKey: citySceneState.data?.cityKey || "",
    screenState: getCityScreenState(),
    lastError: citySceneState.lastError
  };
}

if (typeof window !== "undefined") {
  window.mountCityIncidentScene = mountCityIncidentScene;
  window.updateCityIncidentScene = updateCityIncidentScene;
  window.destroyCityIncidentScene = destroyCityIncidentScene;
  window.getCityIncidentSceneDebugState = getCityIncidentSceneDebugState;
  window.devCityIncidentSceneState = getCityIncidentSceneDebugState;
}
