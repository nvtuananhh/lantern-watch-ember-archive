// Procedural WebAudio only: no audio files, no assets. Every sound is
// a short oscillator/envelope gesture, created lazily on the first user
// gesture so browsers allow playback. Nothing here touches game state.

export function createSoundBank() {
  let context = null;
  let master = null;

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freqStart, freqEnd, duration, type, volume, when = 0) {
    if (!ensure() || context.state === 'suspended') {
      if (context) context.resume();
      return;
    }
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function noiseBurst(duration, volume) {
    if (!ensure()) return;
    const length = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    // Deterministic-ish hush: a simple decaying pseudo-noise from a
    // fixed LFSR pattern, not game randomness.
    let lfsr = 0xace1;
    for (let i = 0; i < length; i++) {
      const bit = ((lfsr >> 0) ^ (lfsr >> 2) ^ (lfsr >> 3) ^ (lfsr >> 5)) & 1;
      lfsr = (lfsr >> 1) | (bit << 15);
      data[i] = ((lfsr & 1) * 2 - 1) * (1 - i / length);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(master);
    source.start();
  }

  return {
    unlock() {
      ensure();
      if (context && context.state === 'suspended') context.resume();
    },
    footstep(sneaking) {
      if (sneaking) return;
      noiseBurst(0.05, 0.12);
    },
    guardStep(distance, chase) {
      const volume = Math.max(0, 0.22 - distance / 900) * (chase ? 1.6 : 1);
      if (volume <= 0.01) return;
      noiseBurst(0.06, volume);
    },
    pebbleLand() {
      noiseBurst(0.09, 0.3);
      tone(900, 320, 0.09, 'triangle', 0.18);
    },
    alertSting() {
      tone(220, 440, 0.28, 'sawtooth', 0.22);
      tone(330, 660, 0.28, 'sawtooth', 0.16, 0.12);
    },
    pickupChime() {
      tone(660, 990, 0.14, 'sine', 0.25);
      tone(990, 1320, 0.18, 'sine', 0.2, 0.09);
    },
    keyChime() {
      tone(520, 780, 0.16, 'triangle', 0.25);
      tone(780, 1040, 0.16, 'triangle', 0.22, 0.1);
      tone(1040, 1560, 0.22, 'sine', 0.2, 0.2);
    },
    winFanfare() {
      [523, 659, 784, 1047].forEach((freq, i) => tone(freq, freq, 0.3, 'triangle', 0.24, i * 0.13));
    },
    caughtSting() {
      tone(392, 98, 0.55, 'sawtooth', 0.26);
    },
  };
}
