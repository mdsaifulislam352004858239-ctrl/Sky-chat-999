/**
 * Audio Helper Utilities for Voice Messages
 */

/**
 * Generate a synthetic voice note WAV blob (e.g. when microphone is blocked by iframe/browser)
 * Creates a valid, playable 16-bit PCM WAV audio file
 */
export const createSyntheticVoiceBlob = (durationSeconds: number = 3): Blob => {
  const sampleRate = 44100;
  const numChannels = 1;
  const numSamples = Math.floor(sampleRate * Math.max(1, durationSeconds));
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + numSamples * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numChannels * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, numChannels * 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, numSamples * 2, true);

  // Write sample data: gentle musical harmonic arpeggio simulating voice
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Harmonic frequencies to simulate voice melody
    const freq = 320 + Math.sin(t * 4) * 60 + Math.sin(t * 12) * 20;
    const envelope = Math.min(1, Math.sin((Math.PI * i) / numSamples) * 2);
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.4 * envelope;
    // convert to 16-bit PCM
    const intSample = Math.max(-1, Math.min(1, sample)) * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
};

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Detect best supported MediaRecorder MIME type for browser
 */
export const getBestAudioMimeType = (): string => {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg',
    'audio/wav',
    '',
  ];
  for (const type of candidateTypes) {
    if (!type || MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
};
