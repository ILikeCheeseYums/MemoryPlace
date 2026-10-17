/**
 * Ambient Nostalgic Music Service for Dementia Reminiscence Therapy
 * Supports both custom uploaded music (MP3/WAV/OGG) and beautiful built-in
 * procedural ambient melodies (Web Audio API) for instant zero-dependency playback.
 */

class AmbientMusicService {
  constructor() {
    this.audioElement = null;
    this.audioContext = null;
    this.synthInterval = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.currentTrackName = "";
    this.volume = 0.45; // Gentle background volume so loved one's voice is prominent
  }

  /**
   * Start playing music (either custom uploaded file URL or built-in procedural preset)
   */
  async play({ type = "piano", customUrl = null, name = "Peaceful Piano", volume = 0.45 } = {}) {
    this.stop();
    this.volume = volume;
    this.currentTrackName = name;
    this.isPlaying = true;

    // 1. Custom Uploaded Audio Track
    if (customUrl) {
      try {
        this.audioElement = new Audio(customUrl);
        this.audioElement.loop = true;
        this.audioElement.volume = this.volume;
        await this.audioElement.play();
        return;
      } catch (err) {
        console.warn("[AmbientMusic] Failed to play custom audio file:", err);
      }
    }

    // 2. Built-in Soothing Procedural Ambient Melodies
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.audioContext = new AudioCtx();
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);

      // Lowpass filter for warm, cozy, nostalgic warmth (removes harsh highs)
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(type === "chimes" ? 1800 : 850, this.audioContext.currentTime);

      this.gainNode.connect(filter);
      filter.connect(this.audioContext.destination);

      // Nostalgic Chord Progressions (Frequencies in Hz)
      // C major 7 -> A minor 7 -> F major 7 -> G sus
      const chords =
        type === "chimes"
          ? [
              [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6
              [440.0, 523.25, 659.25, 880.0],   // A4, C5, E5, A5
              [349.23, 440.0, 523.25, 698.46],  // F4, A4, C5, F5
              [392.0, 523.25, 587.33, 783.99],  // G4, C5, D5, G5
            ]
          : [
              [130.81, 164.81, 196.0, 246.94], // C3, E3, G3, B3 (Cmaj7)
              [110.0, 130.81, 164.81, 196.0],  // A2, C3, E3, G3 (Am7)
              [87.31, 130.81, 174.61, 220.0],   // F2, C3, F3, A3 (Fmaj7)
              [98.0, 146.83, 196.0, 261.63],   // G2, D3, G3, C4 (Gsus4)
            ];

      let chordIndex = 0;

      const playChord = () => {
        if (!this.audioContext || !this.gainNode || !this.isPlaying) return;
        const currentChord = chords[chordIndex % chords.length];
        chordIndex++;

        const now = this.audioContext.currentTime;
        const chordDuration = 4.2;

        currentChord.forEach((freq, idx) => {
          const osc = this.audioContext.createOscillator();
          const noteGain = this.audioContext.createGain();

          osc.type = type === "chimes" ? "sine" : idx === 0 ? "triangle" : "sine";
          // Gentle slight detune for nostalgic vintage warmth
          osc.frequency.setValueAtTime(freq + (idx % 2 === 0 ? 0.4 : -0.4), now);

          // Soft attack, prolonged nostalgic sustain, gentle release
          noteGain.gain.setValueAtTime(0, now);
          noteGain.gain.linearRampToValueAtTime(0.08 / currentChord.length, now + 1.2);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + chordDuration);

          osc.connect(noteGain);
          noteGain.connect(this.gainNode);

          osc.start(now + idx * 0.08); // Slight arpeggiated spread
          osc.stop(now + chordDuration + 0.5);
        });
      };

      // Play initial chord immediately
      playChord();
      // Loop chord progression every 4.4 seconds
      this.synthInterval = setInterval(playChord, 4400);
    } catch (err) {
      console.warn("[AmbientMusic] Web Audio synthesis error:", err);
    }
  }

  /**
   * Stop music playback
   */
  stop() {
    this.isPlaying = false;
    this.currentTrackName = "";

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }

    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
    }

    this.gainNode = null;
  }

  /**
   * Set music volume (0.0 to 1.0)
   */
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));

    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }

    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    }
  }
}

export const musicPlayer = new AmbientMusicService();

export const NOSTALGIC_PRESET_TRACKS = [
  { id: "piano", name: "Peaceful Piano & Hearth", desc: "Warm, gentle piano chords with tender nostalgic resonance." },
  { id: "chimes", name: "Calm Wind Chimes & Garden", desc: "Gentle porch wind chimes and airy, peaceful bells." },
  { id: "hearth", name: "Soft Fireside Strings", desc: "Warm harmonic swells evoking winter evenings by the fireplace." },
];

