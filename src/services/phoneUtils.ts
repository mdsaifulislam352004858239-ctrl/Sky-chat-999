export interface Country {
  name: string;
  code: string;
  flag: string;
  example: string;
}

export const countries: Country[] = [
  { name: 'Bangladesh', code: '+880', flag: '🇧🇩', example: '1712-345678' },
  { name: 'India', code: '+91', flag: '🇮🇳', example: '98765-43210' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦', example: '50-123-4567' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪', example: '50-123-4567' },
  { name: 'United States', code: '+1', flag: '🇺🇸', example: '202-555-0143' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', example: '7911-123456' },
  { name: 'Malaysia', code: '+60', flag: '🇲🇾', example: '12-345-6789' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬', example: '8123-4567' },
  { name: 'Qatar', code: '+974', flag: '🇶🇦', example: '3312-3456' },
  { name: 'Kuwait', code: '+965', flag: '🇰🇼', example: '9912-3456' },
  { name: 'Oman', code: '+968', flag: '🇴🇲', example: '9123-4567' },
  { name: 'Pakistan', code: '+92', flag: '🇵🇰', example: '300-1234567' },
  { name: 'Canada', code: '+1', flag: '🇨🇦', example: '416-555-0143' },
  { name: 'Australia', code: '+61', flag: '🇦🇺', example: '412-345-678' },
  { name: 'Italy', code: '+39', flag: '🇮🇹', example: '320-123-4567' },
];

export const formatPhoneNumber = (phone: string, countryCode = '+880'): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    return countryCode + cleaned.substring(1);
  }
  if (!cleaned.startsWith(countryCode.replace('+', ''))) {
    return countryCode + cleaned;
  }
  return '+' + cleaned;
};

export const isValidPhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

/**
 * Generate a cryptographically secure random 6-digit OTP
 */
export const generateOtpCode = (): string => {
  // Generate random 6-digit integer between 100000 and 999999
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  const code = 100000 + (array[0] % 900000);
  return code.toString();
};

/**
 * Play authentic SMS incoming chime and trigger device vibration
 */
export const playSmsNotificationSound = (): void => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // First beep (880 Hz, A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.22);

      // Second tone (1320 Hz, E6) slightly delayed
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0, ctx.currentTime + 0.12);
      gain2.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    console.debug('Web audio playback error:', e);
  }

  // Device vibration pattern if supported
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([150, 80, 200]);
    }
  } catch {
    // ignore
  }
};
