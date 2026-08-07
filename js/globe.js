/* ThreatGlobe owns the Three.js scene, globe mesh, markers, input handling, and per-frame animation. */
class ThreatGlobe {
  constructor(container, threatsSource) {
    // The container holds the Three.js canvas, and the threats array stays external on purpose.
    this.container = container;
    this.threats = threatsSource;

    // These references are filled in by init() when the 3D scene is created.
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.globe = null;

    // The group lets us rotate the globe, atmosphere, and threat markers together.
    this.globeGroup = new THREE.Group();

    // Raycasting turns mouse position into object selection for clicks and hover.
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    // The clock drives animation timing so pulses stay smooth and time-based.
    this.clock = new THREE.Clock();

    // nodeMap keeps the live 3D meshes aligned with each active threat object.
    this.nodeMap = new Map();
    this.regionMap = new Map();

    // Layer 2 will subscribe through this hook when it needs to react to clicks.
    this.clickHandlers = [];
    this.regionClickHandlers = [];
    this.hoveredThreatId = null;
    this.hoveredRegionKey = null;
    this.selectedRegionKey = null;
    this.hologram = null;
    this.hologramThreatId = null;
    this.lastHologramPointerLogAt = 0;
    this.isThreatHoverLocked = false;
    this.projectedHoverRadius = 42;
    this.projectedRegionHoverRadius = 104;
    this.lastInactiveHologramSkipState = null;

    // Drag state stores the last pointer position so rotation can follow the mouse.
    this.dragState = {
      isDragging: false,
      lastX: 0,
      lastY: 0,
      moved: false
    };

    // Small velocity values let drag input blend into the globe's slow auto-rotation.
    this.rotationVelocity = {
      x: 0,
      y: 0
    };
    this.autoRotateSpeed = 0.0012;
    this.globeRadius = 2.15;

    // Each severity maps to a color and pulse behavior for the node meshes.
    this.severityConfig = {
      critical: { color: "#ff2233", pulseSpeed: 3.8, pulseAmp: 0.34, baseScale: 1.15 },
      high: { color: "#ff6600", pulseSpeed: 3.0, pulseAmp: 0.24, baseScale: 1.0 },
      medium: { color: "#ffcc00", pulseSpeed: 2.3, pulseAmp: 0.18, baseScale: 0.9 },
      low: { color: "#00ffcc", pulseSpeed: 1.7, pulseAmp: 0.12, baseScale: 0.82 }
    };
  }

  // init() builds the renderer, camera, lights, globe meshes, and input handlers.
  init() {
    // The scene is the root container for everything Three.js draws.
    this.scene = new THREE.Scene();
    // The camera defines how we view the globe from a slight front-facing angle.
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0.45, 7);

    // The renderer turns the scene into pixels and attaches the canvas to the page.
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.container.appendChild(this.renderer.domElement);

    // The globe group holds the planet and the nodes so we can rotate them together.
    this.scene.add(this.globeGroup);

    // Ambient, key, and fill lights give the sphere depth without making it too bright.
    const ambientLight = new THREE.AmbientLight(0x88ffaa, 0.75);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x6fd8ff, 0.95);
    keyLight.position.set(5, 3, 6);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x00ff88, 0.25);
    fillLight.position.set(-4, -2, -3);
    this.scene.add(fillLight);

    // The backdrop, globe, nodes, and input listeners all need to exist before animation starts.
    this.addBackdrop();
    this.createGlobe();
    this.mountThreatHologram();
    this.addWorldRegionHighlights();
    this.syncThreatNodes();
    this.attachEvents();
    this.updateActiveCount();
    this.animate();
  }

  // mountThreatHologram() creates one click-through HTML overlay so hover previews never block node clicks.
  mountThreatHologram() {
    this.hologram = document.querySelector(".globe-threat-hologram");
    if (!this.hologram) {
      this.hologram = document.createElement("aside");
      this.hologram.className = "globe-threat-hologram";
      this.hologram.setAttribute("aria-hidden", "true");
      document.body.appendChild(this.hologram);
    }

    if (typeof window !== "undefined") {
      window.devShowThreatHologram = (index = 0) => this.devShowThreatHologram(index);
      window.devHideThreatHologram = () => this.hideThreatHologram();
    }
  }

  ensureThreatHologram() {
    if (!this.hologram || !this.hologram.isConnected) {
      this.mountThreatHologram();
    }
    return this.hologram;
  }

  // addBackdrop() creates a star field by scattering random points on a large sphere shell.
  addBackdrop() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1500;
    const positions = new Float32Array(starCount * 3);

    // Each star gets a random spherical position so the backdrop wraps around the camera.
    for (let i = 0; i < starCount; i += 1) {
      const r = 45 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[(i * 3) + 1] = r * Math.cos(phi);
      positions[(i * 3) + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const starMaterial = new THREE.PointsMaterial({
      color: 0x9cdcff,
      size: 0.08,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
  }

  // createGlobe() builds the planet mesh, its atmosphere, and a texture fallback path.
  createGlobe() {
    // SphereGeometry gives us the round Earth-like shape for the planet.
    const geometry = new THREE.SphereGeometry(this.globeRadius, 96, 96);
    // Start with a procedural texture so the globe always renders, even if the network image fails.
    const baseTexture = this.createProceduralGlobeTexture();
    const material = new THREE.MeshPhongMaterial({
      map: baseTexture,
      emissive: new THREE.Color("#04150d"),
      emissiveIntensity: 0.85,
      shininess: 18,
      specular: new THREE.Color("#1f734c")
    });

    this.globe = new THREE.Mesh(geometry, material);
    this.globeGroup.add(this.globe);

    // A faint atmosphere shell gives the globe a subtle glow around the edge.
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(this.globeRadius * 1.035, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide
      })
    );
    this.globeGroup.add(atmosphere);

    // If the public Earth texture loads, it replaces the fallback map with a better surface image.
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
      (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        material.map = texture;
        material.needsUpdate = true;
      },
      undefined,
      () => {
        console.warn("Earth texture failed to load. Using procedural fallback texture.");
      }
    );
  }

  // createProceduralGlobeTexture() draws a fake Earth texture on a canvas in case the CDN image fails.
  createProceduralGlobeTexture() {
    // A canvas texture lets us paint colors, grid lines, and land shapes with plain 2D drawing code.
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    // Start with a dark gradient so the globe feels like a night-side tactical map.
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#061018");
    gradient.addColorStop(0.5, "#0b1f24");
    gradient.addColorStop(1, "#03080c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw a faint latitude/longitude grid so the fallback still feels geospatial.
    ctx.strokeStyle = "rgba(0, 255, 136, 0.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // These polygon shapes approximate continents so the fallback looks like a stylized Earth.
    const continents = [
      [[190, 150], [310, 110], [430, 145], [480, 250], [440, 380], [300, 390], [220, 300]],
      [[520, 180], [660, 160], [720, 240], [690, 350], [610, 410], [540, 310]],
      [[950, 140], [1130, 120], [1310, 170], [1400, 260], [1330, 330], [1170, 320], [1040, 250]],
      [[1170, 360], [1260, 390], [1320, 480], [1300, 650], [1200, 760], [1120, 660], [1100, 500]],
      [[1500, 180], [1670, 130], [1810, 190], [1880, 310], [1800, 410], [1620, 370], [1510, 290]],
      [[1640, 560], [1740, 590], [1810, 690], [1750, 800], [1640, 780], [1580, 660]]
    ];

    ctx.lineWidth = 3;
    continents.forEach((points, index) => {
      // Alternate fill tones create a little contrast between land masses.
      const fill = ctx.createLinearGradient(0, 0, 0, canvas.height);
      fill.addColorStop(0, index % 2 === 0 ? "rgba(26, 102, 73, 0.9)" : "rgba(18, 83, 63, 0.9)");
      fill.addColorStop(1, "rgba(5, 35, 23, 0.92)");
      ctx.fillStyle = fill;
      ctx.strokeStyle = "rgba(123, 255, 191, 0.42)";
      ctx.beginPath();
      points.forEach((point, pointIndex) => {
        if (pointIndex === 0) {
          ctx.moveTo(point[0], point[1]);
        } else {
          ctx.lineTo(point[0], point[1]);
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Random speckles add visual noise so the surface does not look flat or synthetic.
    for (let i = 0; i < 220; i += 1) {
      ctx.fillStyle = `rgba(0, 255, 136, ${0.02 + Math.random() * 0.04})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 3.6,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.needsUpdate = true;
    return texture;
  }

  // syncThreatNodes() compares the source-of-truth array with the live scene and adds/removes meshes as needed.
  syncThreatNodes() {
    this.threats.forEach((threat) => {
      // Active threats should have a node in the scene.
      if (threat.status === "active" && !this.nodeMap.has(threat.id)) {
        this.addThreatNode(threat);
      }
      // Inactive threats should disappear from the scene.
      if (threat.status !== "active" && this.nodeMap.has(threat.id)) {
        this.removeThreatNode(threat.id);
      }
    });
  }

  // addThreatNode() builds the visible marker for one threat using three meshes layered together.
  addThreatNode(threat) {
    const severity = this.severityConfig[threat.severity];
    const nodeGroup = new THREE.Group();

    // The core sphere is the clickable point the player sees on the globe.
    const pointGeometry = new THREE.SphereGeometry(0.042 * severity.baseScale, 18, 18);
    const pointMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(severity.color),
      transparent: true,
      opacity: 0.95
    });
    const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);

    // The ring is a halo that helps the node read as a glowing alert.
    const ringGeometry = new THREE.RingGeometry(0.075, 0.115, 48);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(severity.color),
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);

    // The glow sphere softens the marker and gives it a bright pulse shell.
    const glowGeometry = new THREE.SphereGeometry(0.08 * severity.baseScale, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(severity.color),
      transparent: true,
      opacity: 0.16
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);

    // The visual marker is intentionally small, so this transparent sphere provides comfortable hover/click hit testing.
    const hitGeometry = new THREE.SphereGeometry(0.16 * severity.baseScale, 20, 20);
    const hitMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(severity.color),
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const hitMesh = new THREE.Mesh(hitGeometry, hitMaterial);

    const position = this.latLngToVector3(
      threat.location.lat,
      threat.location.lng,
      this.globeRadius + 0.03
    );

    // The group is positioned on the globe surface, and the meshes inherit that location.
    nodeGroup.position.copy(position);
    nodeGroup.userData = {
      threatId: threat.id,
      pulseSpeed: severity.pulseSpeed,
      pulseAmp: severity.pulseAmp,
      baseScale: severity.baseScale,
      hovered: false
    };

    pointMesh.userData.threatId = threat.id;
    ringMesh.userData.threatId = threat.id;
    glowMesh.userData.threatId = threat.id;
    hitMesh.userData.threatId = threat.id;

    nodeGroup.add(hitMesh);
    nodeGroup.add(glowMesh);
    nodeGroup.add(ringMesh);
    nodeGroup.add(pointMesh);

    this.globeGroup.add(nodeGroup);
    this.nodeMap.set(threat.id, {
      group: nodeGroup,
      pointMesh,
      ringMesh,
      glowMesh,
      hitMesh,
      threat
    });
  }

  // removeThreatNode() cleans up the group and its map entry when a threat is no longer active.
  removeThreatNode(id) {
    const node = this.nodeMap.get(id);
    if (!node) {
      return;
    }
    this.globeGroup.remove(node.group);
    this.nodeMap.delete(id);
  }

  // onThreatClick() lets other UI layers react to a node click without coupling to the globe internals.
  onThreatClick(callback) {
    this.clickHandlers.push(callback);
  }

  onRegionClick(callback) {
    this.regionClickHandlers.push(callback);
  }

  addWorldRegionHighlights() {
    const region = window.THREATGRID_WORLD_DATA?.getWorldRegion?.("north-america") || {
      id: "north-america",
      displayName: "North America"
    };
    const group = new THREE.Group();
    const regionKey = region.id || "north-america";
    const accent = new THREE.Color("#ff6e4a");
    const softAccent = new THREE.Color("#ffcf73");
    const anchorPoints = [
      { lat: 49, lng: -124 },
      { lat: 52, lng: -98 },
      { lat: 43, lng: -78 },
      { lat: 30, lng: -86 },
      { lat: 31, lng: -112 }
    ];
    const rings = [];
    const fieldMeshes = [];

    const regionBoundary = [
      { lat: 59, lng: -138 },
      { lat: 63, lng: -112 },
      { lat: 55, lng: -72 },
      { lat: 43, lng: -61 },
      { lat: 27, lng: -79 },
      { lat: 18, lng: -97 },
      { lat: 29, lng: -122 },
      { lat: 45, lng: -131 },
      { lat: 59, lng: -138 }
    ];

    const pressureFieldPoints = regionBoundary.map((point) => this.latLngToVector3(point.lat, point.lng, this.globeRadius + 0.075));
    const pressureCenter = this.latLngToVector3(43, -101, this.globeRadius + 0.078);
    const pressureVertices = [];
    for (let index = 0; index < pressureFieldPoints.length - 1; index += 1) {
      pressureVertices.push(
        pressureCenter.x, pressureCenter.y, pressureCenter.z,
        pressureFieldPoints[index].x, pressureFieldPoints[index].y, pressureFieldPoints[index].z,
        pressureFieldPoints[index + 1].x, pressureFieldPoints[index + 1].y, pressureFieldPoints[index + 1].z
      );
    }
    const pressureGeometry = new THREE.BufferGeometry();
    pressureGeometry.setAttribute("position", new THREE.Float32BufferAttribute(pressureVertices, 3));
    const pressureMaterial = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.115,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const pressureField = new THREE.Mesh(pressureGeometry, pressureMaterial);
    pressureField.userData.regionKey = regionKey;
    group.add(pressureField);

    [
      { lat: 49, lng: -103, radius: 0.42, scaleX: 1.85, scaleY: 0.92, color: "#ff6e4a", opacity: 0.055 },
      { lat: 38, lng: -94, radius: 0.37, scaleX: 1.7, scaleY: 0.78, color: "#ff9f57", opacity: 0.048 },
      { lat: 31, lng: -108, radius: 0.28, scaleX: 1.35, scaleY: 0.64, color: "#ffcf73", opacity: 0.038 }
    ].forEach((field) => {
      const fieldGeometry = new THREE.CircleGeometry(field.radius, 56);
      const fieldMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(field.color),
        transparent: true,
        opacity: field.opacity,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const fieldMesh = new THREE.Mesh(fieldGeometry, fieldMaterial);
      const position = this.latLngToVector3(field.lat, field.lng, this.globeRadius + 0.09);
      fieldMesh.position.copy(position);
      fieldMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize());
      fieldMesh.scale.set(field.scaleX, field.scaleY, 1);
      fieldMesh.userData = {
        regionKey,
        baseOpacity: field.opacity,
        baseScaleX: field.scaleX,
        baseScaleY: field.scaleY
      };
      group.add(fieldMesh);
      fieldMeshes.push(fieldMesh);
    });

    anchorPoints.forEach((point, index) => {
      const ringGeometry = new THREE.RingGeometry(0.03, 0.058 + (index % 2) * 0.012, 42);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? accent : softAccent,
        transparent: true,
        opacity: 0.11,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.copy(this.latLngToVector3(point.lat, point.lng, this.globeRadius + 0.05));
      ring.userData.regionKey = regionKey;
      group.add(ring);
      rings.push(ring);
    });

    const outlinePoints = regionBoundary.map((point) => this.latLngToVector3(point.lat, point.lng, this.globeRadius + 0.085));
    const outlineGeometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);
    const outlineMaterial = new THREE.LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.34,
      depthWrite: false
    });
    const outline = new THREE.Line(outlineGeometry, outlineMaterial);
    outline.userData.regionKey = regionKey;
    group.add(outline);

    const haloGeometry = new THREE.SphereGeometry(0.52, 32, 20);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.055,
      depthWrite: false
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.copy(this.latLngToVector3(43, -101, this.globeRadius + 0.08));
    halo.scale.set(1.25, 0.68, 0.26);
    halo.userData.regionKey = regionKey;
    group.add(halo);

    const hitGeometry = new THREE.SphereGeometry(0.58, 24, 18);
    const hitMaterial = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const hitMesh = new THREE.Mesh(hitGeometry, hitMaterial);
    hitMesh.position.copy(this.latLngToVector3(43, -101, this.globeRadius + 0.09));
    hitMesh.scale.set(1.25, 0.9, 0.58);
    hitMesh.userData.regionKey = regionKey;
    group.add(hitMesh);

    group.userData = {
      regionKey,
      hovered: false,
      selected: false
    };

    this.globeGroup.add(group);
    this.regionMap.set(regionKey, {
      group,
      region,
      rings,
      fieldMeshes,
      pressureField,
      outline,
      halo,
      hitMesh
    });
  }

  // attachEvents() wires resize, drag, hover, and click behavior to the rendered canvas.
  attachEvents() {
    window.addEventListener("resize", () => this.handleResize());

    // pointerdown starts a drag gesture and stores the initial mouse position.
    this.renderer.domElement.addEventListener("pointerdown", (event) => {
      this.dragState.isDragging = true;
      this.dragState.lastX = event.clientX;
      this.dragState.lastY = event.clientY;
      this.dragState.moved = false;
    });

    // pointermove drives both drag rotation and hover checks as the mouse moves.
    const handlePointerMove = (event) => {
      if (event.threatgridGlobeHandled === true) {
        return;
      }
      event.threatgridGlobeHandled = true;
      if (!this.canShowGlobeThreatHologram()) {
        this.logInactiveHologramSkip();
        this.clearHoverState();
        return;
      }
      this.updatePointer(event);
      this.logHologramPointerMove();

      if (this.dragState.isDragging) {
        // Rotation is based on pointer delta so the globe follows the drag direction naturally.
        const deltaX = event.clientX - this.dragState.lastX;
        const deltaY = event.clientY - this.dragState.lastY;
        this.dragState.lastX = event.clientX;
        this.dragState.lastY = event.clientY;

        if (Math.abs(deltaX) + Math.abs(deltaY) > 1) {
          this.dragState.moved = true;
        }

        this.globeGroup.rotation.y += deltaX * 0.0052;
        this.globeGroup.rotation.x += deltaY * 0.0038;
        this.globeGroup.rotation.x = Math.max(
          -0.85,
          Math.min(0.85, this.globeGroup.rotation.x)
        );

        this.rotationVelocity.y = deltaX * 0.00045;
        this.rotationVelocity.x = deltaY * 0.0002;
      }

      this.updateHoverState(event);
    };

    window.addEventListener("pointermove", handlePointerMove);
    this.renderer.domElement.addEventListener("pointermove", handlePointerMove);
    this.renderer.domElement.addEventListener("mousemove", handlePointerMove);

    // pointerup ends the drag, and a short movement threshold lets clicks register cleanly.
    window.addEventListener("pointerup", (event) => {
      const wasDragging = this.dragState.isDragging;
      const moved = this.dragState.moved;
      this.dragState.isDragging = false;

      if (wasDragging && !moved) {
        this.handleClick(event);
      }
    });

    // Leaving the canvas clears hover feedback so the cursor and glow state reset.
    this.renderer.domElement.addEventListener("mouseleave", () => {
      this.clearHoverState();
    });
  }

  // handleResize() keeps the camera and renderer matched to the current viewport size.
  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // updatePointer() converts screen coordinates into normalized device coordinates for raycasting.
  updatePointer(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  // getThreatIntersection() asks the raycaster which node, if any, is under the pointer.
  getThreatIntersection() {
    const hitTargets = Array.from(this.nodeMap.values()).map((node) => node.hitMesh || node.pointMesh);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(hitTargets, false);
    this.logHologramDebug(`[HOLOGRAM DEBUG] intersects count: ${intersections.length}`);
    if (intersections[0]) {
      const threatId = intersections[0].object.userData.threatId;
      const node = this.nodeMap.get(threatId);
      this.logHologramDebug(`[HOLOGRAM DEBUG] raycast hit ${node?.threat?.title || threatId}`);
    }
    return intersections[0] || this.getProjectedThreatIntersection();
  }

  getProjectedThreatIntersection() {
    if (!this.camera || !this.renderer) {
      return null;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointerX = ((this.pointer.x + 1) / 2) * rect.width + rect.left;
    const pointerY = ((1 - this.pointer.y) / 2) * rect.height + rect.top;
    let closest = null;

    this.nodeMap.forEach((node) => {
      const worldPosition = new THREE.Vector3();
      node.group.getWorldPosition(worldPosition);
      const projected = worldPosition.clone().project(this.camera);
      if (projected.z < -1 || projected.z > 1) {
        return;
      }

      const screenX = ((projected.x + 1) / 2) * rect.width + rect.left;
      const screenY = ((1 - projected.y) / 2) * rect.height + rect.top;
      const distance = Math.hypot(pointerX - screenX, pointerY - screenY);
      if (distance > this.projectedHoverRadius) {
        return;
      }

      if (!closest || distance < closest.distance) {
        closest = {
          distance,
          object: { userData: { threatId: node.threat.id } },
          point: worldPosition,
          projected: { x: Math.round(screenX), y: Math.round(screenY) }
        };
      }
    });

    if (closest) {
      const node = this.nodeMap.get(closest.object.userData.threatId);
      this.logHologramDebug(
        `[HOLOGRAM DEBUG] fallback hit ${node?.threat?.title || closest.object.userData.threatId} distance ${Number(closest.distance.toFixed(1))}px`,
        { projected: closest.projected }
      );
    }

    return closest;
  }

  getRegionIntersection() {
    const hitTargets = Array.from(this.regionMap.values()).map((region) => region.hitMesh).filter(Boolean);
    if (!hitTargets.length) {
      return null;
    }

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(hitTargets, false);
    return intersections[0] || this.getProjectedRegionIntersection();
  }

  getProjectedRegionIntersection() {
    if (!this.camera || !this.renderer) {
      return null;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointerX = ((this.pointer.x + 1) / 2) * rect.width + rect.left;
    const pointerY = ((1 - this.pointer.y) / 2) * rect.height + rect.top;
    let closest = null;

    this.regionMap.forEach((region) => {
      const worldPosition = new THREE.Vector3();
      region.hitMesh.getWorldPosition(worldPosition);
      const projected = worldPosition.clone().project(this.camera);
      if (projected.z < -1 || projected.z > 1) {
        return;
      }

      const screenX = ((projected.x + 1) / 2) * rect.width + rect.left;
      const screenY = ((1 - projected.y) / 2) * rect.height + rect.top;
      const distance = Math.hypot(pointerX - screenX, pointerY - screenY);
      if (distance > this.projectedRegionHoverRadius) {
        return;
      }

      if (!closest || distance < closest.distance) {
        closest = {
          distance,
          object: { userData: { regionKey: region.region.id || region.group.userData.regionKey } },
          point: worldPosition,
          projected: { x: Math.round(screenX), y: Math.round(screenY) }
        };
      }
    });

    return closest;
  }

  canShowGlobeThreatHologram() {
    if (typeof screenState !== "undefined") {
      return screenState === "game";
    }
    return typeof window !== "undefined" && window.screenState === "game";
  }

  getCurrentScreenStateLabel() {
    if (typeof screenState !== "undefined") {
      return screenState;
    }
    if (typeof window !== "undefined" && typeof window.screenState !== "undefined") {
      return window.screenState;
    }
    return "unknown";
  }

  logInactiveHologramSkip() {
    if (!this.shouldLogHologramDebug()) {
      return;
    }

    const state = this.getCurrentScreenStateLabel();
    if (this.lastInactiveHologramSkipState === state && !this.hoveredThreatId && !this.isThreatHoverLocked) {
      return;
    }

    this.lastInactiveHologramSkipState = state;
    console.info(`[HOLOGRAM DEBUG] skipped: inactive screen ${state}`);
  }

  shouldLogHologramDebug() {
    return typeof window !== "undefined" && window.THREATGRID_GLOBE_HOLOGRAM_DEBUG === true;
  }

  logHologramDebug(message, payload = null) {
    if (!this.shouldLogHologramDebug()) {
      return;
    }

    if (payload === null) {
      console.info(message);
      return;
    }

    console.info(message, payload);
  }

  logHologramPointerMove() {
    if (!this.shouldLogHologramDebug()) {
      return;
    }

    const now = Date.now();
    if (now - this.lastHologramPointerLogAt < 250) {
      return;
    }

    this.lastHologramPointerLogAt = now;
    console.info("[HOLOGRAM DEBUG] pointer move", {
      x: Number(this.pointer.x.toFixed(3)),
      y: Number(this.pointer.y.toFixed(3))
    });
  }

  logHologramDomState(label = "[HOLOGRAM DOM]") {
    if (!this.shouldLogHologramDebug()) {
      return;
    }

    const el = this.hologram;
    const rect = el?.getBoundingClientRect();
    const computed = el ? getComputedStyle(el) : null;
    console.log(label, {
      exists: Boolean(el),
      className: el?.className || null,
      text: el?.innerText?.slice(0, 120) || "",
      rect: rect ? {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      } : null,
      computed: computed ? {
        display: computed.display,
        opacity: computed.opacity,
        visibility: computed.visibility,
        zIndex: computed.zIndex,
        position: computed.position,
        pointerEvents: computed.pointerEvents
      } : null
    });
  }

  getSafeHologramText(value, fallback = "UNKNOWN") {
    const text = String(value || "").trim();
    if (!text || text === "undefined" || text === "null" || text === "NaN") {
      return fallback;
    }
    return text;
  }

  escapeHologramText(value, fallback = "UNKNOWN") {
    return this.getSafeHologramText(value, fallback)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  formatHologramLabel(value, fallback = "Unknown") {
    return this.getSafeHologramText(value, fallback)
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  getThreatConceptLabels(threat) {
    const conceptIds = typeof getThreatLearningConcepts === "function"
      ? getThreatLearningConcepts(threat)
      : [
        ...(Array.isArray(threat?.teachesConcepts) ? threat.teachesConcepts : []),
        ...(Array.isArray(threat?.recommendedConcepts) ? threat.recommendedConcepts : [])
      ];
    const seen = new Set();
    return conceptIds
      .map((conceptId) => {
        const normalizedId = this.getSafeHologramText(conceptId, "").toLowerCase();
        if (!normalizedId || seen.has(normalizedId)) {
          return "";
        }
        seen.add(normalizedId);
        const concept = typeof getCyberConcept === "function" ? getCyberConcept(normalizedId) : null;
        return concept?.title || this.formatHologramLabel(normalizedId);
      })
      .filter(Boolean);
  }

  getThreatConceptIds(threat) {
    const conceptIds = [
      ...(Array.isArray(threat?.recommendedConcepts) ? threat.recommendedConcepts : []),
      ...(Array.isArray(threat?.teachesConcepts) ? threat.teachesConcepts : [])
    ];
    const seen = new Set();
    return conceptIds
      .map((conceptId) => this.getSafeHologramText(conceptId, "").toLowerCase().replace(/\s+/g, "_"))
      .filter((conceptId) => {
        if (!conceptId || seen.has(conceptId)) {
          return false;
        }
        seen.add(conceptId);
        return true;
      });
  }

  getThreatRouteDecision(score, severity) {
    const normalizedSeverity = this.getSafeHologramText(severity, "medium").toLowerCase();
    if (normalizedSeverity === "critical" || score >= 9) {
      return "Critical incident";
    }
    if (normalizedSeverity === "high" || score >= 7) {
      return "Dangerous route";
    }
    if (normalizedSeverity === "medium" || score >= 4) {
      return "Balanced incident";
    }
    return "Safer route";
  }

  getThreatConceptRouteGroup(conceptIds = []) {
    const groups = [
      {
        ids: ["detection", "countertrace", "phishing", "incident_response"],
        label: "Detection",
        module: "Detection module possible",
        tags: ["detection", "scan", "countertrace", "reveal", "incident_response"]
      },
      {
        ids: ["containment", "lateral_movement"],
        label: "Containment",
        module: "Containment module possible",
        tags: ["containment", "guard", "mitigate", "isolate"]
      },
      {
        ids: ["malware_cleanup"],
        label: "Cleanup",
        module: "Cleanup module possible",
        tags: ["malware_cleanup", "cleanup", "cleanse", "purge"]
      },
      {
        ids: ["recovery", "encryption"],
        label: "Recovery",
        module: "Recovery module possible",
        tags: ["recovery", "recover", "continuity"]
      },
      {
        ids: ["hardening", "patching", "vulnerability", "privilege_escalation"],
        label: "Defense",
        module: "Defense module possible",
        tags: ["hardening", "patching", "defense", "guard", "mitigate"]
      }
    ];
    return groups.find((group) => group.ids.some((conceptId) => conceptIds.includes(conceptId))) || null;
  }

  getModuleReadinessTags(module) {
    const tags = [
      ...(Array.isArray(module?.conceptTags) ? module.conceptTags : []),
      ...(Array.isArray(module?.prefixes) ? module.prefixes.flatMap((affix) => affix?.conceptTags || []) : []),
      ...(Array.isArray(module?.suffixes) ? module.suffixes.flatMap((affix) => affix?.conceptTags || []) : []),
      ...(Array.isArray(module?.substats) ? module.substats.flatMap((affix) => affix?.conceptTags || []) : [])
    ];
    return tags.map((tag) => this.getSafeHologramText(tag, "").toLowerCase()).filter(Boolean);
  }

  getPartyReadinessTags() {
    const runState = typeof defenderSaveState !== "undefined" ? defenderSaveState?.currentRun : null;
    const currentParty = Array.isArray(runState?.party) && runState.party.length
      ? runState.party
      : (typeof programs !== "undefined" && Array.isArray(programs) ? programs : []);
    const tags = new Set();

    currentParty.forEach((member) => {
      const defenderId = member?.id;
      const blueprint = typeof getDefenderById === "function" && defenderId ? getDefenderById(defenderId) : null;
      const defender = blueprint || member;
      [
        defender?.domain,
        defender?.affinity,
        defender?.role,
        defender?.archetype
      ].forEach((value) => {
        const normalized = this.getSafeHologramText(value, "").toLowerCase().replace(/\s+/g, "_");
        if (normalized) {
          tags.add(normalized);
        }
      });

      (Array.isArray(defender?.responseTags) ? defender.responseTags : []).forEach((tag) => {
        const normalized = this.getSafeHologramText(tag, "").toLowerCase();
        if (normalized) {
          tags.add(normalized);
        }
      });

      (Array.isArray(defender?.moves) ? defender.moves : []).forEach((move) => {
        (Array.isArray(move?.teachesConcepts) ? move.teachesConcepts : []).forEach((conceptId) => {
          const normalized = this.getSafeHologramText(conceptId, "").toLowerCase();
          if (normalized) {
            tags.add(normalized);
          }
        });
      });

      const module = typeof getEquippedModuleForDefenderId === "function" && runState && defenderId
        ? getEquippedModuleForDefenderId(runState, defenderId)
        : null;
      this.getModuleReadinessTags(module).forEach((tag) => tags.add(tag));
    });

    return Array.from(tags);
  }

  getThreatPartyReadiness(threat) {
    const conceptIds = this.getThreatConceptIds(threat);
    const group = this.getThreatConceptRouteGroup(conceptIds);
    if (!group) {
      return {
        label: "Unknown readiness",
        shortLabel: "Unknown readiness"
      };
    }

    const partyTags = this.getPartyReadinessTags();
    if (!partyTags.length) {
      return {
        label: "Unknown readiness.",
        shortLabel: "Unknown readiness"
      };
    }

    const isPrepared = group.tags.some((tag) => partyTags.includes(tag))
      || group.ids.some((conceptId) => partyTags.includes(conceptId));

    if (isPrepared) {
      return {
        label: `Prepared: ${group.label} available.`,
        shortLabel: `${group.label} ready`
      };
    }

    return {
      label: `Warning: limited ${group.label.toLowerCase()} response.`,
      shortLabel: `Limited ${group.label.toLowerCase()}`
    };
  }

  getThreatRiskScore(threat) {
    const severityBase = {
      low: 2.8,
      medium: 5.4,
      high: 7.6,
      critical: 9.2
    };
    const severity = this.getSafeHologramText(threat?.severity, "medium").toLowerCase();
    const baseScore = severityBase[severity] ?? severityBase.medium;
    const tier = Number.isFinite(threat?.difficultyTier) ? threat.difficultyTier : 3;
    const level = Number.isFinite(threat?.level) ? threat.level : 2;
    const tierAdjustment = Math.max(-0.5, Math.min(0.5, (tier - 4) * 0.08));
    const levelAdjustment = Math.max(-0.3, Math.min(0.3, (level - 3) * 0.07));
    const score = Math.max(0.1, Math.min(10, baseScore + tierAdjustment + levelAdjustment));
    return Number(score.toFixed(1));
  }

  getThreatSeverityFromScore(score) {
    if (score >= 9) {
      return "critical";
    }
    if (score >= 7) {
      return "high";
    }
    if (score >= 4) {
      return "medium";
    }
    return "low";
  }

  getThreatSuggestedResponse(threat, conceptLabels = []) {
    const weakTo = Array.isArray(threat?.weakTo) ? threat.weakTo : [];
    const recommended = Array.isArray(threat?.recommendedConcepts) ? threat.recommendedConcepts : [];
    const firstWeakness = weakTo.find(Boolean);
    if (firstWeakness) {
      return `Try ${this.formatHologramLabel(firstWeakness)} response pressure.`;
    }
    const firstRecommendation = recommended.find(Boolean);
    if (firstRecommendation) {
      const concept = typeof getCyberConcept === "function" ? getCyberConcept(firstRecommendation) : null;
      return `Prepare ${concept?.title || this.formatHologramLabel(firstRecommendation)} counterplay.`;
    }
    if (conceptLabels.length) {
      return `Scan first, then answer the ${conceptLabels[0]} pattern.`;
    }
    return "Scan first, then choose a response.";
  }

  getThreatRewardHint(threat, conceptLabels = []) {
    const conceptIds = this.getThreatConceptIds(threat);
    const routeGroup = this.getThreatConceptRouteGroup(conceptIds);
    if (routeGroup) {
      return routeGroup.module;
    }
    const firstConcept = conceptLabels[0] || "";
    const threatType = this.getSafeHologramText(threat?.type, "").replace(/-/g, " ");
    if (firstConcept) {
      return `${firstConcept} module fragment possible.`;
    }
    if (threatType) {
      return `${threatType} recovery module possible.`;
    }
    return "Recovered module fragment possible.";
  }

  // getThreatRiskProfile() derives a fictional game risk index from existing metadata, not real CVE/CVSS data.
  getThreatRiskProfile(threat) {
    const score = this.getThreatRiskScore(threat);
    const severity = this.getThreatSeverityFromScore(score);
    const conceptLabels = this.getThreatConceptLabels(threat);
    const partyReadiness = this.getThreatPartyReadiness(threat);
    const level = Number.isFinite(threat?.level) ? threat.level : 1;
    const tier = Number.isFinite(threat?.difficultyTier) ? threat.difficultyTier : level;
    const reward = this.getThreatRewardHint(threat, conceptLabels);
    return {
      threatName: this.getSafeHologramText(threat?.title, "Unknown Threat"),
      typeLabel: this.formatHologramLabel(threat?.type, "Unknown Vector"),
      level,
      tier,
      score,
      severity,
      routeDecision: this.getThreatRouteDecision(score, severity),
      vector: this.getSafeHologramText(threat?.vector, "Unknown vector"),
      concepts: conceptLabels.length ? conceptLabels.slice(0, 4).join(" / ") : "Unknown concept",
      objective: this.getSafeHologramText(threat?.learningObjective || threat?.beginnerSummary, "Assess behavior before committing."),
      response: this.getThreatSuggestedResponse(threat, conceptLabels),
      partyReadiness: partyReadiness.label,
      partyReadinessShort: partyReadiness.shortLabel,
      reward,
      rewardShort: reward.replace(/\s+module\s+possible\.?$/i, "").replace(/\s+fragment\s+possible\.?$/i, "")
    };
  }

  buildThreatHologramMarkup(profile) {
    return `
      <div class="globe-threat-hologram-scan" aria-hidden="true"></div>
      <div class="globe-threat-hologram-kicker">THREAT PROFILE</div>
      <div class="globe-threat-hologram-title">${this.escapeHologramText(profile.threatName)}</div>
      <div class="globe-threat-hologram-risk">
        <span>RISK INDEX</span>
        <strong>${this.escapeHologramText(profile.score)} / ${this.escapeHologramText(profile.severity.toUpperCase())}</strong>
      </div>
      <div class="globe-threat-hologram-decision-strip" aria-label="Route decision preview">
        <div>
          <span>ROUTE</span>
          <strong>${this.escapeHologramText(profile.routeDecision)}</strong>
        </div>
        <div>
          <span>PARTY</span>
          <strong>${this.escapeHologramText(profile.partyReadinessShort)}</strong>
        </div>
        <div>
          <span>RECOVERY</span>
          <strong>${this.escapeHologramText(profile.rewardShort)}</strong>
        </div>
      </div>
      <div class="globe-threat-hologram-grid">
        <span>CLASS</span>
        <strong>${this.escapeHologramText(profile.typeLabel)} / LVL ${this.escapeHologramText(profile.level)}</strong>
        <span>VECTOR</span>
        <strong>${this.escapeHologramText(profile.vector)}</strong>
        <span>TEACHES</span>
        <strong>${this.escapeHologramText(profile.concepts)}</strong>
        <span>PARTY</span>
        <strong>${this.escapeHologramText(profile.partyReadiness)}</strong>
        <span>OBJECTIVE</span>
        <strong>${this.escapeHologramText(profile.objective)}</strong>
        <span>RESPONSE</span>
        <strong>${this.escapeHologramText(profile.response)}</strong>
        <span>RECOVERY</span>
        <strong>${this.escapeHologramText(profile.reward)}</strong>
      </div>
    `;
  }

  positionThreatHologram(x, y, options = {}) {
    if (!this.hologram) {
      return;
    }

    // Keep the blurred hologram frame inside the viewport, not just the element box.
    const margin = 34;
    const minTop = Math.min(margin, Math.max(24, window.innerHeight - 24));
    const offset = 22;
    const rect = this.hologram.getBoundingClientRect();
    const width = rect.width || 320;
    const height = rect.height || 260;
    const maxLeft = Math.max(margin, window.innerWidth - width - margin);
    const maxTop = Math.max(minTop, window.innerHeight - height - margin);
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    if (options.fixed === true) {
      const fixedLeft = clamp(window.innerWidth - width - margin, margin, maxLeft);
      const fixedTop = clamp(Math.round((window.innerHeight - height) / 2), minTop, maxTop);
      this.hologram.style.setProperty("--hologram-x", `${Math.round(fixedLeft)}px`);
      this.hologram.style.setProperty("--hologram-y", `${Math.round(fixedTop)}px`);
      return;
    }

    let left = x + offset;
    let top = y - Math.min(140, height * 0.38);

    if (left + width + margin > window.innerWidth) {
      left = x - width - offset;
    }
    left = clamp(left, margin, maxLeft);
    top = clamp(top, minTop, maxTop);

    this.hologram.style.setProperty("--hologram-x", `${Math.round(left)}px`);
    this.hologram.style.setProperty("--hologram-y", `${Math.round(top)}px`);
  }

  showThreatHologram(threat, event, options = {}) {
    if (!options.force && !this.canShowGlobeThreatHologram()) {
      this.logInactiveHologramSkip();
      this.clearHoverState();
      return;
    }

    this.ensureThreatHologram();
    if (!this.hologram) {
      this.logHologramDebug("[HOLOGRAM ERROR] missing hologram element");
      return;
    }

    if (!threat) {
      return;
    }

    const profile = this.getThreatRiskProfile(threat);
    if (this.hologramThreatId !== threat.id) {
      const debugClass = this.shouldLogHologramDebug() ? " is-debug" : "";
      this.hologram.className = `globe-threat-hologram is-visible is-${profile.severity}${debugClass}`;
      this.hologram.innerHTML = this.buildThreatHologramMarkup(profile);
      this.hologramThreatId = threat.id;
      this.logHologramDebug("[HOLOGRAM] show", { threatId: threat.id, score: profile.score, severity: profile.severity });
      this.logHologramDebug("[HOLOGRAM] profile", profile);
    } else if (!this.hologram.classList.contains("is-visible")) {
      this.hologram.classList.add("is-visible");
    }

    if (this.shouldLogHologramDebug()) {
      this.hologram.classList.add("is-debug");
    } else {
      this.hologram.classList.remove("is-debug");
    }

    this.hologram.setAttribute("aria-hidden", "false");
    this.positionThreatHologram(event?.clientX || window.innerWidth - 380, event?.clientY || 180, {
      ...options,
      fixed: options.fixed !== false
    });
    this.logHologramDomState();
  }

  buildRegionHologramMarkup(region) {
    const sectors = window.THREATGRID_WORLD_DATA?.getWorldSectorsForRegion?.(region?.id) || [];
    const firstSector = sectors[0];
    return `
      <div class="globe-threat-hologram-scan"></div>
      <div class="globe-threat-hologram-kicker">REGION PRESSURE / SELECTABLE</div>
      <div class="globe-threat-hologram-title">${this.escapeHologramText(region?.displayName || region?.title, "NORTH AMERICA")}</div>
      <div class="globe-threat-hologram-risk">
        <span>Threat Pressure</span>
        <strong>${this.escapeHologramText(region?.threatPressure, "CRITICAL CORRIDOR ACTIVITY")}</strong>
      </div>
      <div class="globe-threat-hologram-decision-strip">
        <div><span>Sector Count</span><strong>${sectors.length || 0}</strong></div>
        <div><span>Available Sector</span><strong>${this.escapeHologramText(firstSector?.title, "ATLANTIC MEDICAL CORRIDOR")}</strong></div>
        <div><span>Action</span><strong>SELECT REGION</strong></div>
      </div>
      <div class="globe-threat-hologram-grid">
        <span>Summary</span>
        <strong>${this.escapeHologramText(region?.summary, "REGIONAL CYBER DEFENSE ROUTE AVAILABLE.")}</strong>
      </div>
    `;
  }

  showRegionHologram(region, event, options = {}) {
    if (!options.force && !this.canShowGlobeThreatHologram()) {
      this.logInactiveHologramSkip();
      this.clearHoverState();
      return;
    }

    this.ensureThreatHologram();
    if (!this.hologram || !region) {
      return;
    }

    const regionKey = region.id || "north-america";
    if (this.hologramThreatId !== `region:${regionKey}`) {
      const debugClass = this.shouldLogHologramDebug() ? " is-debug" : "";
      this.hologram.className = `globe-threat-hologram is-visible is-region${debugClass}`;
      this.hologram.innerHTML = this.buildRegionHologramMarkup(region);
      this.hologramThreatId = `region:${regionKey}`;
    } else if (!this.hologram.classList.contains("is-visible")) {
      this.hologram.classList.add("is-visible");
    }

    this.hologram.setAttribute("aria-hidden", "false");
    this.positionThreatHologram(event?.clientX || window.innerWidth - 380, event?.clientY || 180, {
      ...options,
      fixed: options.fixed !== false
    });
  }

  selectWorldRegion(regionKey = "north-america") {
    this.selectedRegionKey = regionKey;
    this.regionMap.forEach((region, key) => {
      region.group.userData.selected = key === regionKey;
    });
    window.THREATGRID_WORLD_STATE?.setRegionSelection?.(regionKey);
  }

  hideThreatHologram() {
    if (!this.hologram) {
      this.logHologramDebug("[HOLOGRAM ERROR] missing hologram element");
      return;
    }

    if (this.shouldLogHologramDebug() && this.hologram.classList.contains("is-visible")) {
      console.info("[HOLOGRAM] hide");
    }

    this.hologram.classList.remove("is-visible", "is-low", "is-medium", "is-high", "is-critical", "is-region", "is-debug");
    this.hologram.setAttribute("aria-hidden", "true");
    this.hologramThreatId = null;
    this.setThreatHoverLock(false);
  }

  devShowThreatHologram(index = 0) {
    if (!this.canShowGlobeThreatHologram()) {
      this.logInactiveHologramSkip();
      this.clearHoverState();
      return null;
    }

    this.ensureThreatHologram();
    this.syncThreatNodes();
    const activeNodes = Array.from(this.nodeMap.values()).filter((node) => node?.threat?.status === "active");
    const activeThreats = Array.isArray(this.threats) ? this.threats.filter((threat) => threat?.status === "active") : [];
    const safeIndex = Math.max(0, Math.min(Math.max(activeNodes.length, activeThreats.length) - 1, Math.floor(Number(index) || 0)));
    const node = activeNodes[safeIndex] || activeNodes[0] || null;
    const threat = node?.threat || activeThreats[safeIndex] || activeThreats[0] || null;
    if (!threat) {
      this.logHologramDebug("[HOLOGRAM ERROR] no active threat nodes available");
      return null;
    }

    const profile = this.getThreatRiskProfile(threat);
    this.showThreatHologram(threat, { clientX: window.innerWidth - 380, clientY: window.innerHeight / 2 }, { fixed: true });
    this.setThreatHoverLock(true);
    this.logHologramDebug("[HOLOGRAM] force show succeeded", {
      threatId: threat.id,
      threatName: profile.threatName
    });
    this.logHologramDebug("[HOLOGRAM] profile", profile);
    this.logHologramDomState();
    return profile;
  }

  setThreatHoverLock(isLocked) {
    if (this.isThreatHoverLocked === Boolean(isLocked)) {
      return;
    }

    this.isThreatHoverLocked = Boolean(isLocked);
    if (this.isThreatHoverLocked) {
      this.rotationVelocity.x = 0;
      this.rotationVelocity.y = 0;
      this.logHologramDebug("[HOLOGRAM DEBUG] rotation paused");
    } else {
      this.logHologramDebug("[HOLOGRAM DEBUG] rotation resumed");
    }
  }

  // handleClick() uses the raycast result to find the threat object and pass it to the registered callbacks.
  handleClick(event) {
    if (!this.canShowGlobeThreatHologram()) {
      this.clearHoverState();
      return;
    }

    this.updatePointer(event);
    const threatIntersection = this.getThreatIntersection();
    if (threatIntersection) {
      const threatId = threatIntersection.object.userData.threatId;
      const node = this.nodeMap.get(threatId);
      if (!node) {
        return;
      }

      this.clearHoverState();
      this.clickHandlers.forEach((callback) => callback(node.threat));
      return;
    }

    const regionIntersection = this.getRegionIntersection();
    if (!regionIntersection) {
      return;
    }

    const regionKey = regionIntersection.object.userData.regionKey;
    const region = this.regionMap.get(regionKey);
    if (!region) {
      return;
    }

    this.selectWorldRegion(regionKey);
    this.regionClickHandlers.forEach((callback) => callback(region.region, regionKey));
  }

  // updateHoverState() changes the cursor and marks the hovered node so the pulse can brighten.
  updateHoverState(event = null) {
    if (!this.canShowGlobeThreatHologram()) {
      this.logInactiveHologramSkip();
      this.clearHoverState();
      return;
    }

    const intersection = this.getThreatIntersection();
    const nextId = intersection ? intersection.object.userData.threatId : null;
    const regionIntersection = nextId ? null : this.getRegionIntersection();
    const nextRegionKey = regionIntersection ? regionIntersection.object.userData.regionKey : null;

    if (this.hoveredThreatId === nextId && this.hoveredRegionKey === nextRegionKey) {
      if (nextId && event) {
        const node = this.nodeMap.get(nextId);
        this.showThreatHologram(node?.threat, event);
        this.setThreatHoverLock(true);
      } else if (nextRegionKey && event) {
        const region = this.regionMap.get(nextRegionKey);
        this.showRegionHologram(region?.region, event);
      }
      return;
    }

    this.hoveredThreatId = nextId;
    this.hoveredRegionKey = nextRegionKey;
    document.body.style.cursor = nextId || nextRegionKey ? "pointer" : "default";
    if (nextId) {
      const node = this.nodeMap.get(nextId);
      const title = node?.threat?.title || "Unknown Threat";
      this.logHologramDebug(`[HOLOGRAM DEBUG] hovered threat: ${title} (${nextId})`);
    }

    this.nodeMap.forEach((node, id) => {
      node.group.userData.hovered = id === nextId;
    });
    this.regionMap.forEach((region, key) => {
      region.group.userData.hovered = key === nextRegionKey;
    });

    if (nextId) {
      const node = this.nodeMap.get(nextId);
      this.setThreatHoverLock(true);
      this.showThreatHologram(node?.threat, event);
      window.THREATGRID_WORLD_STATE?.setRegionHover?.("");
    } else if (nextRegionKey) {
      const region = this.regionMap.get(nextRegionKey);
      this.setThreatHoverLock(true);
      window.THREATGRID_WORLD_STATE?.setRegionHover?.(nextRegionKey);
      this.showRegionHologram(region?.region, event);
    } else {
      this.logHologramDebug("[HOLOGRAM DEBUG] hover cleared");
      this.hideThreatHologram();
      window.THREATGRID_WORLD_STATE?.setRegionHover?.("");
    }
  }

  // clearHoverState() resets any highlight when the pointer leaves the globe area.
  clearHoverState() {
    this.hoveredThreatId = null;
    this.hoveredRegionKey = null;
    document.body.style.cursor = "default";
    this.nodeMap.forEach((node) => {
      node.group.userData.hovered = false;
    });
    this.regionMap.forEach((region) => {
      region.group.userData.hovered = false;
    });
    this.hideThreatHologram();
    window.THREATGRID_WORLD_STATE?.setRegionHover?.("");
    this.setThreatHoverLock(false);
  }

  // updateActiveCount() reads the threats array directly so the HUD stays in sync with global state.
  updateActiveCount() {
    const count = this.threats.filter((threat) => threat.status === "active").length;
    document.getElementById("active-count").textContent = String(count).padStart(2, "0");
  }

  // respawnRandomThreat() is a simple placeholder for future threat lifecycle logic.
  respawnRandomThreat() {
    const inactiveThreats = this.threats.filter((threat) => threat.status !== "active");
    if (inactiveThreats.length === 0) {
      return;
    }

    const threat = inactiveThreats[Math.floor(Math.random() * inactiveThreats.length)];
    threat.status = "active";
    this.addThreatNode(threat);
    this.updateActiveCount();
  }

  // animate() runs once per frame, updating rotation, pulsing, hover glow, and the final render call.
  animate() {
    requestAnimationFrame(() => this.animate());

    const elapsed = this.clock.getElapsedTime();

    if (!this.isThreatHoverLocked || this.dragState.isDragging) {
      // Auto-rotation keeps the globe moving even when the player is not dragging it.
      this.globeGroup.rotation.y += this.autoRotateSpeed + this.rotationVelocity.y;
      this.globeGroup.rotation.x += this.rotationVelocity.x;
      this.globeGroup.rotation.x = Math.max(-0.85, Math.min(0.85, this.globeGroup.rotation.x));

      // Rotation velocity decays over time so drag input eases out instead of stopping instantly.
      this.rotationVelocity.y *= 0.94;
      this.rotationVelocity.x *= 0.9;
    }

    this.nodeMap.forEach((node) => {
      const { group, pointMesh, ringMesh, glowMesh } = node;
      const { pulseSpeed, pulseAmp, baseScale, hovered } = group.userData;

      // The sine wave turns elapsed time into a smooth up-and-down pulse for each threat marker.
      const wave = (Math.sin(elapsed * pulseSpeed) + 1) * 0.5;
      const hoverBoost = hovered ? 0.22 : 0;
      const scale = baseScale + (wave * pulseAmp) + hoverBoost;

      // Each mesh scales separately so the core, ring, and glow feel like one animated alert.
      pointMesh.scale.setScalar(scale);
      glowMesh.scale.setScalar(scale * 1.45);
      ringMesh.scale.setScalar(1 + (wave * 0.55) + (hovered ? 0.2 : 0));
      ringMesh.lookAt(this.camera.position);

      pointMesh.material.opacity = hovered ? 1 : 0.92;
      glowMesh.material.opacity = hovered ? 0.24 : 0.16;
      ringMesh.material.opacity = hovered ? 0.55 : 0.35;
    });

    this.regionMap.forEach((region) => {
      const hovered = Boolean(region.group.userData.hovered);
      const selected = Boolean(region.group.userData.selected);
      const wave = (Math.sin(elapsed * 2.1) + 1) * 0.5;
      const strength = selected ? 1 : hovered ? 0.82 : 0.42;

      region.fieldMeshes.forEach((field, index) => {
        const fieldPulse = selected ? 0.16 : hovered ? 0.11 : 0.035;
        const scalePulse = 1 + wave * (selected ? 0.085 : hovered ? 0.06 : 0.025);
        field.material.opacity = Math.min(0.22, field.userData.baseOpacity + fieldPulse + index * 0.008);
        field.scale.set(field.userData.baseScaleX * scalePulse, field.userData.baseScaleY * scalePulse, 1);
      });

      region.rings.forEach((ring, index) => {
        ring.lookAt(this.camera.position);
        ring.scale.setScalar(0.82 + wave * 0.18 + (hovered ? 0.11 : 0) + (selected ? 0.1 : 0) + index * 0.008);
        ring.material.opacity = (0.06 + wave * 0.035) * strength;
      });

      region.pressureField.material.opacity = (0.07 + wave * 0.055) * strength;
      region.outline.material.opacity = (0.22 + wave * 0.16) * strength;
      region.halo.material.opacity = (0.025 + wave * 0.04) * strength;
    });

    this.renderer.render(this.scene, this.camera);
  }

  // latLngToVector3() turns latitude/longitude into a 3D point on the sphere.
  // Phi and theta are the spherical angles needed to map real-world coordinates to Three.js space.
  latLngToVector3(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }
}
