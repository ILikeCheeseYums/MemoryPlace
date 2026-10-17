# 🌸 Immersia

> **AI-Powered Reminiscence Therapy & Immersive Memory Navigation for Dementia Care**

**Immersia** is an interactive reminiscence therapy platform designed to help individuals living with Alzheimer's disease and dementia reconnect with cherished life moments. By combining **360° spatial panoramas of familiar spaces**, an **AI-driven voice engine cloned after loved ones**, and **ambient generative music**, Immersia creates a safe, comforting, and emotionally grounding environment for cognitive wellness.

---

## ✨ Key Features

### 1. 🔀 Two Experience Modes
- **🚶‍♂️ Interactive Walkthrough (*"Street Viewer"*)**:
  - Full freedom to explore nostalgic spaces at one's own pace.
  - Interactive floor chevrons, smart branching corridor engine, and real-time SVG minimap.
  - Dual rendering modes: **Usual (2D Cylindrical)** with seamless loop wrap, and **3D Orb** powered by Three.js spherical projection.
  - On-entry memory triggers: stepping into a room prompts the AI loved one to share a warm, context-aware memory.

- **🎞️ Automated Memory Slideshow with Music**:
  - Hands-free, low-cognitive-load experience tailored for seniors and clinical sessions.
  - **Smart Pacing**: Automatically advances to the next scene once narration concludes, or after a gentle 45-second contemplation window.
  - **Built-in Ambient Music**: Web Audio synthesis presets (*Peaceful Piano*, *Calm Chimes*, *Fireside Strings*), or upload your own cherished family MP3 tracks.
  - **Live Controls**: Persistent playback bar with linear slide stepper, previous/next controls, and an instant Autoplay toggle.

---

### 2. 🎙️ Loved One Voice Engine & Memory Grounding
- **Voice Cloning (ElevenLabs)**: Family members can clone a familiar voice (daughter, son, grandchild, spouse) via ElevenLabs VoiceLab ID to comfort the patient.
- **Dynamic Memory Generation (Google Gemini / OpenAI)**: Synthesizes gentle, conversational reminiscence scripts that highlight sensory cues (scents, sounds, family laughter).
- **Graceful Fallbacks**: Works out of the box with built-in browser Web Speech synthesis and curated memories if external API keys are not provided.
- **Live Avatar & Closed Captions (CC)**: Calming visual companion with real-time audio waveform animations and high-contrast accessible captions.

---

### 3. 🧩 Visual Node Graph Editor (Unreal Engine Blueprint Style)
- Caregivers and family members can visually design custom memory journeys.
- Connect rooms with intuitive forward, left, right, and return pathways.
- Assign 360° panoramas or standard widescreen images to specific nodes.
- Author localized memory prompts, emotional cues, and voice context per room.

---

### 4. 🏡 Pre-loaded Nostalgia Demo Tour
Includes a five-scene, AI-generated nostalgic family journey:
1. **The Sunlit Craftsman Porch** (`1A-F.jpeg`): Morning sunlight filtering through maple leaves and geraniums.
2. **The Fireside Living Room** (`2A-F.jpeg`): Warm embers, vintage books, and favorite armchairs.
3. **The Hallway of Milestones** (`3A-F.jpeg`): Framed family portraits, graduations, and wedding days.
4. **The Heirloom Rose Garden** (`4A-F.jpeg`): Pink English roses, lavender bushes, and tranquil songbirds.
5. **The Country Breakfast Nook** (`5A-F.jpeg`): Freshly baked cinnamon rolls and morning coffee.

---

## 🛠️ Tech Stack

- **Frontend**: [React 18](https://react.dev/), [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Lucide React Icons](https://lucide.dev/)
- **3D & 360° Rendering**: [Three.js](https://threejs.org/) via `@react-three/fiber` & HTML5 Canvas / CSS Cylindrical Projection
- **Audio & Synthesis**: Web Audio API (procedural generative music), HTML5 Audio, Web Speech Synthesis
- **AI Integrations**: [ElevenLabs API](https://elevenlabs.io/), [Google Gemini API](https://ai.google.dev/), [OpenAI API](https://openai.com/)
- **Deployment**: [Vercel](https://vercel.com/) with single-page application rewriting (`vercel.json`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm installed.

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/immersia.git
   cd immersia
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5174](http://localhost:5174) in your browser.

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## ⚙️ Configuration & API Keys

Immersia functions immediately without any external keys using browser-native text-to-speech and Web Audio synth melodies.

To enable personalized voice cloning and dynamic memory generation:
1. Click the **"Voice & Memory Settings"** (gear icon) on the loved one avatar or in the top navigation bar.
2. Enter your API credentials:
   - **ElevenLabs API Key & Voice ID**: For realistic family member voice cloning.
   - **OpenAI or Gemini API Key**: For real-time conversational memory synthesis.
3. Keys are stored safely in browser `localStorage` and never transmitted to external servers other than the official AI providers.

---

## ⌨️ Navigation Controls & Shortcuts

| Action | Control / Shortcut |
|:---|:---|
| **Step Forward** | `↑` Arrow, `W`, or click forward chevron |
| **Step Backward** | `↓` Arrow, `S`, or click backward chevron |
| **Turn Left / Right** | `←` / `→` Arrows, `A` / `D`, or click directional chevrons |
| **360° Look Around** | Click and drag mouse, or touch swipe across the scene |
| **Toggle Autoplay** | Click the Play/Pause button in the bottom slideshow bar |
| **Toggle 360° Mode** | Click the "Usual" / "3D Orb" toggle button |
| **Toggle Fit / Fill** | Press `C` or click the `⤢` button |
| **Zoom In / Out** | Mouse wheel scroll, or `+` / `-` buttons |
| **Toggle Minimap** | Press `M` or click the map icon |
| **Open Blueprint Editor** | Click the "Blueprint Graph" button in the navigation header |

---

## 🚢 Deployment (Vercel)

The repository is configured for one-click deployment on [Vercel](https://vercel.com/):

```bash
# Using Vercel CLI
npm install -g vercel
vercel
```

A [`vercel.json`](vercel.json) file is pre-configured with SPA route rewrites:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 🤝 Clinical Purpose & Reminiscence Therapy

Reminiscence therapy uses tangible sensory prompts (photographs, familiar spaces, familiar voices, and music) to evoke positive memories and emotions from the past. Research shows that engaging in reminiscence can:
- **Reduce anxiety and depressive symptoms** in people with dementia.
- **Stimulate neuro-connections** associated with long-term episodic memory.
- **Foster meaningful communication** between patients, caregivers, and family members.

*Immersia is built with compassion to preserve dignity, memory, and personal identity.*
