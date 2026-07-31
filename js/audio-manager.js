/* THREATGRID AudioManager.
   Local CC0 audio is preferred where available; generated Web Audio remains as a safe fallback. */
(function () {
  "use strict";

  const SETTINGS_KEY = "threatgrid.audio.settings.v1";
  const UNLOCK_EVENTS = ["pointerdown", "click", "keydown"];
  const DEFAULT_SETTINGS = {
    master: 0.78,
    music: 0.68,
    ambience: 0.68,
    sfx: 0.82,
    muted: false
  };
  const SCREEN_ROUTE_LOOKUP = {
    menu: "menu",
    howtoplay: "menu",
    defenders: "loadout",
    "expedition-loadout": "loadout",
    forge: "forge",
    game: "globe",
    combat: "combat",
    reward: "reward",
    "game-over": "game-over"
  };
  const LAYER_CONFIGS = {
    menu: {
      group: "ambience",
      oscillators: [
        { type: "sine", frequency: 72, gain: 0.06 },
        { type: "triangle", frequency: 144, gain: 0.025 }
      ],
      noiseGain: 0.018,
      filterFrequency: 520
    },
    globe: {
      group: "ambience",
      oscillators: [
        { type: "sine", frequency: 96, gain: 0.048 },
        { type: "square", frequency: 192, gain: 0.012 }
      ],
      noiseGain: 0.012,
      filterFrequency: 780
    },
    loadout: {
      group: "ambience",
      oscillators: [
        { type: "sine", frequency: 88, gain: 0.04 },
        { type: "triangle", frequency: 176, gain: 0.018 }
      ],
      noiseGain: 0.01,
      filterFrequency: 620
    },
    forge: {
      group: "ambience",
      oscillators: [
        { type: "sawtooth", frequency: 55, gain: 0.035 },
        { type: "sine", frequency: 165, gain: 0.03 }
      ],
      noiseGain: 0.026,
      filterFrequency: 420
    },
    combat: {
      group: "music",
      oscillators: [
        { type: "square", frequency: 64, gain: 0.032 },
        { type: "sine", frequency: 128, gain: 0.045 }
      ],
      noiseGain: 0.018,
      filterFrequency: 860
    },
    "combat-high": {
      group: "music",
      oscillators: [
        { type: "sawtooth", frequency: 97, gain: 0.025 },
        { type: "triangle", frequency: 194, gain: 0.02 }
      ],
      noiseGain: 0.012,
      filterFrequency: 1100
    },
    "low-hp": {
      group: "sfx",
      oscillators: [
        { type: "sine", frequency: 44, gain: 0.034 },
        { type: "triangle", frequency: 220, gain: 0.012 }
      ],
      noiseGain: 0.006,
      filterFrequency: 700
    },
    reward: {
      group: "music",
      oscillators: [
        { type: "sine", frequency: 132, gain: 0.05 },
        { type: "triangle", frequency: 264, gain: 0.024 }
      ],
      noiseGain: 0.008,
      filterFrequency: 900
    },
    "game-over": {
      group: "music",
      oscillators: [
        { type: "sawtooth", frequency: 49, gain: 0.035 },
        { type: "sine", frequency: 98, gain: 0.018 }
      ],
      noiseGain: 0.02,
      filterFrequency: 360
    }
  };
  const LOCAL_AUDIO_ASSETS = {
    layers: {
      combat: {
        src: "assets/audio/music/combat/ai_fight_120bpm.ogg",
        group: "music",
        gain: 0.34
      },
      "combat-high": {
        src: "assets/audio/music/combat/system_overload_154bpm.ogg",
        group: "music",
        gain: 0.2
      },
      forge: {
        src: "assets/audio/music/forge/new_factory_129bpm.ogg",
        group: "ambience",
        gain: 0.22
      }
    },
    sfx: {
      click: {
        src: "assets/audio/sfx/ui/click.ogg",
        gain: 0.56
      },
      hover: {
        src: "assets/audio/sfx/ui/hover.ogg",
        gain: 0.38
      },
      confirm: {
        src: "assets/audio/sfx/ui/confirm.ogg",
        gain: 0.5
      },
      cancel: {
        src: "assets/audio/sfx/ui/cancel.ogg",
        gain: 0.52
      }
    }
  };

  let initialized = false;
  let unlocked = false;
  let audioContext = null;
  let masterGain = null;
  let groupGains = {};
  let activeScreen = "menu";
  let activeRoute = "menu";
  let combatIntensity = "normal";
  let lowHpActive = false;
  let lastError = "";
  let noiseBuffer = null;
  const settings = { ...DEFAULT_SETTINGS };
  const activeLayers = new Map();
  const audioBuffers = new Map();
  const failedLocalAssets = new Set();
  const pendingAudioLoads = new Map();

  function debugLog(...args) {
    if (typeof window !== "undefined" && window.THREATGRID_AUDIO_DEBUG === true) {
      console.info(...args);
    }
  }

  function clamp01(value, fallback = 0) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return fallback;
    }

    return Math.max(0, Math.min(1, numericValue));
  }

  function getAudioContextConstructor() {
    if (typeof window === "undefined") {
      return null;
    }

    return window.AudioContext || window.webkitAudioContext || null;
  }

  function loadSettings() {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    try {
      const savedSettings = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}");
      settings.master = clamp01(savedSettings.master, DEFAULT_SETTINGS.master);
      settings.music = clamp01(savedSettings.music, DEFAULT_SETTINGS.music);
      settings.ambience = clamp01(savedSettings.ambience, DEFAULT_SETTINGS.ambience);
      settings.sfx = clamp01(savedSettings.sfx, DEFAULT_SETTINGS.sfx);
      settings.muted = Boolean(savedSettings.muted);
    } catch (error) {
      lastError = error?.message || String(error);
      debugLog("[AUDIO DEBUG] settings load failed", lastError);
    }
  }

  function saveSettings() {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      lastError = error?.message || String(error);
      debugLog("[AUDIO DEBUG] settings save failed", lastError);
    }
  }

  function applyVolumes() {
    if (!masterGain) {
      return;
    }

    const now = audioContext.currentTime;
    const masterVolume = settings.muted ? 0 : settings.master;
    masterGain.gain.setTargetAtTime(masterVolume, now, 0.04);
    Object.entries(groupGains).forEach(([group, gainNode]) => {
      const groupVolume = Number.isFinite(settings[group]) ? settings[group] : 1;
      gainNode.gain.setTargetAtTime(groupVolume, now, 0.04);
    });
  }

  function ensureNoiseBuffer() {
    if (!audioContext || noiseBuffer) {
      return noiseBuffer;
    }

    const bufferLength = Math.max(1, Math.floor(audioContext.sampleRate * 1.5));
    noiseBuffer = audioContext.createBuffer(1, bufferLength, audioContext.sampleRate);
    const channelData = noiseBuffer.getChannelData(0);
    for (let index = 0; index < bufferLength; index += 1) {
      channelData[index] = (Math.random() * 2 - 1) * 0.35;
    }

    return noiseBuffer;
  }

  function ensureContext() {
    if (audioContext) {
      return audioContext;
    }

    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) {
      lastError = "Web Audio API unavailable";
      debugLog("[AUDIO DEBUG] unavailable", lastError);
      return null;
    }

    try {
      audioContext = new AudioContextConstructor();
      masterGain = audioContext.createGain();
      masterGain.gain.value = settings.muted ? 0 : settings.master;
      masterGain.connect(audioContext.destination);
      groupGains = {
        music: audioContext.createGain(),
        ambience: audioContext.createGain(),
        sfx: audioContext.createGain()
      };
      Object.values(groupGains).forEach((gainNode) => {
        gainNode.connect(masterGain);
      });
      applyVolumes();
    } catch (error) {
      lastError = error?.message || String(error);
      debugLog("[AUDIO DEBUG] context failed", lastError);
      return null;
    }

    return audioContext;
  }

  function normalizeRoute(screenName) {
    return SCREEN_ROUTE_LOOKUP[screenName] || "menu";
  }

  function getLayerOutputGroup(config) {
    const groupName = config?.group || "ambience";
    return groupGains[groupName] || groupGains.ambience || masterGain;
  }

  function requestArrayBuffer(src) {
    if (typeof window !== "undefined" && typeof window.fetch === "function") {
      return window.fetch(src, { cache: "force-cache" }).then((response) => {
        if (!response.ok) {
          throw new Error(`Audio asset request failed: ${response.status} ${src}`);
        }

        return response.arrayBuffer();
      });
    }

    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || typeof window.XMLHttpRequest !== "function") {
        reject(new Error("No browser audio asset loader available"));
        return;
      }

      const request = new window.XMLHttpRequest();
      request.open("GET", src, true);
      request.responseType = "arraybuffer";
      request.onload = () => {
        if (request.status >= 200 && request.status < 300 && request.response) {
          resolve(request.response);
          return;
        }

        reject(new Error(`Audio asset request failed: ${request.status} ${src}`));
      };
      request.onerror = () => reject(new Error(`Audio asset request failed: ${src}`));
      request.send();
    });
  }

  function decodeAudioBuffer(arrayBuffer) {
    const context = ensureContext();
    if (!context) {
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      try {
        const maybePromise = context.decodeAudioData(arrayBuffer, resolve, reject);
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(resolve).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  function loadLocalAudioBuffer(assetKey, src) {
    if (audioBuffers.has(assetKey)) {
      return Promise.resolve(audioBuffers.get(assetKey));
    }

    if (failedLocalAssets.has(assetKey)) {
      return Promise.resolve(null);
    }

    if (pendingAudioLoads.has(assetKey)) {
      return pendingAudioLoads.get(assetKey);
    }

    const loadPromise = requestArrayBuffer(src)
      .then((arrayBuffer) => decodeAudioBuffer(arrayBuffer))
      .then((buffer) => {
        pendingAudioLoads.delete(assetKey);
        if (buffer) {
          audioBuffers.set(assetKey, buffer);
          debugLog("[AUDIO DEBUG] local asset loaded", assetKey, src);
        }

        return buffer;
      })
      .catch((error) => {
        pendingAudioLoads.delete(assetKey);
        failedLocalAssets.add(assetKey);
        lastError = error?.message || String(error);
        debugLog("[AUDIO DEBUG] local asset failed", assetKey, lastError);
        return null;
      });

    pendingAudioLoads.set(assetKey, loadPromise);
    return loadPromise;
  }

  function stopLayer(layerId, fadeSeconds = 0.55) {
    const layer = activeLayers.get(layerId);
    if (!layer || !audioContext) {
      return;
    }

    activeLayers.delete(layerId);
    const now = audioContext.currentTime;
    try {
      layer.gain.gain.cancelScheduledValues(now);
      layer.gain.gain.setValueAtTime(layer.gain.gain.value, now);
      layer.gain.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
    } catch (error) {
      lastError = error?.message || String(error);
      debugLog("[AUDIO DEBUG] fade stop failed", lastError);
    }

    window.setTimeout(() => {
      layer.sources.forEach((sourceNode) => {
        try {
          sourceNode.stop();
        } catch (error) {
          // Source nodes can already be stopped after a fade; silence is the safe fallback.
        }
      });
      layer.disconnectables.forEach((node) => {
        try {
          node.disconnect();
        } catch (error) {
          // Disconnection is best-effort cleanup.
        }
      });
    }, Math.ceil((fadeSeconds + 0.05) * 1000));
  }

  function stopAllLayers(fadeSeconds = 0.45) {
    Array.from(activeLayers.keys()).forEach((layerId) => stopLayer(layerId, fadeSeconds));
  }

  function startLocalLayer(layerId, configName, localConfig, buffer, fadeSeconds = 0.6) {
    const context = ensureContext();
    if (!context || !localConfig || !buffer) {
      return false;
    }

    const existing = activeLayers.get(layerId);
    if (existing?.configName === configName && existing.sourceType === "local") {
      return true;
    }

    stopLayer(layerId, fadeSeconds * 0.75);

    const source = context.createBufferSource();
    const layerGain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    layerGain.gain.value = 0.0001;
    source.connect(layerGain);
    layerGain.connect(getLayerOutputGroup(localConfig));
    source.start();

    const now = context.currentTime;
    layerGain.gain.linearRampToValueAtTime(localConfig.gain ?? 0.3, now + fadeSeconds);
    activeLayers.set(layerId, {
      configName,
      sourceType: "local",
      gain: layerGain,
      sources: [source],
      disconnectables: [source, layerGain]
    });
    debugLog("[AUDIO DEBUG] local layer start", layerId, configName, localConfig.src);
    return true;
  }

  function startGeneratedLayer(layerId, configName, fadeSeconds = 0.6) {
    const context = ensureContext();
    const config = LAYER_CONFIGS[configName];
    if (!context || !config) {
      return false;
    }

    const existing = activeLayers.get(layerId);
    if (existing?.configName === configName && existing.sourceType === "generated") {
      return true;
    }

    stopLayer(layerId, fadeSeconds * 0.75);

    const layerGain = context.createGain();
    const filter = context.createBiquadFilter();
    const sources = [];
    const disconnectables = [layerGain, filter];
    layerGain.gain.value = 0.0001;
    filter.type = "lowpass";
    filter.frequency.value = config.filterFrequency || 800;
    filter.Q.value = 0.7;
    filter.connect(layerGain);
    layerGain.connect(getLayerOutputGroup(config));

    (config.oscillators || []).forEach((oscillatorConfig) => {
      const oscillator = context.createOscillator();
      const oscillatorGain = context.createGain();
      oscillator.type = oscillatorConfig.type || "sine";
      oscillator.frequency.value = oscillatorConfig.frequency || 110;
      oscillatorGain.gain.value = oscillatorConfig.gain || 0.02;
      oscillator.connect(oscillatorGain);
      oscillatorGain.connect(filter);
      oscillator.start();
      sources.push(oscillator);
      disconnectables.push(oscillator, oscillatorGain);
    });

    if (config.noiseGain) {
      const noiseSource = context.createBufferSource();
      const noiseGain = context.createGain();
      noiseSource.buffer = ensureNoiseBuffer();
      noiseSource.loop = true;
      noiseGain.gain.value = config.noiseGain;
      noiseSource.connect(noiseGain);
      noiseGain.connect(filter);
      noiseSource.start();
      sources.push(noiseSource);
      disconnectables.push(noiseSource, noiseGain);
    }

    const now = context.currentTime;
    layerGain.gain.linearRampToValueAtTime(1, now + fadeSeconds);
    activeLayers.set(layerId, {
      configName,
      sourceType: "generated",
      gain: layerGain,
      sources,
      disconnectables
    });
    debugLog("[AUDIO DEBUG] generated layer start", layerId, configName);
    return true;
  }

  function tryPromoteLayerToLocal(layerId, configName, localConfig, fadeSeconds) {
    const assetKey = `layer:${configName}`;
    loadLocalAudioBuffer(assetKey, localConfig.src).then((buffer) => {
      const currentLayer = activeLayers.get(layerId);
      if (!buffer || currentLayer?.configName !== configName || currentLayer.sourceType === "local") {
        return;
      }

      startLocalLayer(layerId, configName, localConfig, buffer, fadeSeconds);
    });
  }

  function startLayer(layerId, configName, fadeSeconds = 0.6) {
    const localConfig = LOCAL_AUDIO_ASSETS.layers[configName];
    if (localConfig && !failedLocalAssets.has(`layer:${configName}`)) {
      const buffer = audioBuffers.get(`layer:${configName}`);
      if (buffer) {
        return startLocalLayer(layerId, configName, localConfig, buffer, fadeSeconds);
      }

      const existing = activeLayers.get(layerId);
      if (existing?.configName !== configName) {
        startGeneratedLayer(layerId, configName, fadeSeconds);
      }
      tryPromoteLayerToLocal(layerId, configName, localConfig, fadeSeconds);
      return true;
    }

    return startGeneratedLayer(layerId, configName, fadeSeconds);
  }

  function playLocalSfx(name) {
    const context = ensureContext();
    const sfxName = String(name || "").toLowerCase();
    const sfxConfig = LOCAL_AUDIO_ASSETS.sfx[sfxName];
    if (!context || !unlocked || !sfxConfig || failedLocalAssets.has(`sfx:${sfxName}`)) {
      return false;
    }

    const assetKey = `sfx:${sfxName}`;
    const buffer = audioBuffers.get(assetKey);
    if (!buffer) {
      loadLocalAudioBuffer(assetKey, sfxConfig.src);
      return false;
    }

    const source = context.createBufferSource();
    const gainNode = context.createGain();
    source.buffer = buffer;
    gainNode.gain.value = sfxConfig.gain ?? 0.5;
    source.connect(gainNode);
    gainNode.connect(groupGains.sfx || masterGain);
    source.start();
    window.setTimeout(() => {
      try {
        source.disconnect();
        gainNode.disconnect();
      } catch (error) {
        // Best-effort cleanup only.
      }
    }, Math.ceil((buffer.duration + 0.1) * 1000));
    debugLog("[AUDIO DEBUG] local sfx", sfxName);
    return true;
  }

  function preloadLocalSfx() {
    if (!unlocked) {
      return;
    }

    Object.entries(LOCAL_AUDIO_ASSETS.sfx).forEach(([name, config]) => {
      if (!failedLocalAssets.has(`sfx:${name}`)) {
        loadLocalAudioBuffer(`sfx:${name}`, config.src);
      }
    });
  }

  function refreshCombatOverlays() {
    if (!unlocked) {
      return;
    }

    if (activeRoute !== "combat") {
      stopLayer("combat-intensity");
      stopLayer("low-hp");
      return;
    }

    if (combatIntensity === "high") {
      startLayer("combat-intensity", "combat-high", 0.5);
    } else {
      stopLayer("combat-intensity");
    }

    if (lowHpActive) {
      startLayer("low-hp", "low-hp", 0.35);
    } else {
      stopLayer("low-hp");
    }
  }

  function refreshScreenLayer() {
    if (!unlocked) {
      return;
    }

    startLayer("screen", activeRoute, 0.7);
    refreshCombatOverlays();
  }

  function removeUnlockListeners() {
    if (typeof window === "undefined") {
      return;
    }

    UNLOCK_EVENTS.forEach((eventName) => {
      window.removeEventListener(eventName, handleFirstGesture, true);
    });
  }

  function handleFirstGesture() {
    removeUnlockListeners();
    manager.unlock();
  }

  function bindUnlockListeners() {
    if (typeof window === "undefined") {
      return;
    }

    UNLOCK_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleFirstGesture, { capture: true, once: true });
    });
  }

  function playToneStinger(name) {
    const context = ensureContext();
    if (!context || !unlocked) {
      return false;
    }

    const stingerName = String(name || "signal").toLowerCase();
    const rootFrequency = stingerName.includes("defeat")
      ? 58
      : stingerName.includes("victory") || stingerName.includes("reward")
        ? 176
        : 132;
    const duration = stingerName.includes("defeat") ? 1.4 : 0.75;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = stingerName.includes("defeat") ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(rootFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(rootFrequency * (stingerName.includes("defeat") ? 0.5 : 1.5), now + duration);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.14, now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gainNode);
    gainNode.connect(groupGains.sfx || masterGain);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.05);
    window.setTimeout(() => {
      try {
        oscillator.disconnect();
        gainNode.disconnect();
      } catch (error) {
        // Best-effort cleanup only.
      }
    }, Math.ceil((duration + 0.1) * 1000));
    debugLog("[AUDIO DEBUG] stinger", stingerName);
    return true;
  }

  const manager = {
    init() {
      if (initialized) {
        return true;
      }

      initialized = true;
      loadSettings();
      bindUnlockListeners();
      debugLog("[AUDIO DEBUG] init");
      return true;
    },

    async unlock() {
      const context = ensureContext();
      if (!context) {
        return false;
      }

      try {
        if (context.state !== "running" && typeof context.resume === "function") {
          await context.resume();
        }
        unlocked = context.state === "running";
        if (unlocked) {
          preloadLocalSfx();
          refreshScreenLayer();
          debugLog("[AUDIO DEBUG] unlock success", activeScreen, activeRoute);
        } else {
          debugLog("[AUDIO DEBUG] unlock pending", context.state);
        }
        return unlocked;
      } catch (error) {
        lastError = error?.message || String(error);
        debugLog("[AUDIO DEBUG] unlock failed", lastError);
        return false;
      }
    },

    setScreen(screenState) {
      activeScreen = String(screenState || "menu");
      activeRoute = normalizeRoute(activeScreen);
      debugLog("[AUDIO DEBUG] screen", activeScreen, "route", activeRoute);
      refreshScreenLayer();
      return activeRoute;
    },

    setCombatIntensity(level) {
      const safeLevel = String(level || "normal").toLowerCase();
      combatIntensity = safeLevel === "high" ? "high" : "normal";
      debugLog("[AUDIO DEBUG] combat intensity", combatIntensity);
      refreshCombatOverlays();
    },

    setLowHpActive(isActive) {
      lowHpActive = Boolean(isActive);
      debugLog("[AUDIO DEBUG] low hp", lowHpActive);
      refreshCombatOverlays();
    },

    playStinger(name) {
      return playLocalSfx(name) || playToneStinger(name);
    },

    setMuted(isMuted) {
      settings.muted = Boolean(isMuted);
      applyVolumes();
      saveSettings();
      debugLog("[AUDIO DEBUG] muted", settings.muted);
    },

    setVolume(group, value) {
      const groupName = String(group || "").toLowerCase();
      if (!Object.prototype.hasOwnProperty.call(settings, groupName) || groupName === "muted") {
        return false;
      }

      settings[groupName] = clamp01(value, settings[groupName]);
      applyVolumes();
      saveSettings();
      debugLog("[AUDIO DEBUG] volume", groupName, settings[groupName]);
      return true;
    },

    getSettings() {
      return {
        master: settings.master,
        music: settings.music,
        ambience: settings.ambience,
        sfx: settings.sfx,
        muted: settings.muted
      };
    },

    stopAll() {
      stopAllLayers(0.25);
    },

    getDebugState() {
      return {
        initialized,
        unlocked,
        contextState: audioContext?.state || "uncreated",
        screenState: activeScreen,
        route: activeRoute,
        combatIntensity,
        lowHpActive,
        muted: settings.muted,
        volumes: {
          master: settings.master,
          music: settings.music,
          ambience: settings.ambience,
          sfx: settings.sfx
        },
        activeLayers: Array.from(activeLayers.entries()).map(([id, layer]) => ({
          id,
          configName: layer.configName,
          sourceType: layer.sourceType || "generated"
        })),
        localAudio: {
          loaded: Array.from(audioBuffers.keys()),
          failed: Array.from(failedLocalAssets),
          pending: Array.from(pendingAudioLoads.keys())
        },
        lastError
      };
    }
  };

  if (typeof window !== "undefined") {
    window.THREATGRID_AUDIO = manager;
    window.devAudioState = () => manager.getDebugState();
    window.devUnlockAudio = () => manager.unlock();
    window.devMuteAudio = () => manager.setMuted(true);
    window.devUnmuteAudio = () => manager.setMuted(false);
    window.devSetAudioVolume = (group, value) => manager.setVolume(group, value);
    window.devSetAudioScreen = (screenName) => manager.setScreen(screenName);
    window.devSetCombatIntensity = (level) => manager.setCombatIntensity(level);
    window.devSetLowHpAudio = (isActive) => manager.setLowHpActive(isActive);
  }

  manager.init();
})();
