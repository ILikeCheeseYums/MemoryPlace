import { useState, useCallback, useRef } from 'react';
import StreetViewer from './components/StreetViewer';
import BlueprintGraphEditor from './components/BlueprintGraphEditor';
import { parseItem } from './utils/graph';
import { getDemoTourImages, getDemoTourGraph } from './utils/demo';
import { NOSTALGIC_PRESET_TRACKS } from './services/ambientMusicService';
import FeatureCard from './components/FeatureCard';
import { useDropzone } from 'react-dropzone';
import { 
  Compass, 
  Film, 
  Music, 
  Upload, 
  Check, 
  Sparkles, 
  Heart, 
  Layers, 
  ArrowRight,
  Play
} from 'lucide-react';

// App phases: "landing" | "sorting" | "viewing"
export default function App() {
  const [phase, setPhase] = useState("landing");
  const [returnPhase, setReturnPhase] = useState("landing");
  const [stagedImages, setStagedImages] = useState([]); // raw parsed images for graph editor
  const [finalImages, setFinalImages]   = useState([]); // compiled images for viewer
  const [tourGraph, setTourGraph]       = useState(null); // compiled Blueprint graph
  
  // 2 Viewer Modes: "interactive" (The Video / OG Street Viewer) | "slideshow" (Automated Slideshow with Music)
  const [tourMode, setTourMode] = useState("interactive");

  // Selected Music for Slideshow Mode
  const [selectedMusic, setSelectedMusic] = useState({
    id: "piano",
    name: "Peaceful Piano & Hearth",
    type: "piano",
    customUrl: null,
    isCustom: false,
  });

  const musicFileInputRef = useRef(null);

  /** Called when photo files are dropped on the landing page */
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    const parsed = acceptedFiles.map(file => {
      const url = URL.createObjectURL(file);
      const item = parseItem(file.name);
      item.image = url;
      item.file  = file;
      return item;
    });
    setStagedImages(parsed);
    setTourGraph(null);
    setPhase("sorting");
  }, []);

  const { getRootProps, getInputProps, isDragActive, open: openPhotoDialog } = useDropzone({
    onDrop,
    noClick: true, // we trigger file selection via dedicated buttons
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] }
  });

  /** Handle Custom Music Upload (MP3, WAV, etc.) */
  const handleMusicUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSelectedMusic({
      id: "custom",
      name: file.name.replace(/\.[^.]+$/, ""),
      type: "custom",
      customUrl: url,
      isCustom: true,
    });
  };

  /** Launch Mode 1: Interactive Walkthrough ("The Video / OG Street Viewer") */
  const launchInteractiveMode = (useDemo = true) => {
    const images = useDemo ? getDemoTourImages() : stagedImages;
    const graph = useDemo ? getDemoTourGraph() : tourGraph;
    setFinalImages(images);
    setTourGraph(graph);
    setTourMode("interactive");
    setReturnPhase("landing");
    setPhase("viewing");
  };

  /** Launch Mode 2: Automated Slideshow with Music */
  const launchSlideshowMode = (useDemo = true) => {
    const images = useDemo ? getDemoTourImages() : stagedImages;
    const graph = useDemo ? getDemoTourGraph() : tourGraph;
    setFinalImages(images);
    setTourGraph(graph);
    setTourMode("slideshow");
    setReturnPhase("landing");
    setPhase("viewing");
  };

  /* ── Phase: Viewer ── */
  if (phase === "viewing") {
    return (
      <StreetViewer
        images={finalImages}
        initialGraph={tourGraph}
        tourMode={tourMode}
        musicConfig={selectedMusic}
        onExit={() => setPhase(returnPhase)}
      />
    );
  }

  /* ── Phase: Blueprint Graph Ordering ── */
  if (phase === "sorting") {
    return (
      <BlueprintGraphEditor
        initialImages={stagedImages}
        onLaunch={(orderedImages, customGraph) => {
          setFinalImages(orderedImages);
          setTourGraph(customGraph || null);
          setReturnPhase("sorting");
          setPhase("viewing");
        }}
        onBack={() => setPhase("landing")}
      />
    );
  }

  /* ── Phase: Landing (Clean, Warm Light Theme) ── */
  return (
    <div 
      {...getRootProps()} 
      className={`min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden transition-colors ${
        isDragActive ? 'bg-blue-50/70' : ''
      }`}
    >
      <input {...getInputProps()} />
      {/* Hidden Music File Input */}
      <input 
        ref={musicFileInputRef}
        type="file" 
        accept="audio/*,.mp3,.wav,.ogg,.m4a"
        onChange={handleMusicUpload}
        className="hidden"
      />
      
      {/* Warm Ambient Sunlit Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-rose-200/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[550px] h-[550px] bg-amber-200/30 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-[600px] h-[400px] bg-sky-200/30 rounded-full blur-[140px] pointer-events-none" />

      {/* Delicate background dot pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', 
          backgroundSize: '28px 28px' 
        }} 
      />

      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-blue-500/15 backdrop-blur-sm border-4 border-dashed border-blue-500 flex items-center justify-center">
          <div className="bg-white/95 px-8 py-6 rounded-3xl shadow-2xl text-center space-y-2 border border-blue-200">
            <Upload className="w-12 h-12 text-blue-600 mx-auto animate-bounce" />
            <h2 className="text-3xl font-bold text-slate-900">Drop your family photos here!</h2>
            <p className="text-sm text-slate-600">We&apos;ll automatically stage them into the memory map.</p>
          </div>
        </div>
      )}

      <div className="max-w-5xl w-full text-center space-y-10 z-10 pointer-events-auto">
        {/* Header Hero */}
        <div className="space-y-4">
          <div className="flex justify-center mb-2">
            <div className="relative group">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-rose-400 via-amber-300 to-sky-400 opacity-40 blur-lg group-hover:opacity-70 transition duration-500" />
              <div className="relative w-24 h-24 rounded-2xl bg-white border border-slate-200/80 p-2 shadow-xl flex items-center justify-center">
                <img src="/symbol.png" alt="Compass" className="w-full h-full object-contain pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold tracking-wide shadow-xs">
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            <span>Reminiscence Therapy &amp; Loved One Voice Engine</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Immersia Memory Engine
          </h1>
          
          <p className="text-slate-600 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto font-normal">
            Helping people with dementia reconnect with cherished memories in familiar spaces,
            tenderly guided by the cloned voices of their loved ones.
            <br />
            <span className="text-xs font-semibold text-slate-400 mt-1 inline-block">
              ~ By Team Get Init · Clinical Reminiscence Platform
            </span>
          </p>
        </div>

        {/* ════════════════════════════════════════
            THE 2 CORE MODES (Light-Themed Cards)
            ════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          
          {/* ── MODE 1: THE OG STREET VIEWER ("The Video / Interactive Walk") ── */}
          <div className="bg-white/95 rounded-3xl p-7 border border-slate-200/90 shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_45px_rgba(37,99,235,0.08)] hover:border-blue-300 transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center shadow-xs text-blue-600">
                  <Compass className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                  Mode 1 · Interactive Walk
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  Interactive Walkthrough
                </h2>
                <p className="text-xs font-semibold text-blue-600 tracking-wide uppercase mt-0.5">
                  The Classic &quot;OG Street Viewer&quot;
                </p>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Step into home spaces at your own pace. Freely navigate with floor arrows, 
                pan through 360° panoramas, and pause to reminisce. The AI companion speaks when you enter a room or on-demand.
              </p>

              <div className="space-y-2 py-2 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>Manual step-by-step room walking &amp; floor chevrons</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>360° Spherical Orb &amp; Cylindrical panoramic views</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>Loved one&apos;s voice companion speaks upon entering rooms</span>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-3 border-t border-slate-100">
              {/* Primary: Launch Interactive Demo */}
              <button
                type="button"
                onClick={() => launchInteractiveMode(true)}
                className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch Interactive Demo Tour</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Secondary: Inspect Blueprint Graph */}
                <button
                  type="button"
                  onClick={() => {
                    const demo = getDemoTourImages();
                    setStagedImages(demo);
                    setPhase("sorting");
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
                  title="Open in Unreal Blueprint Graph to see spatial connections"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Inspect Blueprint</span>
                </button>

                {/* Upload Photos */}
                <button
                  type="button"
                  onClick={openPhotoDialog}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>Upload Photos</span>
                </button>
              </div>
            </div>
          </div>


          {/* ── MODE 2: THE AUTOMATED MEMORY SLIDESHOW WITH MUSIC ── */}
          <div className="bg-white/95 rounded-3xl p-7 border border-slate-200/90 shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_45px_rgba(244,63,94,0.08)] hover:border-rose-300 transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/60 flex items-center justify-center shadow-xs text-rose-600">
                  <Film className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1">
                  <Music className="w-3 h-3 text-rose-500" />
                  <span>Mode 2 · Slideshow &amp; Music</span>
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  Memory Slideshow
                </h2>
                <p className="text-xs font-semibold text-rose-600 tracking-wide uppercase mt-0.5">
                  Automated Journey with Background Music
                </p>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Sit back and experience a gentle, automated memory film. Slides transition smoothly 
                after the loved one&apos;s narration finishes (or after 45s), scored by cherished family music.
              </p>

              {/* Music Selection & Upload Box */}
              <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-rose-500" />
                    Selected Music:
                  </span>
                  
                  {/* Upload Custom Music Button */}
                  <button
                    type="button"
                    onClick={() => musicFileInputRef.current?.click()}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Upload an MP3 of mom or dad's favorite song"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Song (MP3)</span>
                  </button>
                </div>

                {/* Current Active Music Badge */}
                <div className="p-2 rounded-xl bg-white border border-rose-200/70 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
                      <Music className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {selectedMusic.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {selectedMusic.isCustom ? "Custom uploaded family song" : "Soothing procedural ambient melody"}
                      </p>
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                </div>

                {/* Built-in Nostalgic Preset Options */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {NOSTALGIC_PRESET_TRACKS.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() =>
                        setSelectedMusic({
                          id: track.id,
                          name: track.name,
                          type: track.id,
                          customUrl: null,
                          isCustom: false,
                        })
                      }
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-all truncate text-center cursor-pointer ${
                        selectedMusic.id === track.id && !selectedMusic.isCustom
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                      title={track.desc}
                    >
                      {track.name.split(" ")[0]} {track.name.split(" ")[1]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              {/* Primary: Launch Slideshow with Music */}
              <button
                type="button"
                onClick={() => launchSlideshowMode(true)}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-700 hover:to-amber-600 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>Launch Slideshow with Music</span>
              </button>
            </div>
          </div>

        </div>

        {/* ════════════════════════════════════════
            FEATURE CARDS (Light Themed)
            ════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 text-left">
          <FeatureCard
            iconSrc="/icons/image.svg"
            title="1. Add Familiar Spaces"
            description="Upload standard photos or 360° panoramas of home, gardens, and cherished rooms where memories live."
            hoverBorderColor="hover:border-blue-400/50"
          />
          <FeatureCard
            iconSrc="/icons/map.svg"
            title="2. Blueprint Wiring"
            description="Visual node scripting wires spaces into a walkable journey with custom memories attached to every room."
            hoverBorderColor="hover:border-emerald-400/50"
          />
          <FeatureCard
            iconSrc="/icons/layers.svg"
            title="3. Loved One's Cloned Voice"
            description="ElevenLabs voice synthesis speaks reassuringly to your loved one, providing calm cognitive grounding."
            hoverBorderColor="hover:border-rose-400/50"
          />
        </div>

      </div>
    </div>
  );
}
