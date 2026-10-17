import { createZip } from "./zip.js";

/**
 * Converts a File object to a Base64 Data URL.
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Converts any URL (e.g., blob: URL or relative path) to a Base64 Data URL.
 */
export async function urlToDataUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("data:")) return url;

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Could not convert URL to data URL, using original URL:", err);
    return url;
  }
}

/**
 * Converts all images in a graph/images list to Base64 Data URLs so that
 * the exported mini HTML page is 100% self-contained with no external dependencies.
 */
export async function prepareStandaloneGraph(graph, images = []) {
  // Map of image URL by node ID or name
  const imageMap = {};

  for (const img of images) {
    let dataUrl = img.image;
    if (img.file && img.file instanceof File) {
      dataUrl = await fileToDataUrl(img.file);
    } else if (img.image) {
      dataUrl = await urlToDataUrl(img.image);
    }
    imageMap[img.id] = dataUrl;
  }

  // Clone nodes with base64 images
  const nodes = await Promise.all(
    graph.nodes.map(async (n) => {
      let imgData = imageMap[n.id] || n.image;
      if (imgData && !imgData.startsWith("data:")) {
        imgData = await urlToDataUrl(imgData);
      }
      return {
        ...n,
        image: imgData,
      };
    })
  );

  return {
    nodes,
    edges: graph.edges,
  };
}

/**
 * Standalone CSS for the mini Street Viewer page.
 */
export function getMiniViewerCss() {
  return `
/* Reset & Viewport Base */
*, *::before, *::after {
  box-sizing: border-box;
  user-select: none;
  -webkit-user-select: none;
  margin: 0;
  padding: 0;
}
html, body, #app-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0b0c0e;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #f1f3f4;
  position: relative;
  touch-action: none;
}
.viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
  cursor: grab;
  background: #0b0c0e;
  perspective: 1000px;
}
.viewport:active {
  cursor: grabbing;
}

/* 3D Scene Wrapper with Pan, Tilt & Zoom */
.scene-wrapper {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: translate3d(var(--pan-x, 0px), var(--pan-y, 0px), 0px) scale(var(--zoom, 1)) rotateY(var(--tilt-y, 0deg)) rotateX(var(--tilt-x, 0deg));
  transition: transform 0.05s linear;
  transform-style: preserve-3d;
  will-change: transform;
}

/* Panorama / Image Layers */
.panorama-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  transition: opacity 0.2s ease-in-out;
  will-change: opacity;
}
body.fill-mode .panorama-layer {
  background-size: cover;
}
.panorama-layer.is-panorama {
  background-size: auto 100% !important;
  background-repeat: repeat-x !important;
  background-position-x: calc(50% + var(--pano-x, 0px)) !important;
  background-position-y: center !important;
}
.layer-current {
  z-index: 1;
  opacity: 1;
}
.layer-next {
  z-index: 2;
  opacity: 0;
  pointer-events: none;
}

/* Vignette Ambient Overlay */
.vignette-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  background: radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.4) 100%);
}

/* Floor Navigation Arrows */
.nav-arrows-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  perspective: 600px;
}
.streetview-arrow {
  position: absolute;
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-style: preserve-3d;
  transition: transform 0.15s ease-out;
  z-index: 12;
}
.arrow-forward {
  bottom: 18%;
  left: 50%;
  transform: translateX(-50%) perspective(400px) rotateX(55deg);
}
.arrow-backward {
  bottom: 36px;
  left: 50%;
  transform: translateX(-50%) perspective(400px) rotateX(-50deg);
}
.arrow-right {
  bottom: 18%;
  left: 70%;
  transform: translateX(-50%) perspective(400px) rotateX(55deg) rotateY(-30deg);
}
.arrow-left {
  bottom: 18%;
  left: 30%;
  transform: translateX(-50%) perspective(400px) rotateX(55deg) rotateY(30deg);
}
.arrow-disc {
  position: relative;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(240,244,255,0.85) 60%, rgba(26,115,232,0.4) 100%);
  border: 3px solid rgba(255,255,255,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a73e8;
  box-shadow: 0 4px 15px rgba(0,0,0,0.35);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.streetview-arrow:hover .arrow-disc {
  background: radial-gradient(circle, #ffffff 0%, #e8f0fe 70%, #1a73e8 100%);
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(26,115,232,0.6);
}
.streetview-arrow:active .arrow-disc {
  transform: scale(0.95);
}
.arrow-disc svg {
  width: 34px;
  height: 34px;
  stroke: #1a73e8;
  stroke-width: 3;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Floor Target Ring */
.floor-target-ring {
  position: absolute;
  left: 50%;
  bottom: 18%;
  transform: translateX(-50%) perspective(400px) rotateX(65deg);
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.25);
  background: radial-gradient(circle, rgba(26,115,232,0.15) 0%, transparent 70%);
  pointer-events: none;
  opacity: 0.5;
  display: none;
}

/* 360 Panorama Badge */
.pano-badge {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  padding: 4px 12px;
  border-radius: 9999px;
  background: rgba(32, 35, 42, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #8ab4f8;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

/* Top-Right & Bottom-Right UI Controls */
.top-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ctrl-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(32, 35, 42, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #f1f3f4;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}
.ctrl-btn:hover {
  background: rgba(45, 50, 60, 0.95);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.25);
}
.ctrl-btn svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.view-controls {
  position: absolute;
  bottom: 20px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 20;
}
.view-btn-group {
  background: rgba(32, 35, 42, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 6px 18px rgba(0,0,0,0.35);
}
.view-btn-group button {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #f1f3f4;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.view-btn-group button:last-child {
  border-bottom: none;
}
.view-btn-group button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}
.view-btn-group button.active {
  color: #8ab4f8;
  background: rgba(26, 115, 232, 0.15);
}
.view-btn-group button svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Watermark / Brand Badge */
.brand-pill {
  position: absolute;
  bottom: 20px;
  left: 16px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(32, 35, 42, 0.8);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  padding: 6px 12px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11px;
  color: #9aa0a6;
  pointer-events: auto;
  text-decoration: none;
  transition: opacity 0.2s, color 0.2s;
}
.brand-pill:hover {
  color: #8ab4f8;
  border-color: rgba(138, 180, 248, 0.3);
}
`.trim();
}

/**
 * Generates the vanilla JavaScript runtime for the mini Street Viewer.
 */
export function getMiniViewerScript(graphData) {
  const jsonGraph = JSON.stringify(graphData);

  return `
(function() {
  const graph = ${jsonGraph};
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    console.error("No graph data provided to Street Viewer");
    return;
  }

  // State variables
  let currId = graph.nodes[0].id;
  let pan = { x: 0, y: 0 };
  let panoX = 0;
  let zoom = 1;
  let isFillMode = false;
  let isDrag = false;
  let startX = 0;
  let startY = 0;
  let curLayer = 0; // 0 = A, 1 = B

  // DOM Elements
  const container = document.getElementById("app-container");
  const viewport = document.getElementById("viewport");
  const layerA = document.getElementById("layer-a");
  const layerB = document.getElementById("layer-b");
  const navArrows = document.getElementById("nav-arrows");
  const floorRing = document.getElementById("floor-target-ring");
  const panoBadge = document.getElementById("pano-badge");
  const btnFill = document.getElementById("btn-fill");
  const btnZoomIn = document.getElementById("btn-zoom-in");
  const btnZoomOut = document.getElementById("btn-zoom-out");
  const btnReset = document.getElementById("btn-reset");
  const btnFullscreen = document.getElementById("btn-fullscreen");

  // Audio synthesizer for spatial footstep
  function playStepSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch (e) {}
  }

  function getCurrentNode() {
    return graph.nodes.find(function(n) { return n.id === currId; }) || graph.nodes[0];
  }

  function updateCam() {
    const node = getCurrentNode();
    const isP = Boolean(node && node.isPanorama);

    const panXVal = isP ? 0 : pan.x;
    document.documentElement.style.setProperty("--pan-x", panXVal + "px");
    document.documentElement.style.setProperty("--pan-y", pan.y + "px");
    document.documentElement.style.setProperty("--pano-x", panoX + "px");
    document.documentElement.style.setProperty("--tilt-y", ((isP ? 0 : pan.x / 280) * 8) + "deg");
    document.documentElement.style.setProperty("--tilt-x", (-(pan.y / 180) * 6) + "deg");
    document.documentElement.style.setProperty("--zoom", zoom);

    if (isP) {
      updatePanoArrows();
    }
  }

  function updatePanoArrows() {
    const node = getCurrentNode();
    if (!node || !node.isPanorama) return;

    const out = graph.edges.filter(function(e) { return e.from === currId; });
    const H = window.innerHeight || 800;
    const AR = 2.0;
    const W_rev = H * AR;

    const arrowEls = navArrows.querySelectorAll(".streetview-arrow");
    arrowEls.forEach(function(el) {
      const targetId = el.getAttribute("data-to");
      const edge = out.find(function(e) { return e.to === targetId; });
      if (!edge) return;

      const baseAngle =
        edge.direction === "forward" ? 0 :
        edge.direction === "right" ? 90 :
        edge.direction === "left" ? -90 : 180;

      const viewAngle = (panoX / W_rev) * 360;
      let relAngle = (baseAngle + viewAngle) % 360;
      if (relAngle > 180) relAngle -= 360;
      if (relAngle < -180) relAngle += 360;

      let inView = Math.abs(relAngle) <= 85;
      let screenLeftPercent = 50 + (relAngle / 85) * 38;

      if (out.length === 1 && !inView) {
        inView = true;
        screenLeftPercent = 50;
      }

      if (inView) {
        el.style.display = "flex";
        el.style.left = screenLeftPercent.toFixed(1) + "%";
        el.style.transform = "translateX(-50%) perspective(400px) rotateX(" + (edge.direction === "backward" ? "-45deg" : "50deg") + ")";
      } else {
        el.style.display = "none";
      }
    });
  }

  function renderArrows() {
    navArrows.innerHTML = "";
    const node = getCurrentNode();
    if (!node) return;

    const isP = Boolean(node.isPanorama);
    const out = graph.edges.filter(function(e) { return e.from === currId; });

    // Pano badge
    if (panoBadge) {
      panoBadge.style.display = isP ? "flex" : "none";
    }

    // Floor Target Ring
    if (floorRing) {
      floorRing.style.display = (!isP && out.some(function(e) { return e.direction === "forward"; })) ? "block" : "none";
    }

    out.forEach(function(edge) {
      const arrow = document.createElement("div");
      arrow.className = "streetview-arrow arrow-" + (edge.direction || "forward");
      arrow.setAttribute("data-to", edge.to);

      let pts = "18 15 12 9 6 15"; // default forward
      if (edge.direction === "backward") pts = "6 9 12 15 18 9";
      else if (edge.direction === "right") pts = "9 18 15 12 9 6";
      else if (edge.direction === "left") pts = "15 18 9 12 15 6";

      arrow.innerHTML = '<div class="arrow-disc"><svg viewBox="0 0 24 24"><polyline points="' + pts + '"></polyline></svg></div>';

      arrow.addEventListener("click", function(ev) {
        ev.stopPropagation();
        goTo(edge.to, edge.direction);
      });

      navArrows.appendChild(arrow);
    });

    if (isP) {
      updatePanoArrows();
    }
  }

  function goTo(targetId, dir, force) {
    const targetNode = graph.nodes.find(function(n) { return n.id === targetId; });
    if (!targetNode) return;

    const currEl = curLayer === 0 ? layerA : layerB;
    const nextEl = curLayer === 0 ? layerB : layerA;

    if (!force && targetId === currId && currEl.style.backgroundImage) return;

    playStepSound();

    panoX = 0;
    currId = targetId;

    nextEl.style.backgroundImage = 'url("' + targetNode.image + '")';
    nextEl.className = "panorama-layer layer-next" + (targetNode.isPanorama ? " is-panorama" : "");

    nextEl.style.opacity = "1";
    currEl.style.opacity = "0";

    setTimeout(function() {
      curLayer = 1 - curLayer;
      currEl.className = "panorama-layer layer-next";
      nextEl.className = "panorama-layer layer-current" + (targetNode.isPanorama ? " is-panorama" : "");
      renderArrows();
      updateCam();
    }, 200);
  }

  // Pointer & Drag handling
  function handleDragStart(x, y) {
    isDrag = true;
    startX = x;
    startY = y;
  }

  function handleDragMove(x, y) {
    if (!isDrag) return;
    const deltaX = x - startX;
    const deltaY = y - startY;
    startX = x;
    startY = y;

    const node = getCurrentNode();
    const isP = Boolean(node && node.isPanorama);

    if (isP) {
      panoX += deltaX * 1.3;
      pan.y = Math.max(-80, Math.min(80, pan.y + deltaY * 0.4));
    } else {
      pan.x = Math.max(-240, Math.min(240, pan.x + deltaX));
      pan.y = Math.max(-120, Math.min(120, pan.y + deltaY));
    }
    updateCam();
  }

  function handleDragEnd() {
    isDrag = false;
  }

  viewport.addEventListener("mousedown", function(e) {
    if (!e.target.closest(".streetview-arrow") && !e.target.closest("button")) {
      handleDragStart(e.clientX, e.clientY);
    }
  });

  window.addEventListener("mousemove", function(e) {
    handleDragMove(e.clientX, e.clientY);
  });

  window.addEventListener("mouseup", handleDragEnd);

  // Mobile Touch handling
  viewport.addEventListener("touchstart", function(e) {
    if (e.touches.length === 1 && !e.target.closest(".streetview-arrow") && !e.target.closest("button")) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  window.addEventListener("touchmove", function(e) {
    if (e.touches.length === 1 && isDrag) {
      e.preventDefault();
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  window.addEventListener("touchend", handleDragEnd);

  // Mouse wheel zoom
  viewport.addEventListener("wheel", function(e) {
    e.preventDefault();
    zoom = Math.max(0.95, Math.min(2.4, zoom - e.deltaY * 0.0015));
    updateCam();
  }, { passive: false });

  // Control Buttons
  if (btnFill) {
    btnFill.addEventListener("click", function() {
      isFillMode = !isFillMode;
      document.body.classList.toggle("fill-mode", isFillMode);
      btnFill.classList.toggle("active", isFillMode);
    });
  }

  if (btnZoomIn) {
    btnZoomIn.addEventListener("click", function() {
      zoom = Math.min(2.4, zoom + 0.2);
      updateCam();
    });
  }

  if (btnZoomOut) {
    btnZoomOut.addEventListener("click", function() {
      zoom = Math.max(0.95, zoom - 0.2);
      updateCam();
    });
  }

  if (btnReset) {
    btnReset.addEventListener("click", function() {
      pan = { x: 0, y: 0 };
      panoX = 0;
      zoom = 1;
      updateCam();
    });
  }

  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", function() {
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) container.requestFullscreen();
        else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    });
  }

  window.addEventListener("resize", function() {
    updateCam();
    renderArrows();
  });

  // Mount initial view
  const initialNode = getCurrentNode();
  if (initialNode) {
    layerA.style.backgroundImage = 'url("' + initialNode.image + '")';
    if (initialNode.isPanorama) layerA.classList.add("is-panorama");
    renderArrows();
    updateCam();
  }
})();
`.trim();
}

/**
 * Generates the complete, standalone mini HTML page.
 * Includes embedded CSS, JS, and Base64 images.
 */
export function generateMiniViewerHtml({ graph, title = "Street Viewer 3D" }) {
  const css = getMiniViewerCss();
  const script = getMiniViewerScript(graph);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${escapeHtml(title)}</title>
  <style>
${css}
  </style>
</head>
<body>
  <div id="app-container">
    <main class="viewport" id="viewport">
      <div class="scene-wrapper" id="scene-wrapper">
        <div id="layer-a" class="panorama-layer layer-current"></div>
        <div id="layer-b" class="panorama-layer layer-next"></div>
      </div>

      <div class="vignette-overlay"></div>

      <div class="nav-arrows-container" id="nav-container">
        <div id="floor-target-ring" class="floor-target-ring"></div>
        <div id="nav-arrows"></div>
      </div>

      <div id="pano-badge" class="pano-badge" style="display: none;">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <span>360° Panorama</span>
      </div>
    </main>

    <!-- Top-Right Fullscreen Control -->
    <div class="top-controls">
      <button class="ctrl-btn" id="btn-fullscreen" title="Toggle Fullscreen">
        <svg viewBox="0 0 24 24">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        </svg>
      </button>
    </div>

    <!-- Bottom-Right Viewer Controls -->
    <div class="view-controls">
      <div class="view-btn-group">
        <button id="btn-fill" title="Toggle Fit / Fill Mode">
          <svg viewBox="0 0 24 24">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        </button>
        <button id="btn-zoom-in" title="Zoom In (+)">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button id="btn-zoom-out" title="Zoom Out (-)">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button id="btn-reset" title="Reset View">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="4"></circle>
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  </div>

  <script>
${script}
  </script>
</body>
</html>`;
}

/**
 * Creates a ZIP archive containing separate index.html, style.css, and viewer.js.
 */
export function generateSeparateFilesZip({ graph, title = "Street Viewer 3D" }) {
  const css = getMiniViewerCss();
  const script = getMiniViewerScript(graph);

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app-container">
    <main class="viewport" id="viewport">
      <div class="scene-wrapper" id="scene-wrapper">
        <div id="layer-a" class="panorama-layer layer-current"></div>
        <div id="layer-b" class="panorama-layer layer-next"></div>
      </div>

      <div class="vignette-overlay"></div>

      <div class="nav-arrows-container" id="nav-container">
        <div id="floor-target-ring" class="floor-target-ring"></div>
        <div id="nav-arrows"></div>
      </div>

      <div id="pano-badge" class="pano-badge" style="display: none;">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <span>360° Panorama</span>
      </div>
    </main>

    <!-- Top-Right Fullscreen Control -->
    <div class="top-controls">
      <button class="ctrl-btn" id="btn-fullscreen" title="Toggle Fullscreen">
        <svg viewBox="0 0 24 24">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        </svg>
      </button>
    </div>

    <!-- Bottom-Right Controls -->
    <div class="view-controls">
      <div class="view-btn-group">
        <button id="btn-fill" title="Toggle Fit / Fill Mode">
          <svg viewBox="0 0 24 24">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        </button>
        <button id="btn-zoom-in" title="Zoom In (+)">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button id="btn-zoom-out" title="Zoom Out (-)">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button id="btn-reset" title="Reset View">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="4"></circle>
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  </div>

  <script src="viewer.js"></script>
</body>
</html>`;

  const readme = `Street Viewer 3D - Standalone Embed Package
===============================================

HOW TO EMBED IN YOUR WEBSITE AS AN IFRAME:

1. Upload the files (index.html, style.css, viewer.js) to your web server or hosting directory (e.g. /tours/virtual-tour/).

2. Insert this iframe into your webpage:

<iframe 
  src="/tours/virtual-tour/index.html" 
  width="100%" 
  height="600" 
  style="border: none; border-radius: 12px; overflow: hidden;" 
  allow="fullscreen; accelerometer; gyroscope" 
  loading="lazy"
  allowfullscreen>
</iframe>

Enjoy your virtual tour!
`;

  return createZip([
    { name: "index.html", content: indexHtml },
    { name: "style.css", content: css },
    { name: "viewer.js", content: script },
    { name: "README.txt", content: readme },
  ]);
}

/**
 * Triggers a client-side file download.
 */
export function downloadFile(content, fileName, mimeType = "text/html") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
