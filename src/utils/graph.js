 /* 
 * @param {string|Object} item - The filename string or an object containing image details.
 * @returns {Object} An object containing the extracted properties: id, step, branch, turn, and image URL.
 */
export function parseItem(item) {
  const nameStr = typeof item === "string" ? item : (item.name || item.id || "");
  const imgUrl = typeof item === "string" ? item : (item.image || item.url || item.src || "");
  
  // Extract just the base filename without extension
  const base = nameStr.split("/").pop().replace(/\.[^.]+$/, "");
  
  // Regex matches patterns like "1A-F", "2B_R", "3C", etc.
  // Group 1: Step (\d+)
  // Group 2: Branch ([A-Za-z]+)
  // Group 3: Optional Turn ([A-Za-z0-9_]+)
  const m = base.match(/(?:^|[^0-9A-Za-z])(\d+)([A-Za-z]+)(?:[-_]([A-Za-z0-9_]+))?(?:$|[^0-9A-Za-z])/);
  
  // Fallback for unformatted images
  if (!m) return { id: base || "node", step: 1, branch: "A", turn: "F", image: imgUrl, isPanorama: (typeof item === "object" && item.isPanorama !== undefined) ? item.isPanorama : (/pano/i.test(nameStr) || /pano/i.test(imgUrl)) };
  
  const rawTurn = (m[3] || "F").toUpperCase();
  const turn = rawTurn.includes("R") ? "R" : rawTurn.includes("L") ? "L" : "F";
  const step = parseInt(m[1], 10);
  const branch = m[2].toUpperCase();
  
  const isPano = (typeof item === "object" && item.isPanorama !== undefined) ? item.isPanorama : (/pano/i.test(nameStr) || /pano/i.test(imgUrl));
  
  return { id: `${step}${branch}-${turn}`, step, branch, turn, image: imgUrl, isPanorama: isPano };
}

/**
 * Autonomously constructs a walkable 3D graph (nodes and directional edges)
 * supporting both linear sequences and side branches (Branch A, B, C...).
 * When only one branch exists, branching remains cleanly dormant.
 * 
 * @param {Array} inputList - Array of raw image items.
 * @returns {Object} An object containing `{ nodes, edges }` to be used by the navigation engine.
 */
export function buildGraphFromNomenclature(inputList = []) {
  const parsed = inputList.map(parseItem);

  // Group nodes by their Branch letter (e.g., A, B, C)
  const branchMap = {};
  parsed.forEach(n => (branchMap[n.branch] = branchMap[n.branch] || []).push(n));

  const branchKeys = Object.keys(branchMap).sort((a, b) =>
    a === "A" ? -1 : b === "A" ? 1 : a.localeCompare(b)
  );

  // Sort nodes within each branch sequentially by their step number
  branchKeys.forEach(k => branchMap[k].sort((a, b) => a.step - b.step));

  const hasMultipleBranches = branchKeys.length > 1;

  // Spatial minimap layout
  const coords = {};
  const mainBranch = branchMap["A"] || branchMap[branchKeys[0]] || [];

  // 1. Layout Main Trunk (Branch A)
  mainBranch.forEach((item, idx) => {
    const x = item.turn === "R" ? 65 : item.turn === "L" ? 35 : 50;
    const y = mainBranch.length > 1
      ? Math.round(80 - (idx / (mainBranch.length - 1)) * 60)
      : 50;
    coords[item.id] = { x, y };
  });

  // 2. Layout Side Branches (Branch B, C, etc.) if present (dormant if only A)
  branchKeys.filter(k => k !== "A").forEach((bk, bIdx) => {
    const list = branchMap[bk];
    const first = list[0];
    if (!first) return;

    // Find parent on main branch where this sub-branch splits off
    const parent =
      mainBranch.find(m => m.step === first.step - 1) ||
      mainBranch.find(m => m.step === first.step) ||
      mainBranch[0] ||
      { id: "root", step: 1 };
    const parentCoord = coords[parent.id] || { x: 50, y: 50 };

    const dir =
      first.turn === "L" ? -1 : first.turn === "R" ? 1 : bIdx % 2 === 1 ? 1 : -1;

    list.forEach((item, idx) => {
      const x = Math.max(12, Math.min(88, parentCoord.x + dir * (20 + idx * 10)));
      const y = Math.max(12, Math.min(88, parentCoord.y - 12 - idx * 14));
      coords[item.id] = { x, y };
    });
  });

  // Assemble nodes
  const nodes = [];
  branchKeys.forEach(bk => {
    branchMap[bk].forEach((item, idx) => {
      const { x, y } = coords[item.id] || { x: 50, y: 50 };
      nodes.push({
        id: item.id,
        number: item.step || idx + 1,
        branch: item.branch || "A",
        turn: item.turn || "F",
        image: item.image,
        customLabel: item.customLabel,
        context: item.context,
        mapX: x,
        mapY: y,
        isPanorama: item.isPanorama,
      });
    });
  });

  // Assemble edges
  const edges = [];
  const edgeSet = new Set();

  const addEdge = (from, to, dir) => {
    const key = `${from}->${to}`;
    if (!edgeSet.has(key)) {
      edges.push({ from, to, direction: dir });
      edgeSet.add(key);
    }
  };

  // 1. Sequential connections within each branch
  branchKeys.forEach(bk => {
    const list = branchMap[bk];
    for (let i = 0; i < list.length - 1; i++) {
      const from = list[i];
      const to = list[i + 1];
      const dir = to.turn === "R" ? "right" : to.turn === "L" ? "left" : "forward";
      addEdge(from.id, to.id, dir);
      addEdge(to.id, from.id, "backward");
    }
  });

  // 2. Branch split connections (Main Trunk -> Branch Start)
  if (hasMultipleBranches) {
    branchKeys.filter(k => k !== "A").forEach(bk => {
      const list = branchMap[bk];
      const first = list[0];
      if (!first) return;

      const parent =
        mainBranch.find(m => m.step === first.step - 1) ||
        mainBranch.find(m => m.step === first.step) ||
        mainBranch[mainBranch.length - 1];

      if (parent) {
        const dir = first.turn === "R" ? "right" : first.turn === "L" ? "left" : "right";
        addEdge(parent.id, first.id, dir);
        addEdge(first.id, parent.id, "backward");
      }
    });
  }

  return { nodes, edges };
}

