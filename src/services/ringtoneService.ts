/**
 * Ringtone & Call Audio Service for Sky Chat
 * Provides Messenger-style incoming/outgoing call ringtones and connection chimes
 * using pure Web Audio API (zero external assets, instant, 100% reliable)
 */

class RingtoneManager {
  private audioCtx: AudioContext | null = null;
  private outgoingInterval: number | null = null;
  private incomingInterval: number | null = null;
  private isPlayingOutgoing = false;
  private isPlayingIncoming = false;

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('AudioContext unavailable:', e);
      return null;
    }
  }

  /**
   * Start Outgoing Ringback Tone (Caller hears gentle "Ringing..." melody)
   */
  public startOutgoingRingtone(): void {
    this.stopAll();
    this.isPlayingOutgoing = true;

    const playPulse = () => {
      if (!this.isPlayingOutgoing) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        // Two harmonious bell-like sine waves (Messenger style outgoing ring)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now); // A4
        osc1.frequency.exponentialRampToValueAtTime(480, now + 1.2);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);
        osc2.frequency.exponentialRampToValueAtTime(520, now + 1.2);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
        gain.gain.setValueAtTime(0.12, now + 1.1);
        gain.gain.linearRampToValueAtTime(0.001, now + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.35);
        osc2.stop(now + 1.35);
      } catch (err) {
        console.warn('Failed to play outgoing ring pulse:', err);
      }
    };

    // Play first tone immediately
    playPulse();
    // Repeat every 3 seconds
    this.outgoingInterval = window.setInterval(playPulse, 3200);
  }

  /**
   * Start Incoming Call Ringtone (Receiver hears vibrant, upbeat musical ringtone)
   */
  public startIncomingRingtone(): void {
    this.stopAll();
    this.isPlayingIncoming = true;

    const playTune = () => {
      if (!this.isPlayingIncoming) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      try {
        // Upbeat marimba musical ringtone notes: [freq, startOffset, duration]
        const notes = [
          { f: 587.33, t: 0.0, d: 0.18 }, // D5
          { f: 659.25, t: 0.2, d: 0.18 }, // E5
          { f: 783.99, t: 0.4, d: 0.18 }, // G5
          { f: 880.0, t: 0.6, d: 0.25 },  // A5
          { f: 783.99, t: 0.9, d: 0.18 }, // G5
          { f: 1046.5, t: 1.1, d: 0.35 }, // C6
          { f: 880.0, t: 1.5, d: 0.22 },  // A5
          { f: 987.77, t: 1.75, d: 0.3 }, // B5
        ];

        const now = ctx.currentTime;
        notes.forEach(({ f, t, d }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle'; // Rich warm musical tone
          osc.frequency.setValueAtTime(f, now + t);

          gain.gain.setValueAtTime(0.001, now + t);
          gain.gain.linearRampToValueAtTime(0.2, now + t + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + t);
          osc.stop(now + t + d + 0.05);
        });
      } catch (err) {
        console.warn('Failed to play incoming ringtune:', err);
      }
    };

    playTune();
    // Repeat pattern every 2.4 seconds
    this.incomingInterval = window.setInterval(playTune, 2400);
  }

  /**
   * Play Connected Chime (Played when call is answered)
   */
  public playCallConnectedSound(): void {
    this.stopAll();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Ascending pleasant connection chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.24); // G5

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (err) {
      console.warn('Failed to play connected sound:', err);
    }
  }

  /**
   * Play Call Ended Sound (Played when call is cut)
   */
  public playCallEndedSound(): void {
    this.stopAll();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Two quick descending soft beeps
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(330, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (err) {
      console.warn('Failed to play end call sound:', err);
    }
  }

  /**
   * Stop all ringtones and clean up intervals
   */
  public stopAll(): void {
    this.isPlayingOutgoing = false;
    this.isPlayingIncoming = false;

    if (this.outgoingInterval !== null) {
      clearInterval(this.outgoingInterval);
      this.outgoingInterval = null;
    }
    if (this.incomingInterval !== null) {
      clearInterval(this.incomingInterval);
      this.incomingInterval = null;
    }
  }
}

export const ringtoneService = new RingtoneManager();
