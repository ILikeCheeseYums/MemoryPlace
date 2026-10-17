/**
 * Dementia Reminiscence Demo Tour for Judges
 * Real family memories, comforting spatial context, and 360° panoramic spaces.
 */

/**
 * Creates warm, comforting domestic illustrative SVG scenes for memory stations
 */
export function createMemorySvgScene({
  title,
  subtitle,
  roomType = "living",
  accentColor = "#e11d48",
  isPanorama = false,
}) {
  const width = isPanorama ? 2048 : 1024;
  const height = 512;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <!-- Warm Ambient Sunlight Sky Gradient -->
      <radialGradient id="sunlight" cx="50%" cy="30%" r="85%">
        <stop offset="0%" stop-color="#3b2d2a"/>
        <stop offset="45%" stop-color="#1f1820"/>
        <stop offset="100%" stop-color="#0e0d13"/>
      </radialGradient>
      
      <!-- Hardwood Floor Gradient -->
      <linearGradient id="hardwood" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#2a1d17"/>
        <stop offset="50%" stop-color="#1c120e"/>
        <stop offset="100%" stop-color="#0d0907"/>
      </linearGradient>

      <!-- Soft Warm Hearth Glow -->
      <radialGradient id="hearthGlow" cx="50%" cy="55%" r="50%">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.25"/>
        <stop offset="60%" stop-color="#fbbf24" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
    </defs>

    <!-- Warm Room Walls / Ceiling -->
    <rect width="${width}" height="${height}" fill="url(#sunlight)" />

    <!-- Hearth / Ambient Warmth Glow -->
    <rect width="${width}" height="${height}" fill="url(#hearthGlow)" />

    <!-- Perspective Hardwood Floor -->
    <polygon points="0,${height * 0.54} ${width},${height * 0.54} ${width},${height} 0,${height}" fill="url(#hardwood)" />

    <!-- Floor Perspective Planks -->
    <g stroke="rgba(255,200,160,0.12)" stroke-width="1.2">
      ${Array.from({ length: 17 })
        .map((_, i) => {
          const x = (i / 16) * width;
          return `<line x1="${width / 2}" y1="${height * 0.54}" x2="${x}" y2="${height}" />`;
        })
        .join("")}
      ${[0.58, 0.65, 0.74, 0.85, 1.0]
        .map((ratio) => {
          const y = height * ratio;
          return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(255,180,140,0.08)" />`;
        })
        .join("")}
    </g>

    <!-- Warm Bay Window Frame at Center Horizon -->
    <g opacity="0.4" stroke="rgba(255,255,255,0.25)" stroke-width="2">
      <rect x="${width / 2 - 140}" y="${height * 0.22}" width="280" height="150" rx="8" fill="rgba(255,220,180,0.06)" />
      <line x1="${width / 2}" y1="${height * 0.22}" x2="${width / 2}" y2="${height * 0.22 + 150}" />
      <line x1="${width / 2 - 140}" y1="${height * 0.22 + 75}" x2="${width / 2 + 140}" y2="${height * 0.22 + 75}" />
    </g>

    <!-- Warm Lamp / Hanging Chandelier Centerpiece -->
    <circle cx="${width / 2}" cy="${height * 0.51}" r="32" fill="${accentColor}" opacity="0.3" filter="drop-shadow(0 0 16px ${accentColor})" />
    <circle cx="${width / 2}" cy="${height * 0.51}" r="14" fill="#fbbf24" opacity="0.7" />
    <circle cx="${width / 2}" cy="${height * 0.51}" r="4" fill="#ffffff" />

    <!-- Title & Reminiscence Banner -->
    <text x="${width / 2}" y="${height * 0.16}" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="28" font-weight="bold" letter-spacing="0.5">
      ${title}
    </text>
    <text x="${width / 2}" y="${height * 0.22}" text-anchor="middle" fill="#f43f5e" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="14" font-weight="600" letter-spacing="1.5">
      ${subtitle}
    </text>

    <!-- Warm Home Tag -->
    <text x="${width / 2}" y="${height * 0.94}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="12" letter-spacing="1">
      ❤ A Cherished Familiar Space · Tap "Listen to Sarah" for Mom's Memories
    </text>

    ${
      isPanorama
        ? `<text x="${width / 4}" y="${height * 0.38}" text-anchor="middle" fill="#fb7185" font-size="16" opacity="0.8">← Drag around 360° to view the entire garden →</text>
           <text x="${(width * 3) / 4}" y="${height * 0.38}" text-anchor="middle" fill="#fb7185" font-size="16" opacity="0.8">← Drag around 360° to view the entire garden →</text>`
        : ""
    }
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Returns the 5-room Dementia Reminiscence Demo Tour images with rich personal memories
 */
export function getDemoTourImages() {
  return [
    {
      id: "1A-F",
      step: 1,
      branch: "A",
      turn: "F",
      name: "1A-F_Front_Porch.jpeg",
      customLabel: "Station 1: Front Porch & Welcome Foyer",
      image: "/demo/1A-F.jpeg",
      fallbackImage: createMemorySvgScene({
        title: "Front Porch & Welcome Foyer",
        subtitle: "STEP 1 · THE ENTRANCE HOME",
        roomType: "porch",
        accentColor: "#3b82f6",
        isPanorama: false,
      }),
      context:
        "Welcome home, Mom. Notice the morning sunlight filtering through the green maple leaves onto the cedar porch boards. Dad hung those brass wind chimes right there above the porch steps on our trip back in 1989—they still chime softly when the afternoon breeze rolls in. Look at your bright red geraniums blooming in the terracotta planters that you watered faithfully every morning. Barney, our golden retriever, would stretch out right here by the stained-glass door waiting to greet you. Take a gentle breath, Mom; you are safe, at peace, and home.",
      isPanorama: false,
    },
    {
      id: "2A-F",
      step: 2,
      branch: "A",
      turn: "F",
      name: "2A-F_Living_Room.jpeg",
      customLabel: "Station 2: Living Room & Fireside Hearth",
      image: "/demo/2A-F.jpeg",
      fallbackImage: createMemorySvgScene({
        title: "Living Room & Stone Hearth",
        subtitle: "STEP 2 · THE FAMILY FIRESIDE",
        roomType: "living",
        accentColor: "#f59e0b",
        isPanorama: false,
      }),
      context:
        "Here is the heart of our home. Look beside the warm fieldstone fireplace—there is Dad's favorite deep-green wingback armchair with your hand-knitted cream wool throw draped over the armrest. Look down at the warm Persian rug where our family gathered for thirty Christmas mornings opening gifts together. The mahogany shelves are filled with your cherished poetry books, classic novels, and our family photo albums from summers up at the lake. Everything is right where you remember it.",
      isPanorama: false,
    },
    {
      id: "3A-F",
      step: 3,
      branch: "A",
      turn: "F",
      name: "3A-F_Photo_Gallery.jpeg",
      customLabel: "Station 3: Heritage Family Photo Hallway",
      image: "/demo/3A-F.jpeg",
      fallbackImage: createMemorySvgScene({
        title: "Family Photo Gallery Hallway",
        subtitle: "STEP 3 · LIFELONG MEMORIES",
        roomType: "gallery",
        accentColor: "#a855f7",
        isPanorama: false,
      }),
      context:
        "This hallway holds the story of our whole family, Mom. Framed on these walls under the warm amber sconces is your and Dad's wedding portrait from June 1968—you looked so beautiful in that lace dress. Right next to it is the photo of David and me building that enormous sandcastle at Cape Cod, and the portrait from when you graduated nursing school with honors. You gave so much love to everyone in these frames, and we are holding you in our hearts today.",
      isPanorama: false,
    },
    {
      id: "4A-F",
      step: 4,
      branch: "A",
      turn: "F",
      name: "4A-F_Rose_Garden_pano.jpeg",
      customLabel: "Station 4: 360° English Rose Arbor & Sanctuary",
      image: "/demo/4A-F.jpeg",
      fallbackImage: createMemorySvgScene({
        title: "360° English Garden & Rose Arbor",
        subtitle: "STEP 4 · 360° SUNLIT SANCTUARY",
        roomType: "garden",
        accentColor: "#f43f5e",
        isPanorama: true,
      }),
      context:
        "Take a slow look around you—this is the 360-degree heirloom English garden you and Aunt Clara planted back in the spring of 1984. You can see the pink climbing roses winding over the wooden trellises, the fragrant purple lavender, and the rustic cedar bench sitting in the shade under the flowering arbor. You used to sit out here in the golden afternoon with your cup of chamomile tea, watching the hummingbirds and butterflies flutter by in the gentle breeze.",
      isPanorama: true,
    },
    {
      id: "5A-F",
      step: 5,
      branch: "A",
      turn: "F",
      name: "5A-F_Kitchen_Nook.jpeg",
      customLabel: "Station 5: Mom's Kitchen & Sunny Breakfast Nook",
      image: "/demo/5A-F.jpeg",
      fallbackImage: createMemorySvgScene({
        title: "Mom's Kitchen & Breakfast Nook",
        subtitle: "STEP 5 · BAKING & MORNING COFFEE",
        roomType: "kitchen",
        accentColor: "#10b981",
        isPanorama: false,
      }),
      context:
        "Step inside your sunny kitchen, Mom. Morning light is streaming right through the lace curtains of the bay window. On the round wooden table sits your favorite yellow ceramic teapot and a warm platter of your famous cinnamon rolls, fresh out of the oven with sweet berries. So many Sunday mornings began right here at this table, drinking coffee, telling stories, and laughing until our sides hurt. Your home is always full of that warmth.",
      isPanorama: false,
    },
  ];
}

/**
 * Returns the fully compiled two-way navigation graph for the Demo Tour
 */
export function getDemoTourGraph() {
  const images = getDemoTourImages();

  const nodes = images.map((img, i) => ({
    id: img.id,
    number: img.step,
    branch: img.branch,
    turn: img.turn,
    image: img.image,
    customLabel: img.customLabel,
    context: img.context,
    isPanorama: img.isPanorama,
    mapX: 20 + i * 16,
    mapY: 50,
  }));

  const edges = [
    // 1 (Porch) <-> 2 (Living Room)
    { from: "1A-F", to: "2A-F", direction: "forward" },
    { from: "2A-F", to: "1A-F", direction: "backward" },

    // 2 (Living Room) <-> 3 (Photo Gallery)
    { from: "2A-F", to: "3A-F", direction: "forward" },
    { from: "3A-F", to: "2A-F", direction: "backward" },

    // 3 (Photo Gallery) <-> 4 (360° Garden Arbor - Linear Forward)
    { from: "3A-F", to: "4A-F", direction: "forward" },
    { from: "4A-F", to: "3A-F", direction: "backward" },

    // 4 (Garden) <-> 5 (Kitchen Nook - Linear Forward)
    { from: "4A-F", to: "5A-F", direction: "forward" },
    { from: "5A-F", to: "4A-F", direction: "backward" },
  ];

  return { nodes, edges };
}
