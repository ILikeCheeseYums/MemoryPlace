import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Play,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Layers,
  HelpCircle,
  Eye,
  CheckCircle2,
  Move,
  X,
  Compass,
  Heart,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { parseItem } from "../utils/graph";

/**
 * Direction definitions with Unreal Engine styling
 */
const PIN_TYPES = {
  forward: {
    id: "forward",
    label: "Forward",
    icon: ArrowUp,
    color: "#38bdf8", // Sky blue
    glow: "rgba(56, 189, 248, 0.4)",
    badgeBg: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  },
  right: {
    id: "right",
    label: "Turn Right",
    icon: ArrowRight,
    color: "#fbbf24", // Amber
    glow: "rgba(251, 191, 36, 0.4)",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  left: {
    id: "left",
    label: "Turn Left",
    icon: ArrowLeft,
    color: "#c084fc", // Purple
    glow: "rgba(192, 132, 252, 0.4)",
    badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  },
  backward: {
    id: "backward",
    label: "Backward",
    icon: ArrowDown,
    color: "#94a3b8", // Slate
    glow: "rgba(148, 163, 184, 0.4)",
    badgeBg: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  },
};

/**
 * Computes an Unreal-style horizontal cubic bezier curve
 */
function getBezierPath(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1);
  const curvature = Math.max(dx * 0.55, 60);
  return `M ${x1} ${y1} C ${x1 + curvature} ${y1}, ${x2 - curvature} ${y2}, ${x2} ${y2}`;
}

export default function BlueprintGraphEditor({
  initialImages = [],
  onLaunch,
  onBack,
}) {
  /* ── Nodes State ── */
  const [nodes, setNodes] = useState(() => {
    return initialImages.map((img, i) => {
      // Default initial layout: arrange in readable steps
      const col = i % 4;
      const row = Math.floor(i / 4);
      return {
        id: img.id || `node_${i + 1}`,
        step: img.step || i + 1,
        branch: img.branch || "A",
        turn: img.turn || "F",
        customLabel: img.customLabel || img.id || `Station ${i + 1}`,
        context: img.context || "",
        image: img.image,
        file: img.file,
        isPanorama: Boolean(img.isPanorama),
        x: 120 + col * 380,
        y: 120 + row * 460,
        isExpanded: false,
      };
    });
  });

  /* ── Edges / Wires State ──
     Each wire: { id, from, to, direction: 'forward'|'right'|'left'|'backward' }
  ── */
  const [edges, setEdges] = useState(() => {
    const list = [];
    // Auto-generate initial logical two-way wiring based on provided images
    for (let i = 0; i < initialImages.length - 1; i++) {
      const curr = initialImages[i];
      const next = initialImages[i + 1];
      const fromId = curr.id || `node_${i + 1}`;
      const toId = next.id || `node_${i + 2}`;
      const dir =
        next.turn === "R"
          ? "right"
          : next.turn === "L"
          ? "left"
          : "forward";
      list.push({
        id: `wire_${fromId}_${toId}_${dir}`,
        from: fromId,
        to: toId,
        direction: dir,
      });
      // Backward return path wire
      list.push({
        id: `wire_${toId}_${fromId}_backward`,
        from: toId,
        to: fromId,
        direction: "backward",
      });
    }
    return list;
  });

  /* ── Canvas Pan & Zoom ── */
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [zoom, setZoom] = useState(0.9);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  /* ── Node Dragging ── */
  const draggingNodeRef = useRef(null);
  const nodeDragStartRef = useRef({ mouseX: 0, mouseY: 0, nodeX: 0, nodeY: 0 });

  /* ── Wire Dragging (Live Drafting) ── */
  const [draftWire, setDraftWire] = useState(null);
  // draftWire: { fromNodeId, direction, startX, startY, currentX, currentY }

  /* ── Selection ── */
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  /* ── Container Ref ── */
  const containerRef = useRef(null);

  /* ── Dropzone for adding more images directly into the graph ── */
  const onDropMore = useCallback((acceptedFiles) => {
    if (!acceptedFiles.length) return;
    const newItems = acceptedFiles.map((file, idx) => {
      const url = URL.createObjectURL(file);
      const parsed = parseItem(file.name);
      parsed.image = url;
      parsed.file = file;
      return {
        id: parsed.id || `node_${Date.now()}_${idx}`,
        step: parsed.step || 1,
        branch: parsed.branch || "A",
        turn: parsed.turn || "F",
        customLabel: parsed.id || file.name,
        context: "",
        image: url,
        file: file,
        isPanorama: Boolean(parsed.isPanorama),
        x: 200 + Math.random() * 200,
        y: 200 + Math.random() * 200,
        isExpanded: false,
      };
    });
    setNodes((prev) => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropMore,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    noClick: true,
  });

  /* ── Canvas coordinate helpers ── */
  const screenToCanvas = useCallback(
    (screenX, screenY) => {
      const rect = containerRef.current?.getBoundingClientRect() || {
        left: 0,
        top: 0,
      };
      return {
        x: (screenX - rect.left - pan.x) / zoom,
        y: (screenY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  /* ── Auto Layout (Branch-Aware with Linear Default) ── */
  const handleAutoLayout = useCallback(() => {
    setNodes((prevNodes) => {
      if (!prevNodes.length) return prevNodes;

      // Group nodes by branch
      const branchNodes = {};
      prevNodes.forEach((n) => {
        const b = n.branch || "A";
        branchNodes[b] = branchNodes[b] || [];
        branchNodes[b].push(n);
      });

      const branchKeys = Object.keys(branchNodes).sort((a, b) =>
        a === "A" ? -1 : b === "A" ? 1 : a.localeCompare(b)
      );

      const hasBranches = branchKeys.length > 1;

      // If only 1 branch exists (dormant branching), keep clean single row
      if (!hasBranches) {
        return prevNodes.map((item, idx) => ({
          ...item,
          step: idx + 1,
          branch: item.branch || "A",
          turn: item.turn || "F",
          x: 100 + idx * 380,
          y: 180,
        }));
      }

      // If multiple branches exist, arrange branches into separate lanes/rows
      const updatedNodes = [...prevNodes];
      branchKeys.forEach((bk, rowIdx) => {
        const list = branchNodes[bk];
        list.sort((a, b) => (a.step || 0) - (b.step || 0));

        list.forEach((item, colIdx) => {
          const targetIndex = updatedNodes.findIndex((n) => n.id === item.id);
          if (targetIndex !== -1) {
            updatedNodes[targetIndex] = {
              ...updatedNodes[targetIndex],
              x: 100 + colIdx * 380,
              y: 140 + rowIdx * 480,
            };
          }
        });
      });

      return updatedNodes;
    });
  }, []);

  /* ── Auto-Wire Sequential (Branch-Aware with Return Paths) ── */
  const handleAutoWireSequential = useCallback(() => {
    if (nodes.length < 2) return;
    const newEdges = [];
    const edgeSet = new Set();

    const addWire = (from, to, dir) => {
      const key = `${from}->${to}`;
      if (!edgeSet.has(key)) {
        newEdges.push({
          id: `wire_${from}_${to}_${dir}`,
          from,
          to,
          direction: dir,
        });
        edgeSet.add(key);
      }
    };

    // Group by branch
    const branchMap = {};
    nodes.forEach((n) => {
      const b = n.branch || "A";
      branchMap[b] = branchMap[b] || [];
      branchMap[b].push(n);
    });

    const branchKeys = Object.keys(branchMap).sort((a, b) =>
      a === "A" ? -1 : b === "A" ? 1 : a.localeCompare(b)
    );

    // 1. Sequential connections within each branch
    branchKeys.forEach((bk) => {
      const list = branchMap[bk];
      list.sort((a, b) => (a.step || 0) - (b.step || 0));
      for (let i = 0; i < list.length - 1; i++) {
        const a = list[i];
        const b = list[i + 1];
        const dir = b.turn === "R" ? "right" : b.turn === "L" ? "left" : "forward";
        addWire(a.id, b.id, dir);
        addWire(b.id, a.id, "backward");
      }
    });

    // 2. Branch split connections (Main Trunk A -> Sub-branch Start)
    if (branchKeys.length > 1) {
      const mainTrunk = branchMap["A"] || branchMap[branchKeys[0]] || [];
      branchKeys.filter((k) => k !== "A").forEach((bk) => {
        const list = branchMap[bk];
        const first = list[0];
        if (!first) return;

        const parent =
          mainTrunk.find((m) => m.step === (first.step || 1) - 1) ||
          mainTrunk.find((m) => m.step === first.step) ||
          mainTrunk[mainTrunk.length - 1];

        if (parent) {
          const dir = first.turn === "R" ? "right" : first.turn === "L" ? "left" : "right";
          addWire(parent.id, first.id, dir);
          addWire(first.id, parent.id, "backward");
        }
      });
    }

    setEdges(newEdges);
  }, [nodes]);

  /* ── Update Branch on Node ── */
  const handleUpdateBranch = useCallback((nodeId, branch) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, branch } : n))
    );
  }, []);

  /* ── Delete Node ── */
  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId));
  }, []);

  /* ── Delete Wire ── */
  const handleDeleteEdge = useCallback((edgeId) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    setSelectedEdgeId(null);
  }, []);

  /* ── Toggle Panorama on Node ── */
  const handleTogglePanorama = useCallback((nodeId) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, isPanorama: !n.isPanorama } : n
      )
    );
  }, []);

  /* ── Update Node Text ── */
  const handleUpdateLabel = useCallback((nodeId, label) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, customLabel: label } : n))
    );
  }, []);

  const handleUpdateContext = useCallback((nodeId, context) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, context } : n))
    );
  }, []);

  /* ── Start Dragging Node ── */
  const handleNodeMouseDown = (e, nodeId) => {
    // Only drag on left click and not inside inputs/buttons
    if (e.button !== 0) return;
    if (
      e.target.closest("input") ||
      e.target.closest("textarea") ||
      e.target.closest("button") ||
      e.target.closest(".pin-socket")
    ) {
      return;
    }
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setSelectedNodeId(nodeId);
    draggingNodeRef.current = nodeId;
    nodeDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };
  };

  /* ── Start Dragging a Wire Pin ── */
  const handlePinMouseDown = (e, fromNodeId, direction) => {
    e.stopPropagation();
    const fromNode = nodes.find((n) => n.id === fromNodeId);
    if (!fromNode) return;

    // Pin offset on node (right side)
    const pinX = fromNode.x + 310;
    // Calculate vertical offset according to direction pin index
    const pinOffsetMap = {
      forward: 68,
      right: 104,
      left: 140,
      backward: 176,
    };
    const pinY = fromNode.y + (pinOffsetMap[direction] || 70);

    const pos = screenToCanvas(e.clientX, e.clientY);

    setDraftWire({
      fromNodeId,
      direction,
      startX: pinX,
      startY: pinY,
      currentX: pos.x,
      currentY: pos.y,
    });
  };

  /* ── Connect to Target Node's In Pin ── */
  const handleConnectTarget = (toNodeId) => {
    if (!draftWire) return;
    if (draftWire.fromNodeId === toNodeId) {
      setDraftWire(null);
      return;
    }

    // Add new wire connection
    const newEdge = {
      id: `wire_${draftWire.fromNodeId}_${toNodeId}_${draftWire.direction}_${Date.now()}`,
      from: draftWire.fromNodeId,
      to: toNodeId,
      direction: draftWire.direction,
    };

    setEdges((prev) => {
      // Replace existing edge with same from & direction if exists, or append
      const filtered = prev.filter(
        (e) =>
          !(e.from === draftWire.fromNodeId && e.direction === draftWire.direction)
      );
      return [...filtered, newEdge];
    });

    setDraftWire(null);
  };

  /* ── Global Mouse Handlers for Pan, Node Drag, and Wire Drafting ── */
  useEffect(() => {
    const handleMouseMove = (e) => {
      // 1. Panning canvas
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        panStartRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // 2. Dragging node
      if (draggingNodeRef.current) {
        const dx = (e.clientX - nodeDragStartRef.current.mouseX) / zoom;
        const dy = (e.clientY - nodeDragStartRef.current.mouseY) / zoom;
        const targetId = draggingNodeRef.current;

        setNodes((prev) =>
          prev.map((n) =>
            n.id === targetId
              ? {
                  ...n,
                  x: Math.round(nodeDragStartRef.current.nodeX + dx),
                  y: Math.round(nodeDragStartRef.current.nodeY + dy),
                }
              : n
          )
        );
        return;
      }

      // 3. Drafting wire
      if (draftWire) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setDraftWire((prev) => (prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null));
      }
    };

    const handleMouseUp = () => {
      isPanningRef.current = false;
      draggingNodeRef.current = null;
      if (draftWire) {
        setDraftWire(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draftWire, screenToCanvas, zoom]);

  /* ── Canvas Wheel Zoom ── */
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.max(0.4, Math.min(1.8, z * zoomFactor)));
  };

  /* ── Keyboard Shortcuts (Delete wire, etc.) ── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedEdgeId && !e.target.closest("input") && !e.target.closest("textarea")) {
          handleDeleteEdge(selectedEdgeId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEdgeId, handleDeleteEdge]);

  /* ── Compile Blueprint Graph into StreetViewer Graph ── */
  const handleCompileAndLaunch = () => {
    if (!nodes.length) return;

    // 1. Build nodes list
    const compiledNodes = nodes.map((n, idx) => ({
      id: n.id,
      number: n.step || idx + 1,
      branch: n.branch || "A",
      turn: n.turn || "F",
      image: n.image,
      file: n.file,
      customLabel: n.customLabel,
      context: n.context,
      isPanorama: n.isPanorama,
      mapX: Math.round(Math.max(10, Math.min(90, (n.x / 1200) * 80 + 10))),
      mapY: Math.round(Math.max(10, Math.min(90, (n.y / 1000) * 80 + 10))),
    }));

    // 2. Build directional and return navigation edges
    const compiledEdges = [];
    const edgeSet = new Set();

    edges.forEach((e) => {
      // Forward direction edge
      const key1 = `${e.from}->${e.to}`;
      if (!edgeSet.has(key1)) {
        compiledEdges.push({
          from: e.from,
          to: e.to,
          direction: e.direction || "forward",
        });
        edgeSet.add(key1);
      }

      // Automatic return edge (Walk backward to return)
      const key2 = `${e.to}->${e.from}`;
      if (!edgeSet.has(key2)) {
        compiledEdges.push({
          from: e.to,
          to: e.from,
          direction: "backward",
        });
        edgeSet.add(key2);
      }
    });

    const compiledGraph = {
      nodes: compiledNodes,
      edges: compiledEdges,
    };

    onLaunch(compiledNodes, compiledGraph);
  };

  /* ── Pre-calculate Pin Coordinates for SVG Wires ── */
  const nodeLookup = useMemo(() => {
    const map = {};
    nodes.forEach((n) => {
      map[n.id] = n;
    });
    return map;
  }, [nodes]);

  const pinOffsetMap = {
    forward: 68,
    right: 104,
    left: 140,
    backward: 176,
  };

  return (
    <div
      {...getRootProps()}
      className="relative w-screen h-screen bg-[#0b0e14] text-white flex flex-col overflow-hidden select-none"
    >
      <input {...getInputProps()} />

      {/* ════════════════════════════════════════
          TOP UNREAL BLUEPRINT TOOLBAR
          ════════════════════════════════════════ */}
      <header className="z-30 h-14 bg-[#12161f]/95 backdrop-blur-md border-b border-white/10 px-5 flex items-center justify-between shadow-2xl">
        {/* Left: Branding & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-200 hover:text-white border border-white/10 transition-colors text-xs font-semibold cursor-pointer"
            title="Return to Home Landing Page"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#1a73e8] to-[#60a5fa] flex items-center justify-center shadow-md">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
                <span className="text-[#8ab4f8]">TourGraph</span>
                <span className="text-gray-500">/</span>
                <span className="text-white">Spatial Blueprint Scripting</span>
                <span className="px-1.5 py-0.2 text-[9px] bg-[#1a73e8]/20 text-[#8ab4f8] rounded font-bold uppercase tracking-wider">
                  Unreal Flow
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                {nodes.length} Stations · {edges.length} Directional Wires
              </p>
            </div>
          </div>
        </div>

        {/* Center: Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Auto Arrange */}
          <button
            onClick={handleAutoLayout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all shadow-sm"
            title="Auto align nodes in logical sequence"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto Layout</span>
          </button>

          {/* Auto Wire Sequential */}
          <button
            onClick={handleAutoWireSequential}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all shadow-sm"
            title="Connect stations sequentially forward"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Auto Wire</span>
          </button>

          {/* Clear Wires */}
          <button
            onClick={() => setEdges([])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 border border-white/10 text-xs font-medium text-gray-400 hover:text-red-300 transition-all shadow-sm"
            title="Clear all wire connections"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-400" />
            <span>Clear Wires</span>
          </button>
        </div>

        {/* Right: Compile & Launch */}
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center bg-[#0d1017] rounded-lg border border-white/10 p-0.5 text-xs text-gray-400">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="p-1 hover:text-white hover:bg-white/10 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono font-medium text-gray-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
              className="p-1 hover:text-white hover:bg-white/10 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(0.9);
                setPan({ x: 40, y: 30 });
              }}
              className="p-1 hover:text-white hover:bg-white/10 rounded border-l border-white/10 ml-0.5"
              title="Reset View 100%"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Compile & Launch Button */}
          <button
            onClick={handleCompileAndLaunch}
            disabled={!nodes.length}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-[#1a73e8] to-[#2563eb] hover:from-[#1557b0] hover:to-[#1d4ed8] text-white font-bold text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer border border-blue-400/30"
            title="Compile Blueprint Graph and Launch 3D Viewer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Compile &amp; Launch</span>
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════
          BLUEPRINT INFINITE GRAPH CANVAS
          ════════════════════════════════════════ */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={(e) => {
          // Pan canvas if clicking directly on background
          if (
            e.target === containerRef.current ||
            e.target.tagName === "svg" ||
            e.target.id === "blueprint-canvas-bg"
          ) {
            isPanningRef.current = true;
            panStartRef.current = { x: e.clientX, y: e.clientY };
            setSelectedEdgeId(null);
            setSelectedNodeId(null);
          }
        }}
        className="relative flex-1 w-full h-full overflow-hidden cursor-crosshair bg-[#0d1017]"
        style={{
          // Dual Blueprint Grid Pattern
          backgroundImage: `
            radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px, 120px 120px, 120px 120px",
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Drag-over overlay */}
        {isDragActive && (
          <div className="absolute inset-0 z-50 bg-[#1a73e8]/25 backdrop-blur-sm border-4 border-dashed border-[#1a73e8] flex items-center justify-center">
            <div className="bg-[#141822] p-6 rounded-2xl border border-white/20 text-center shadow-2xl">
              <Plus className="w-10 h-10 text-[#8ab4f8] mx-auto mb-2 animate-bounce" />
              <h3 className="text-xl font-bold text-white">Drop images to spawn stations</h3>
            </div>
          </div>
        )}

        {/* ── Transformed World Layer (Nodes & Wires) ── */}
        <div
          id="blueprint-canvas-bg"
          className="absolute inset-0 w-full h-full transform-origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* ════════════════════════════════════════
              SVG CONNECTION WIRES LAYER
              ════════════════════════════════════════ */}
          <svg
            className="absolute inset-0 overflow-visible pointer-events-none"
            style={{ width: "100%", height: "100%" }}
          >
            <defs>
              <filter id="wire-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Existing Wires */}
            {edges.map((edge) => {
              const fromNode = nodeLookup[edge.from];
              const toNode = nodeLookup[edge.to];
              if (!fromNode || !toNode) return null;

              const x1 = fromNode.x + 310;
              const y1 = fromNode.y + (pinOffsetMap[edge.direction] || 68);
              const x2 = toNode.x;
              const y2 = toNode.y + 36; // Target In pin position

              const path = getBezierPath(x1, y1, x2, y2);
              const dirInfo = PIN_TYPES[edge.direction] || PIN_TYPES.forward;
              const isSelected = selectedEdgeId === edge.id;

              // Midpoint for direction badge
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              return (
                <g key={edge.id} className="cursor-pointer pointer-events-auto">
                  {/* Outer glow stroke */}
                  <path
                    d={path}
                    fill="none"
                    stroke={isSelected ? "#ffffff" : dirInfo.color}
                    strokeWidth={isSelected ? 6 : 4}
                    strokeOpacity={isSelected ? 0.9 : 0.8}
                    filter="url(#wire-glow)"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdgeId(edge.id);
                    }}
                  />

                  {/* Inner crisp line */}
                  <path
                    d={path}
                    fill="none"
                    stroke={isSelected ? "#fff" : dirInfo.color}
                    strokeWidth={isSelected ? 3 : 2}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdgeId(edge.id);
                    }}
                  />

                  {/* Mid-wire Direction Pill with quick disconnect ✕ */}
                  <foreignObject
                    x={midX - 44}
                    y={midY - 12}
                    width={88}
                    height={26}
                    className="overflow-visible"
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEdgeId(edge.id);
                      }}
                      className={`flex items-center justify-between px-2 py-0.5 rounded-full border text-[10px] font-bold backdrop-blur-md shadow-lg transition-transform hover:scale-105 ${
                        isSelected
                          ? "bg-white text-black border-white shadow-white/30"
                          : `${dirInfo.badgeBg} bg-[#121620]/90`
                      }`}
                    >
                      <span className="truncate">{dirInfo.label}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEdge(edge.id);
                        }}
                        className="ml-1 text-gray-400 hover:text-red-400 transition-colors p-0.5"
                        title="Disconnect Wire"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </foreignObject>
                </g>
              );
            })}

            {/* Live Drafting Wire (when dragging from a pin) */}
            {draftWire && (
              <g className="pointer-events-none">
                <path
                  d={getBezierPath(
                    draftWire.startX,
                    draftWire.startY,
                    draftWire.currentX,
                    draftWire.currentY
                  )}
                  fill="none"
                  stroke={PIN_TYPES[draftWire.direction]?.color || "#38bdf8"}
                  strokeWidth={4}
                  strokeDasharray="6 4"
                  strokeOpacity={0.9}
                  filter="url(#wire-glow)"
                />
              </g>
            )}
          </svg>

          {/* ════════════════════════════════════════
              UNREAL BLUEPRINT NODES LAYER
              ════════════════════════════════════════ */}
          {nodes.map((node, index) => {
            const isStart = index === 0;
            const isSelected = selectedNodeId === node.id;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                className={`absolute w-[310px] rounded-xl overflow-hidden border shadow-2xl transition-shadow select-none group/node ${
                  isSelected
                    ? "border-amber-400 shadow-[0_0_0_2px_#fbbf24,0_16px_36px_rgba(0,0,0,0.8)] z-20"
                    : "border-white/10 hover:border-white/25 shadow-[0_12px_28px_rgba(0,0,0,0.6)] z-10"
                } bg-[#161a23]`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                }}
              >
                {/* ── Left Sockets: Target / In Pin ── */}
                <div
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    handleConnectTarget(node.id);
                  }}
                  className="pin-socket absolute -left-3 top-[26px] z-30 flex items-center gap-1 cursor-pointer group/in"
                  title="Target Pin (Connect incoming navigation here)"
                >
                  <div className="w-6 h-6 rounded-full bg-[#161a23] border-2 border-white/60 flex items-center justify-center group-hover/in:scale-125 group-hover/in:border-white group-hover/in:bg-white/20 transition-all shadow-md">
                    <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                  </div>
                </div>

                {/* ── Node Header Bar ── */}
                <div
                  className={`px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between ${
                    isStart
                      ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-[#1e2433]"
                      : node.isPanorama
                      ? "bg-gradient-to-r from-emerald-600 via-teal-700 to-[#1e2433]"
                      : "bg-gradient-to-r from-slate-700 via-slate-800 to-[#1e2433]"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-5 h-5 rounded-md bg-black/40 text-[10px] font-mono font-bold flex items-center justify-center text-white shrink-0">
                      {index + 1}
                    </span>
                    {/* Branch Tag (Click to cycle branch A -> B -> C -> A) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextBranch = node.branch === "A" ? "B" : node.branch === "B" ? "C" : "A";
                        handleUpdateBranch(node.id, nextBranch);
                      }}
                      className="px-1.5 py-0.5 rounded bg-black/40 hover:bg-black/70 text-[9px] font-mono text-gray-300 hover:text-white font-bold border border-white/10 cursor-pointer transition-colors shrink-0"
                      title={`Branch ${node.branch || "A"} (Click to change branch)`}
                    >
                      {node.branch || "A"}
                    </button>
                    <input
                      type="text"
                      value={node.customLabel}
                      onChange={(e) => handleUpdateLabel(node.id, e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="bg-transparent text-xs font-bold text-white focus:outline-none focus:bg-black/30 rounded px-1 truncate w-36"
                      placeholder="Station Name..."
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Panorama Tag */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePanorama(node.id);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                        node.isPanorama
                          ? "bg-emerald-400 text-black shadow-sm"
                          : "bg-white/10 text-gray-300 hover:bg-white/20"
                      }`}
                      title={node.isPanorama ? "Toggle Flat Mode" : "Toggle 360° Panorama"}
                    >
                      360°
                    </button>

                    {/* Delete Node */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete Station"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* ── Node Body (Thumbnail + Context + Output Pins) ── */}
                <div className="p-3 space-y-3">
                  {/* Thumbnail & Quick Preview */}
                  <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-black/50 border border-white/5">
                    <img
                      src={node.image}
                      alt={node.customLabel}
                      className="w-full h-full object-cover pointer-events-none"
                    />

                    {/* Expand Preview Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(node.image);
                      }}
                      className="absolute bottom-1.5 right-1.5 p-1 rounded bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
                      title="Preview Image"
                    >
                      <Eye className="w-3 h-3" />
                    </button>

                    {isStart && (
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-blue-500/90 text-white text-[9px] font-bold uppercase tracking-wider shadow">
                        Start Station
                      </div>
                    )}
                  </div>

                  {/* ── Output Pins: Directional Navigation Sockets ── */}
                  <div className="bg-[#10131a] rounded-lg p-2 border border-white/5 space-y-1.5">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                      Nav Outputs (Drag to Connect)
                    </div>

                    {Object.values(PIN_TYPES).map((pin) => {
                      const Icon = pin.icon;
                      const hasConnection = edges.some(
                        (e) => e.from === node.id && e.direction === pin.id
                      );

                      return (
                        <div
                          key={pin.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-white/5 transition-colors group/pin"
                        >
                          <div className="flex items-center gap-1.5 text-gray-300">
                            <Icon
                              className="w-3 h-3"
                              style={{ color: pin.color }}
                            />
                            <span className="text-[11px] font-medium">{pin.label}</span>
                          </div>

                          {/* Output Socket Connector */}
                          <div
                            onMouseDown={(e) => handlePinMouseDown(e, node.id, pin.id)}
                            className="pin-socket flex items-center justify-center p-1 cursor-crosshair group-hover/pin:scale-125 transition-transform"
                            title={`Drag wire to connect ${pin.label}`}
                          >
                            <div
                              className="w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-md transition-all"
                              style={{
                                borderColor: pin.color,
                                backgroundColor: hasConnection ? pin.color : "transparent",
                              }}
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                  backgroundColor: hasConnection ? "#fff" : pin.color,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cherished Memories & Familiar Details (Spoken by loved one) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-rose-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                        Cherished Memories &amp; Details
                      </span>
                      <span className="text-[9px] text-gray-400 font-normal">Spoken by loved one</span>
                    </label>
                    <textarea
                      value={node.context}
                      onChange={(e) => handleUpdateContext(node.id, e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      rows={2}
                      placeholder="e.g. Mom's favorite reading chair by the sunny window. Remind her of her morning tea and her dog Barney."
                      className="w-full bg-[#0d1017] border border-white/10 rounded-lg p-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-rose-400 resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ════════════════════════════════════════
            BOTTOM-LEFT HELPER HUD
            ════════════════════════════════════════ */}
        <div className="absolute bottom-4 left-4 z-20 pointer-events-auto bg-[#12161f]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl max-w-sm text-xs text-gray-300 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-white text-xs">
            <Compass className="w-4 h-4 text-[#8ab4f8]" />
            <span>Unreal Blueprint Navigation Guide</span>
          </div>
          <ul className="text-[11px] text-gray-400 space-y-1 list-disc list-inside">
            <li>
              <strong className="text-gray-200">Connect:</strong> Drag from right-side pins (●) onto any station's left (● Target) pin.
            </li>
            <li>
              <strong className="text-gray-200">Move:</strong> Click and drag station headers to position anywhere.
            </li>
            <li>
              <strong className="text-gray-200">Pan &amp; Zoom:</strong> Drag empty background to pan, scroll wheel to zoom.
            </li>
            <li>
              <strong className="text-gray-200">Disconnect:</strong> Click the ✕ on any connection wire pill.
            </li>
          </ul>
        </div>
      </div>

      {/* ── Image Lightbox Preview Modal ── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
            <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

