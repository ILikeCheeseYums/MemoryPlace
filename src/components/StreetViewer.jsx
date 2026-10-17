import React, { useState, useEffect, useRef, useCallback } from "react";
import { useFullscreen, useToggle } from "react-use";
import { Code, Globe, Compass, ChevronLeft, ChevronRight, Music, Volume2, VolumeX } from "lucide-react";

import { buildGraphFromNomenclature } from "../utils/graph";
import EmbedModal from "./EmbedModal";
import PanoramaViewer from "./PanoramaViewer";
import TourGuideAvatar from "./TourGuideAvatar";
import { musicPlayer } from "../services/ambientMusicService";

export default function StreetViewer({
  images = [],
  initialGraph = null,
  tourMode = "interactive",
  musicConfig = null,
  onExit,
}) {
  // Global Graph State
  const [graph] = useState(() => initialGraph || (images?.nodes && images?.edges ? images : buildGraphFromNomenclature(images)));
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);

  // View Mode: "usual" (default) or "orb" (3D Sphere Orb)
  const [viewMode, setViewMode] = useState("usual");

  // Current active viewport node identifier
  const [currId, setCurrId] = useState(graph.nodes[0]?.id);
  const [copiedAiContext, setCopiedAiContext] = useState(false);

  // Camera Transform States for "usual" mode
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panoX, setPanoX] = useState(0); // Horizontal scroll offset for 360 panoramas
  const [zoom, setZoom] = useState(1);

  // For Three.js 3D Orb mode
  const panoLonRef = useRef(0);
  const [panoLon, setPanoLon] = useState(0);
  const panoResetRef = useRef(null);

  // Panorama transition overlay
  const [panoTransitioning, setPanoTransitioning] = useState(false);

  // Mouse/Touch Dragging References (stored in refs for smooth animation)
  const isDragRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });

  // UI Display Toggles
  const [isFillMode, toggleFillMode] = useToggle(false);

  // Fullscreen Management via react-use hook
  const appRef = useRef(null);
  const isFullscreen = useFullscreen(appRef, false, { video: false });

  // DOM References for the two panorama layers used to execute smooth crossfades in Usual mode
  const layerARef = useRef(null);
  const layerBRef = useRef(null);
  const curLayerRef = useRef(0); // 0 = layerA, 1 = layerB

  // Computed values
  const currentNode = graph.nodes.find((n) => n.id === currId);
  const isPano = Boolean(currentNode?.isPanorama);
  const isOrbActive = viewMode === "orb" && isPano;

  /**
   * Mount initial image into CSS layers
   */
  useEffect(() => {
    if (layerARef.current && currentNode) {
      layerARef.current.style.backgroundImage = `url("${currentNode.image}")`;
      if (currentNode.isPanorama) {
        layerARef.current.classList.add("is-panorama");
      } else {
        layerARef.current.classList.remove("is-panorama");
      }
    }
  }, [currentNode]);

  /**
   * Sync CSS fill-mode class onto the body
   */
  useEffect(() => {
    document.body.classList.toggle("fill-mode", isFillMode);
  }, [isFillMode]);

  /**
   * Update native CSS variables for Usual mode camera
   */
  const updateCam = useCallback(() => {
    if (isOrbActive) {
      document.documentElement.style.setProperty("--pan-x", "0px");
      document.documentElement.style.setProperty("--pan-y", "0px");
      document.documentElement.style.setProperty("--pano-x", "0px");
      document.documentElement.style.setProperty("--tilt-y", "0deg");
      document.documentElement.style.setProperty("--tilt-x", "0deg");
      document.documentElement.style.setProperty("--zoom", "1");
      return;
    }

    const isP = isPano;
    document.documentElement.style.setProperty(
      "--pan-x",
      `${isP ? 0 : pan.x}px`
    );
    document.documentElement.style.setProperty("--pan-y", `${pan.y}px`);
    document.documentElement.style.setProperty("--pano-x", `${panoX}px`);

    // Dynamic 3D tilts
    document.documentElement.style.setProperty(
      "--tilt-y",
      `${(isP ? 0 : pan.x / 280) * 8}deg`
    );
    document.documentElement.style.setProperty(
      "--tilt-x",
      `${-(pan.y / 180) * 6}deg`
    );
    document.documentElement.style.setProperty("--zoom", zoom);
  }, [isOrbActive, isPano, pan, panoX, zoom]);

  useEffect(() => {
    updateCam();
  }, [updateCam]);

  /**
   * Navigation: transitions viewport to target node
   */
  const goTo = useCallback(
    (id, dir = "forward", force = false) => {
      const node = graph.nodes.find((n) => n.id === id);
      if (!node) return;

      const currentLayerEl =
        curLayerRef.current === 0 ? layerARef.current : layerBRef.current;
      if (!force && id === currId && currentLayerEl?.style.backgroundImage)
        return;

      // Trigger directional audio footstep
      try {
        new Audio("/footstep.mp3").play().catch(() => {});
      } catch (_) {}

      // Reset orientation & update active node
      setPanoX(0);
      setPan({ x: 0, y: 0 });
      setZoom(1);
      setPanoLon(0);
      panoLonRef.current = 0;
      setCurrId(id);

      if (viewMode === "orb" && node.isPanorama) {
        // 3D Orb mode transition
        setPanoTransitioning(true);
        setTimeout(() => {
          panoResetRef.current?.();
          setPanoTransitioning(false);
        }, 220);
      }

      // Always maintain CSS layers for Usual mode and instant fallbacks
      const curr =
        curLayerRef.current === 0 ? layerARef.current : layerBRef.current;
      const next =
        curLayerRef.current === 0 ? layerBRef.current : layerARef.current;

      if (next && curr) {
        next.style.backgroundImage = `url("${node.image}")`;
        next.className =
          "panorama-layer layer-next" + (node.isPanorama ? " is-panorama" : "");

        next.style.opacity = "1";
        curr.style.opacity = "0";

        setTimeout(() => {
          curLayerRef.current = 1 - curLayerRef.current;
          curr.className = "panorama-layer layer-next";
          next.className =
            "panorama-layer layer-current" +
            (node.isPanorama ? " is-panorama" : "");
        }, 200);
      }
    },
    [currId, graph, viewMode]
  );

  /* ── Linear Slideshow & Auto-Advance (Wait for AI agent or 45s max) ── */
  const [isAutoPlay, setIsAutoPlay] = useState(() => {
    if (tourMode === "slideshow") return true;
    return localStorage.getItem("immersia_avatar_auto_speak") !== "false";
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(45);

  // Background Music State in Slideshow Mode
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [musicVolume] = useState(0.35);

  // Auto-play music if in slideshow mode
  useEffect(() => {
    if (tourMode === "slideshow") {
      musicPlayer.play({
        type: musicConfig?.type || "piano",
        customUrl: musicConfig?.customUrl || null,
        name: musicConfig?.name || "Peaceful Piano & Hearth",
        volume: musicVolume,
      });
    }
    return () => {
      musicPlayer.stop();
    };
  }, [tourMode, musicConfig]);

  const toggleMusicMute = () => {
    if (isMusicMuted) {
      musicPlayer.setVolume(musicVolume);
      setIsMusicMuted(false);
    } else {
      musicPlayer.setVolume(0);
      setIsMusicMuted(true);
    }
  };

  const hardTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const postSpeechTimeoutRef = useRef(null);

  // Clear all pending advance timers
  const clearAdvanceTimers = useCallback(() => {
    if (hardTimerRef.current) {
      clearTimeout(hardTimerRef.current);
      hardTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (postSpeechTimeoutRef.current) {
      clearTimeout(postSpeechTimeoutRef.current);
      postSpeechTimeoutRef.current = null;
    }
  }, []);

  // Linear Navigation: Next Slide
  const goToNextSlide = useCallback(() => {
    if (!graph.nodes || graph.nodes.length < 2) return;
    clearAdvanceTimers();
    const currIndex = graph.nodes.findIndex((n) => n.id === currId);
    const nextIndex = (currIndex + 1) % graph.nodes.length;
    const nextNode = graph.nodes[nextIndex];
    if (nextNode) {
      goTo(nextNode.id, "forward");
    }
  }, [graph.nodes, currId, clearAdvanceTimers, goTo]);

  // Linear Navigation: Previous Slide
  const goToPrevSlide = useCallback(() => {
    if (!graph.nodes || graph.nodes.length < 2) return;
    clearAdvanceTimers();
    const currIndex = graph.nodes.findIndex((n) => n.id === currId);
    const prevIndex =
      (currIndex - 1 + graph.nodes.length) % graph.nodes.length;
    const prevNode = graph.nodes[prevIndex];
    if (prevNode) {
      goTo(prevNode.id, "backward");
    }
  }, [graph.nodes, currId, clearAdvanceTimers, goTo]);

  // Auto-advance lifecycle: runs on currId change or isAutoPlay toggle
  useEffect(() => {
    clearAdvanceTimers();
    setIsSpeaking(false);
    setSecondsLeft(45);

    if (!isAutoPlay) return;

    // 1-second countdown ticker
    countdownIntervalRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    // 45-second hard limit timer
    hardTimerRef.current = setTimeout(() => {
      goToNextSlide();
    }, 45000);

    return () => {
      clearAdvanceTimers();
    };
  }, [currId, isAutoPlay, clearAdvanceTimers, goToNextSlide]);

  // Handler: companion starts speaking
  const handleNarrationStart = useCallback(() => {
    setIsSpeaking(true);
  }, []);

  // Handler: companion finishes speaking
  const handleNarrationEnd = useCallback(() => {
    setIsSpeaking(false);
    if (!isAutoPlay) return;

    // The AI agent finished speaking: gently buffer 1.8s then advance to next slide
    if (postSpeechTimeoutRef.current) clearTimeout(postSpeechTimeoutRef.current);
    postSpeechTimeoutRef.current = setTimeout(() => {
      goToNextSlide();
    }, 1800);
  }, [isAutoPlay, goToNextSlide]);

  const handleAutoPlayChange = useCallback((active) => {
    setIsAutoPlay(active);
  }, []);

  const currIndex = graph.nodes.findIndex((n) => n.id === currId);

  /* ── Usual mode drag interactions ── */
  const handleDragStart = (x, y) => {
    isDragRef.current = true;
    startRef.current = { x, y };
  };

  const handleDragMove = (x, y) => {
    if (!isDragRef.current || isOrbActive) return;
    const deltaX = x - startRef.current.x;
    const deltaY = y - startRef.current.y;
    startRef.current = { x, y };

    if (isPano) {
      setPanoX((p) => p + deltaX * 1.3);
      setPan((p) => ({
        ...p,
        y: Math.max(-80, Math.min(80, p.y + deltaY * 0.4)),
      }));
    } else {
      setPan((p) => ({
        x: Math.max(-240, Math.min(240, p.x + deltaX)),
        y: Math.max(-120, Math.min(120, p.y + deltaY)),
      }));
    }
  };

  const handleDragEnd = () => {
    isDragRef.current = false;
  };

  useEffect(() => {
    if (isOrbActive) return; // Three.js handles drag when in 3D Orb mode

    const onMouseMove = (e) => handleDragMove(e.clientX, e.clientY);
    const onTouchMove = (e) => {
      if (e.touches.length === 1)
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchend", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isOrbActive, isPano]);

  // Sync panoLon for 3D Orb arrows
  useEffect(() => {
    if (!isOrbActive) return;
    const id = setInterval(() => {
      setPanoLon(panoLonRef.current);
    }, 60);
    return () => clearInterval(id);
  }, [isOrbActive]);

  /* ── Navigation arrows positioning ── */
  const out = graph.edges.filter((e) => e.from === currId);
  const H = window.innerHeight || 800;
  const AR = 2.0;
  const W_rev = H * AR;

  const PANO_BASE_ANGLE = { forward: 0, right: 90, left: -90, backward: 180 };

  if (!images || images.length === 0) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#0b0c0e] text-white">
        No images provided.
      </div>
    );
  }

  return (
    <div
      ref={appRef}
      id="app-container"
      className="relative w-screen h-screen overflow-hidden flex flex-col"
    >
      {/* ════════════════════════════════════════
          VIEWPORT
          ════════════════════════════════════════ */}
      <main
        className={`viewport absolute inset-0 overflow-hidden bg-[#0b0c0e] [perspective:1000px] ${
          isOrbActive ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        }`}
        id="viewport"
        onMouseDown={(e) => {
          if (
            !isOrbActive &&
            !e.target.closest(".streetview-arrow") &&
            !e.target.closest(".ui-button")
          ) {
            handleDragStart(e.clientX, e.clientY);
          }
        }}
        onTouchStart={(e) => {
          if (
            !isOrbActive &&
            e.touches.length === 1 &&
            !e.target.closest(".streetview-arrow") &&
            !e.target.closest(".ui-button")
          ) {
            handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onWheel={(e) => {
          if (!isOrbActive) {
            e.preventDefault();
            setZoom((z) => Math.max(0.95, Math.min(2.4, z - e.deltaY * 0.0015)));
          }
        }}
      >
        {/* ── 3D Orb Mode: Three.js Sphere Renderer (Active when mode === 'orb' and isPanorama) ── */}
        {isOrbActive && (
          <>
            <div
              className="absolute inset-0 z-[5] bg-black pointer-events-none transition-opacity duration-200"
              style={{ opacity: panoTransitioning ? 1 : 0 }}
            />
            <PanoramaViewer
              key={`orb-${currId}`}
              imageUrl={currentNode?.image}
              onLonChange={(lon) => {
                panoLonRef.current = lon;
              }}
              onResetRef={(fn) => {
                panoResetRef.current = fn;
              }}
              className="z-[2]"
            />
          </>
        )}

        {/* ── Usual Mode: High-performance CSS Double-Buffered Cylindrical & Flat Layers ── */}
        <div
          className="scene-wrapper absolute inset-0 w-full h-full [transform-style:preserve-3d] will-change-transform"
          style={{ visibility: isOrbActive ? "hidden" : "visible" }}
        >
          <div
            ref={layerARef}
            className="panorama-layer layer-current absolute inset-0 w-full h-full bg-center bg-no-repeat z-[1] will-change-transform"
          />
          <div
            ref={layerBRef}
            className="panorama-layer layer-next absolute inset-0 w-full h-full bg-center bg-no-repeat z-[2] opacity-0 pointer-events-none will-change-transform"
          />
        </div>

        {/* Vignette effect */}
        <div className="vignette-overlay absolute inset-0 pointer-events-none z-[6]" />

        {/* ── Navigation Chevrons / Floor Arrows ── */}
        <div className="nav-arrows-container absolute inset-0 pointer-events-none z-10 [perspective:600px]">
          {!isPano && out.some((e) => e.direction === "forward") && (
            <div className="floor-target-ring" style={{ display: "block" }} />
          )}

          <div id="nav-arrows">
            {out.map((e) => {
              let screenLeftPercent = null;
              let inView = true;

              if (isPano) {
                if (isOrbActive) {
                  // 3D Orb mode angle tracking
                  const baseAngle = PANO_BASE_ANGLE[e.direction] ?? 0;
                  let relAngle =
                    (((baseAngle - panoLon) % 360) + 540) % 360 - 180;
                  inView = Math.abs(relAngle) <= 85;
                  screenLeftPercent = 50 + (relAngle / 85) * 38;
                } else {
                  // Usual mode cylindrical scroll angle tracking
                  const baseAngle =
                    e.direction === "forward"
                      ? 0
                      : e.direction === "right"
                      ? 90
                      : e.direction === "left"
                      ? -90
                      : 180;
                  const viewAngle = (panoX / W_rev) * 360;
                  let relAngle = (baseAngle + viewAngle) % 360;

                  if (relAngle > 180) relAngle -= 360;
                  if (relAngle < -180) relAngle += 360;

                  inView = Math.abs(relAngle) <= 85;
                  screenLeftPercent = 50 + (relAngle / 85) * 38;
                }

                if (out.length === 1 && !inView) {
                  inView = true;
                  screenLeftPercent = 50;
                }
              }

              if (!inView) return null;

              const style =
                isPano && screenLeftPercent !== null
                  ? {
                      left: `${screenLeftPercent.toFixed(1)}%`,
                      transform: `translateX(-50%) perspective(400px) rotateX(${
                        e.direction === "backward" ? "-45deg" : "50deg"
                      })`,
                    }
                  : {};

              const pts =
                e.direction === "backward"
                  ? "6 9 12 15 18 9"
                  : e.direction === "right"
                  ? "9 18 15 12 9 6"
                  : e.direction === "left"
                  ? "15 18 9 12 15 6"
                  : "18 15 12 9 6 15";

              return (
                <div
                  key={e.to}
                  className={`streetview-arrow arrow-${e.direction || "forward"}`}
                  style={style}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    goTo(e.to, e.direction);
                  }}
                >
                  <div className="arrow-disc">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points={pts} />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Linear Slideshow Stepper & Auto-Advance Controller ── */}
        <div
          id="slide-controller"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2.5 bg-[#121622]/92 backdrop-blur-xl border border-white/12 px-4 py-2 rounded-full shadow-2xl text-xs select-none"
        >
          {/* Previous Slide */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevSlide();
            }}
            className="p-1 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Previous Room / Slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Room Progress & Name */}
          <div className="flex items-center gap-2 px-1">
            <span className="font-bold text-white tracking-wide">
              Room {currIndex + 1} of {graph.nodes.length}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-300 max-w-[200px] truncate font-medium">
              {currentNode?.customLabel || currentNode?.id}
            </span>
          </div>

          {/* 360 Badge */}
          {isPano && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] border border-rose-500/30">
              360°
            </span>
          )}

          {/* Auto-Advance Status & 45s Countdown Pill */}
          {isAutoPlay ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-[11px] font-mono font-semibold text-emerald-300 border border-emerald-500/30 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isSpeaking ? "Speaking..." : `${secondsLeft}s`}</span>
            </div>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-gray-400 border border-white/10 font-medium">
              Auto-Play Paused
            </span>
          )}

          {/* Next Slide */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNextSlide();
            }}
            className="p-1 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Next Room / Slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Subtle Station Title Indicator (Clean, no context text) */}
        {currentNode?.customLabel && (
          <div
            key={`title-${currId}`}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          >
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-4 py-1 text-center shadow-lg">
              <span className="text-xs font-medium text-gray-200">
                {currentNode.customLabel}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* ── Mini Human Tour Guide Avatar with 11Labs Speech ── */}
      <TourGuideAvatar
        currentNode={currentNode}
        outEdges={out}
        onNarrationStart={handleNarrationStart}
        onNarrationEnd={handleNarrationEnd}
        onAutoPlayChange={handleAutoPlayChange}
      />

      {/* ════════════════════════════════════════
          HUD BUTTONS & CONTROLS
          ════════════════════════════════════════ */}

      {/* Top-Left: Back */}
      {onExit && (
        <div className="absolute top-4 left-4 z-20 pointer-events-auto ui-button">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#121622]/92 backdrop-blur-xl text-gray-200 hover:text-white cursor-pointer transition-all hover:bg-[#1a2030] border border-white/12 shadow-xl text-xs font-semibold"
            title="Back to Blueprint Editor"
          >
            <ChevronLeft className="w-4 h-4 text-[#8ab4f8]" />
            <span>Back</span>
          </button>
        </div>
      )}

      {/* Top-Right: Music Controller (in Slideshow mode) + Mode Selector + Actions */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto flex items-center gap-2.5 ui-button">
        {/* Slideshow Ambient Music Player */}
        {tourMode === "slideshow" && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121622]/92 backdrop-blur-xl border border-white/12 shadow-lg text-xs">
            <Music className={`w-3.5 h-3.5 ${isMusicMuted ? "text-gray-500" : "text-rose-400 animate-pulse"}`} />
            <span className="text-gray-200 font-medium max-w-[150px] truncate text-[11px]">
              {musicConfig?.name || "Peaceful Piano"}
            </span>
            <button
              onClick={toggleMusicMute}
              className="p-1 rounded-full text-gray-300 hover:text-white transition-colors cursor-pointer hover:bg-white/10"
              title={isMusicMuted ? "Unmute Music" : "Mute Music"}
            >
              {isMusicMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </button>
          </div>
        )}

        {/* ── 2 MODES TOGGLE: Usual (Default) vs 3D Orb ── */}
        <div className="flex bg-[#12141a]/90 backdrop-blur-md p-1 rounded-full border border-white/12 shadow-lg">
          <button
            onClick={() => setViewMode("usual")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "usual"
                ? "bg-[#1a73e8] text-white shadow-md"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
            title="Usual Street-View Mode (Default 2D Cylindrical/Perspective)"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Usual</span>
            {viewMode === "usual" && (
              <span className="text-[9px] opacity-75 font-normal tracking-wide">
                (Default)
              </span>
            )}
          </button>

          <button
            onClick={() => setViewMode("orb")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "orb"
                ? "bg-gradient-to-r from-[#1a73e8] to-[#8ab4f8] text-white shadow-md"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
            title="3D Orb Mode (Three.js 3D Sphere Renderer)"
          >
            <Globe className="w-3.5 h-3.5 text-blue-300" />
            <span>3D Orb</span>
          </button>
        </div>

        {/* Embed / Export Modal */}
        <button
          onClick={() => setIsEmbedModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#20232a]/90 backdrop-blur-md text-[#f1f3f4] text-xs font-semibold cursor-pointer transition-all hover:bg-[#2d323c] hover:border-[#1a73e8]/60 border border-white/10 shadow-lg"
          title="Embed as iframe on another website"
        >
          <Code className="w-4 h-4 text-[#8ab4f8]" />
          <span>Embed / Export</span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={() =>
            !document.fullscreenElement
              ? document.documentElement.requestFullscreen()
              : document.exitFullscreen()
          }
          className="p-2.5 rounded-full bg-[#20232a]/90 backdrop-blur-md text-[#f1f3f4] cursor-pointer transition-colors hover:bg-[#2d323c] border border-white/10"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? (
            <img
              src="/icons/minimize.svg"
              alt="Minimize"
              className="w-4 h-4 pointer-events-none"
            />
          ) : (
            <img
              src="/icons/maximize.svg"
              alt="Maximize"
              className="w-4 h-4 pointer-events-none"
            />
          )}
        </button>
      </div>

      {/* Bottom-Right: View Controls */}
      <div className="view-controls absolute bottom-6 right-4 flex flex-col gap-2 z-20 pointer-events-auto ui-button">
        <div className="view-btn-group bg-[#20232a]/90 backdrop-blur-md rounded-lg flex flex-col overflow-hidden divide-y divide-white/10 border border-white/10 shadow-xl">
          {/* Fit / Fill toggle (Usual mode) */}
          {!isOrbActive && (
            <button
              onClick={toggleFillMode}
              className={`w-10 h-10 flex items-center justify-center transition-colors hover:bg-white/15 hover:text-white active:bg-[#1a73e8] ${
                isFillMode ? "text-[#8ab4f8]" : "text-[#f1f3f4]"
              }`}
              title="Toggle Fit / Fill Screen"
            >
              {isFillMode ? (
                <img
                  src="/icons/shrink-blue.svg"
                  alt="Shrink"
                  className="w-4 h-4 pointer-events-none"
                />
              ) : (
                <img
                  src="/icons/expand.svg"
                  alt="Expand"
                  className="w-4 h-4 pointer-events-none"
                />
              )}
            </button>
          )}

          {/* Zoom In */}
          <button
            onClick={() => {
              if (isOrbActive) {
                window.dispatchEvent(
                  new CustomEvent("pano-zoom", { detail: -8 })
                );
              } else {
                setZoom((z) => Math.min(2.4, z + 0.2));
              }
            }}
            className="w-10 h-10 flex items-center justify-center text-[#f1f3f4] transition-colors hover:bg-white/15 hover:text-white active:bg-[#1a73e8]"
            title="Zoom In (+)"
          >
            <img
              src="/icons/zoom-in.svg"
              alt="Zoom In"
              className="w-5 h-5 pointer-events-none"
            />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => {
              if (isOrbActive) {
                window.dispatchEvent(
                  new CustomEvent("pano-zoom", { detail: +8 })
                );
              } else {
                setZoom((z) => Math.max(0.95, z - 0.2));
              }
            }}
            className="w-10 h-10 flex items-center justify-center text-[#f1f3f4] transition-colors hover:bg-white/15 hover:text-white active:bg-[#1a73e8]"
            title="Zoom Out (-)"
          >
            <img
              src="/icons/zoom-out.svg"
              alt="Zoom Out"
              className="w-5 h-5 pointer-events-none"
            />
          </button>

          {/* Reset View */}
          <button
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setPanoX(0);
              setZoom(1);
              if (isOrbActive) {
                panoResetRef.current?.();
                window.dispatchEvent(new CustomEvent("pano-reset"));
              }
            }}
            className="w-10 h-10 flex items-center justify-center text-[#f1f3f4] transition-colors hover:bg-white/15 hover:text-white active:bg-[#1a73e8]"
            title="Reset View"
          >
            <img
              src="/icons/target.svg"
              alt="Reset View"
              className="w-4 h-4 pointer-events-none"
            />
          </button>
        </div>
      </div>

      {/* Embed Modal */}
      <EmbedModal
        isOpen={isEmbedModalOpen}
        onClose={() => setIsEmbedModalOpen(false)}
        graph={graph}
        images={images}
      />
    </div>
  );
}
