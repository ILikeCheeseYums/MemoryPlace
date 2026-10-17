import React, { useState, useEffect, useRef } from "react";
import {
  Volume2,
  VolumeX,
  Settings,
  Sparkles,
  Key,
  X,
  Square,
  Heart,
  Upload,
  User,
  Check,
  Headphones,
  Mic,
} from "lucide-react";
import {
  generateTourScript,
  speakScript,
  stopGuideSpeech,
  getGuideSettings,
  saveGuideSettings,
  DEFAULT_LOVED_ONE_VOICES,
} from "../services/aiGuideService";

export default function TourGuideAvatar({
  currentNode,
  outEdges = [],
  onNarrationStart,
  onNarrationEnd,
  onAutoPlayChange,
}) {
  // Companion State: "idle" | "thinking" | "speaking"
  const [guideState, setGuideState] = useState("idle");
  const [currentScript, setCurrentScript] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);

  // Settings State
  const [settings, setSettings] = useState(getGuideSettings);
  const [tempSettings, setTempSettings] = useState(getGuideSettings);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Audio references
  const currentAudioRef = useRef(null);
  const lastSpokenNodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const autoSpeakTimerRef = useRef(null);

  // Sync initial autoPlay state on mount
  useEffect(() => {
    onAutoPlayChange?.(settings.autoSpeak);
  }, []);

  /**
   * Speak comforting memories for the current room
   */
  const explainCurrentRoom = async () => {
    if (!currentNode) return;

    // Stop previous audio if running
    stopGuideSpeech();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    setGuideState("thinking");
    try {
      // 1. Generate gentle, loving reminiscence script from loved one's perspective
      const script = await generateTourScript({
        stationLabel: currentNode.customLabel || currentNode.id,
        stationContext: currentNode.context,
        isPanorama: currentNode.isPanorama,
        exits: outEdges,
      });

      setCurrentScript(script);
      setGuideState("speaking");
      onNarrationStart?.();

      // 2. Speak using ElevenLabs Cloned Voice
      await speakScript(script, () => {
        setGuideState("idle");
        onNarrationEnd?.();
      });
    } catch (err) {
      console.error("[MemoryCompanion] Narration error:", err);
      setGuideState("idle");
      onNarrationEnd?.();
    }
  };

  /**
   * Stop speaking
   */
  const handleStopSpeech = () => {
    if (autoSpeakTimerRef.current) {
      clearTimeout(autoSpeakTimerRef.current);
      autoSpeakTimerRef.current = null;
    }
    stopGuideSpeech();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setGuideState("idle");
    onNarrationEnd?.();
  };

  /**
   * Quick-toggle Auto Play / Auto Speak on entering rooms
   */
  const handleToggleAutoPlay = () => {
    const nextAutoSpeak = !settings.autoSpeak;
    if (autoSpeakTimerRef.current) {
      clearTimeout(autoSpeakTimerRef.current);
      autoSpeakTimerRef.current = null;
    }
    if (!nextAutoSpeak && guideState === "speaking") {
      handleStopSpeech();
    }
    saveGuideSettings({ autoSpeak: nextAutoSpeak });
    setSettings((prev) => ({ ...prev, autoSpeak: nextAutoSpeak }));
    setTempSettings((prev) => ({ ...prev, autoSpeak: nextAutoSpeak }));
    onAutoPlayChange?.(nextAutoSpeak);
  };

  /**
   * Auto-reassure when entering a new room
   */
  useEffect(() => {
    if (!currentNode) return;
    if (lastSpokenNodeRef.current === currentNode.id) return;
    lastSpokenNodeRef.current = currentNode.id;

    if (settings.autoSpeak) {
      if (autoSpeakTimerRef.current) clearTimeout(autoSpeakTimerRef.current);
      autoSpeakTimerRef.current = setTimeout(() => {
        explainCurrentRoom();
      }, 450);
      return () => {
        if (autoSpeakTimerRef.current) clearTimeout(autoSpeakTimerRef.current);
      };
    }
  }, [currentNode?.id, settings.autoSpeak]);

  /**
   * Handle Photo Upload for Loved One
   */
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setTempSettings((prev) => ({
        ...prev,
        companionPhoto: event.target.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  /**
   * Save Settings
   */
  const handleSaveSettings = (e) => {
    e.preventDefault();
    saveGuideSettings(tempSettings);
    setSettings(tempSettings);
    onAutoPlayChange?.(tempSettings.autoSpeak);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsSettingsOpen(false);
    }, 1000);
  };

  const hasKeys = Boolean(settings.elevenLabsApiKey);
  const companionDisplayName = settings.lovedOneName || "Loved One";
  const relationTitle = settings.relation || "Family";

  return (
    <>
      {/* ════════════════════════════════════════
          LOVED ONE'S MEMORY COMPANION (Bottom-Left)
          ════════════════════════════════════════ */}
      <div className="absolute bottom-6 left-6 z-30 pointer-events-auto flex items-end gap-3 select-none">
        {/* Loved One's Portrait Button */}
        <div className="relative group">
          {/* Gentle Warm Glow & Audio Rings when speaking */}
          {guideState === "speaking" && (
            <>
              <div className="absolute -inset-2.5 rounded-full bg-rose-500/25 animate-ping pointer-events-none" />
              <div className="absolute -inset-4 rounded-full border-2 border-rose-400/40 animate-pulse pointer-events-none" />
            </>
          )}

          <button
            onClick={() => {
              if (guideState === "speaking") {
                handleStopSpeech();
              } else {
                explainCurrentRoom();
              }
            }}
            className={`relative w-16 h-16 rounded-full overflow-hidden border-2 shadow-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
              guideState === "speaking"
                ? "border-rose-400 shadow-[0_0_28px_rgba(244,63,94,0.6)] scale-105"
                : guideState === "thinking"
                ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]"
                : "border-white/20 hover:border-rose-400 hover:scale-105"
            } bg-gradient-to-br from-[#261822] via-[#1a1c26] to-[#0e1017]`}
            title={
              guideState === "speaking"
                ? `Click to Pause ${companionDisplayName}`
                : `Click to Listen to ${companionDisplayName} (${relationTitle})`
            }
          >
            {/* Custom Photo of Loved One if uploaded, otherwise warm avatar */}
            {settings.companionPhoto ? (
              <img
                src={settings.companionPhoto}
                alt={companionDisplayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-rose-600 to-amber-500">
                <User className="w-8 h-8 text-white translate-y-0.5" />
              </div>
            )}

            {/* Little Heart Badge indicating Family Love */}
            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-[#121622] flex items-center justify-center shadow-md">
              <Heart className="w-2.5 h-2.5 fill-white text-white" />
            </div>

            {/* Speaking audio wave indicator */}
            {guideState === "speaking" && (
              <div className="absolute inset-x-0 bottom-0 py-0.5 bg-black/60 backdrop-blur-xs flex items-center justify-center gap-0.5">
                <span className="w-1 h-2 bg-rose-300 rounded-full animate-bounce" />
                <span className="w-1 h-3.5 bg-rose-300 rounded-full animate-bounce [animation-delay:0.15s]" />
                <span className="w-1 h-1.5 bg-rose-300 rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            )}
          </button>
        </div>

        {/* Companion Control Capsule */}
        <div className="bg-[#121622]/92 backdrop-blur-xl border border-white/12 rounded-2xl p-2 shadow-2xl flex items-center gap-2">
          {/* Action: Listen to Loved One */}
          <button
            onClick={() => {
              if (guideState === "speaking") {
                handleStopSpeech();
              } else {
                explainCurrentRoom();
              }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${
              guideState === "speaking"
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : guideState === "thinking"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white"
            }`}
          >
            {guideState === "speaking" ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : guideState === "thinking" ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Remembering...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Listen to {companionDisplayName}</span>
              </>
            )}
          </button>

          {/* Auto-Play Toggle */}
          <button
            onClick={handleToggleAutoPlay}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              settings.autoSpeak
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
            title={
              settings.autoSpeak
                ? "Auto-Play is ON (narrates automatically when entering a room). Click to turn OFF."
                : "Auto-Play is OFF. Click to turn ON."
            }
          >
            {settings.autoSpeak ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Auto: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Auto: OFF</span>
              </>
            )}
          </button>

          {/* Subtitles / Captions Toggle */}
          <button
            onClick={() => setShowSubtitle((prev) => !prev)}
            className={`px-2 py-1.5 rounded-xl border font-bold text-xs transition-colors cursor-pointer ${
              showSubtitle
                ? "bg-white/20 border-white/40 text-white"
                : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
            }`}
            title="Toggle Spoken Captions"
          >
            CC
          </button>

          {/* Family Voice & Memory Setup Button */}
          <button
            onClick={() => {
              setTempSettings(getGuideSettings());
              setIsSettingsOpen(true);
            }}
            className={`relative p-2 rounded-xl transition-all cursor-pointer ${
              !hasKeys
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                : "bg-white/5 hover:bg-white/12 text-gray-300 hover:text-white border border-white/10"
            }`}
            title="Configure Loved One's Cloned Voice & Memory Prompts"
          >
            <Settings className="w-3.5 h-3.5" />
            {!hasKeys && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-400" />
            )}
          </button>
        </div>

        {/* Spoken Narration Subtitle Box (Only visible when CC is toggled on) */}
        {showSubtitle && currentScript && guideState === "speaking" && (
          <div className="max-w-md bg-black/85 backdrop-blur-md border border-rose-500/30 rounded-xl px-4 py-2.5 text-xs text-gray-100 leading-relaxed shadow-2xl animate-fade-in">
            <span className="text-rose-300 font-bold mr-1.5">
              {companionDisplayName} ({relationTitle}):
            </span>
            {currentScript}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          FAMILY SETUP: LOVED ONE'S CLONED VOICE & MEMORY MODAL
          ════════════════════════════════════════ */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSettingsOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-xl bg-[#141722] border border-white/12 rounded-2xl shadow-2xl text-white overflow-hidden max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1a1f30]/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg">
                  <Heart className="w-5 h-5 text-white fill-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Loved One&apos;s Voice &amp; Memory Companion Setup
                  </h3>
                  <p className="text-xs text-rose-300/80">
                    Dementia Reminiscence Therapy · Familiar Voice &amp; Comforting Memories
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form
              onSubmit={handleSaveSettings}
              className="p-6 space-y-5 text-xs overflow-y-auto flex-1"
            >
              {/* Section 1: Who is speaking? (Familiar Identity) */}
              <div className="space-y-3 bg-[#0d1017] p-4 rounded-xl border border-white/8">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-rose-400" />
                  1. Loved One&apos;s Identity (Familiar Face &amp; Name)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-300 font-semibold block mb-1">
                      Loved One&apos;s Name
                    </label>
                    <input
                      type="text"
                      value={tempSettings.lovedOneName}
                      onChange={(e) =>
                        setTempSettings({ ...tempSettings, lovedOneName: e.target.value })
                      }
                      placeholder="e.g. Sarah"
                      className="w-full bg-[#161a24] border border-white/15 focus:border-rose-400 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-300 font-semibold block mb-1">
                      Relationship
                    </label>
                    <input
                      type="text"
                      value={tempSettings.relation}
                      onChange={(e) =>
                        setTempSettings({ ...tempSettings, relation: e.target.value })
                      }
                      placeholder="e.g. Your Daughter / Your Son"
                      className="w-full bg-[#161a24] border border-white/15 focus:border-rose-400 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">
                    How to Address the Person (Mom / Dad / Name)
                  </label>
                  <input
                    type="text"
                    value={tempSettings.addressAs}
                    onChange={(e) =>
                      setTempSettings({ ...tempSettings, addressAs: e.target.value })
                    }
                    placeholder="e.g. Mom, Dad, Grandma, Arthur"
                    className="w-full bg-[#161a24] border border-white/15 focus:border-rose-400 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    The voice will gently start each room with &quot;Hi {tempSettings.addressAs || "Mom"}, it&apos;s {tempSettings.lovedOneName || "Sarah"}...&quot;
                  </p>
                </div>

                {/* Photo Upload */}
                <div className="pt-1">
                  <label className="text-gray-300 font-semibold block mb-1.5">
                    Loved One&apos;s Photo (Familiar visual anchor)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-rose-400/50 bg-[#161a24] flex items-center justify-center shrink-0">
                      {tempSettings.companionPhoto ? (
                        <img
                          src={tempSettings.companionPhoto}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer border border-white/10"
                      >
                        <Upload className="w-3 h-3 text-rose-300" />
                        <span>Upload Family Photo</span>
                      </button>
                    </div>
                    {tempSettings.companionPhoto && (
                      <button
                        type="button"
                        onClick={() =>
                          setTempSettings((prev) => ({ ...prev, companionPhoto: "" }))
                        }
                        className="text-[11px] text-gray-400 hover:text-red-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: ElevenLabs Voice Cloning Integration */}
              <div className="space-y-3 bg-[#0d1017] p-4 rounded-xl border border-white/8">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5 text-rose-400" />
                    2. ElevenLabs Cloned Voice Setup
                  </h4>
                  <a
                    href="https://elevenlabs.io"
                    target="_blank"
                    rel="noreferrer"
                    className="text-rose-300 hover:underline font-normal text-[11px]"
                  >
                    Open ElevenLabs ↗
                  </a>
                </div>

                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-200 leading-relaxed">
                  💡 <strong>How to clone your loved one&apos;s voice:</strong> Record 1 minute of talking on your phone, upload it to <em>ElevenLabs VoiceLab</em> (Instant Voice Cloning), then copy the <strong>Voice ID</strong> below.
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">
                    ElevenLabs (11Labs) API Key
                  </label>
                  <input
                    type="password"
                    value={tempSettings.elevenLabsApiKey}
                    onChange={(e) =>
                      setTempSettings({
                        ...tempSettings,
                        elevenLabsApiKey: e.target.value,
                      })
                    }
                    placeholder="xi-api-key (e.g. sk_...)"
                    className="w-full bg-[#161a24] border border-white/15 focus:border-rose-400 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">
                    Loved One&apos;s Cloned Voice ID (from ElevenLabs VoiceLab)
                  </label>
                  <input
                    type="text"
                    value={tempSettings.elevenLabsVoiceId}
                    onChange={(e) =>
                      setTempSettings({
                        ...tempSettings,
                        elevenLabsVoiceId: e.target.value,
                      })
                    }
                    placeholder="Paste your custom Voice ID here (or select preset below)"
                    className="w-full bg-[#161a24] border border-white/15 focus:border-rose-400 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none font-mono text-[11px]"
                  />
                </div>

                {/* Preset Voice Fallback */}
                <div>
                  <label className="text-gray-400 font-normal block mb-1 text-[11px]">
                    Or choose a warm preset family voice:
                  </label>
                  <select
                    value={tempSettings.elevenLabsVoiceId}
                    onChange={(e) =>
                      setTempSettings({
                        ...tempSettings,
                        elevenLabsVoiceId: e.target.value,
                      })
                    }
                    className="w-full bg-[#161a24] border border-white/15 focus:border-rose-400 rounded-lg px-3 py-2 text-gray-200 focus:outline-none text-[11px]"
                  >
                    {DEFAULT_LOVED_ONE_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 3: AI Memory Grounding Brain */}
              <div className="space-y-3 bg-[#0d1017] p-4 rounded-xl border border-white/8">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    3. AI Memory Scripting Brain
                  </h4>
                  <div className="flex items-center gap-1 bg-[#161a24] p-0.5 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() =>
                        setTempSettings({ ...tempSettings, aiProvider: "gemini" })
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tempSettings.aiProvider === "gemini"
                          ? "bg-rose-500 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Gemini
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTempSettings({ ...tempSettings, aiProvider: "openai" })
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tempSettings.aiProvider === "openai"
                          ? "bg-rose-500 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      OpenAI
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">
                    AI API Key ({tempSettings.aiProvider === "gemini" ? "Gemini" : "OpenAI"})
                  </label>
                  <input
                    type="password"
                    value={tempSettings.aiApiKey}
                    onChange={(e) =>
                      setTempSettings({ ...tempSettings, aiApiKey: e.target.value })
                    }
                    placeholder={
                      tempSettings.aiProvider === "gemini"
                        ? "Gemini API Key (AIzaSy...)"
                        : "OpenAI API Key (sk-...)"
                    }
                    className="w-full bg-[#161a24] border border-white/15 focus:border-rose-400 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Reads the station&apos;s memories note and converts it into tender, loving reassurance.
                  </p>
                </div>
              </div>

              {/* Section 4: Auto-reassure option */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0d1017] border border-white/8">
                <div>
                  <p className="font-semibold text-white">
                    Gently Speak on Entering Each Room
                  </p>
                  <p className="text-[11px] text-gray-400">
                    When the person walks into a new space, their loved one automatically begins speaking.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={tempSettings.autoSpeak}
                  onChange={(e) =>
                    setTempSettings({ ...tempSettings, autoSpeak: e.target.checked })
                  }
                  className="w-4 h-4 accent-rose-500 cursor-pointer"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold shadow-lg"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save Voice &amp; Memory Settings</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
