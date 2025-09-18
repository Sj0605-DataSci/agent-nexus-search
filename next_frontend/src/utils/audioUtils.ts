// const playNotificationSound = () => {
//   try {
//     const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

//     // Create main oscillator with a more complex wave
//     const mainOsc = audioContext.createOscillator();
//     mainOsc.type = "sine";

//     // Create a second oscillator for more harmonics
//     const secondOsc = audioContext.createOscillator();
//     secondOsc.type = "triangle";

//     // Create gain nodes for volume envelope
//     const mainGain = audioContext.createGain();
//     const secondGain = audioContext.createGain();

//     // Set initial frequencies (higher for more ping-like sound)
//     const now = audioContext.currentTime;
//     const startFreq = 1000; // Higher starting frequency for more noticeable ping
//     const endFreq = 600; // Slightly lower end frequency
//     const duration = 0.3; // Shorter duration for snappier ping

//     // Main oscillator frequency sweep
//     mainOsc.frequency.setValueAtTime(startFreq, now);
//     mainOsc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

//     // Second oscillator slightly detuned for richer sound
//     secondOsc.frequency.setValueAtTime(startFreq * 1.5, now);
//     secondOsc.frequency.exponentialRampToValueAtTime(endFreq * 1.5, now + duration);

//     // Volume envelope - quick attack, short decay
//     mainGain.gain.setValueAtTime(0, now);
//     mainGain.gain.linearRampToValueAtTime(0.4, now + 0.05); // Quick attack
//     mainGain.gain.exponentialRampToValueAtTime(0.01, now + duration); // Fast decay

//     secondGain.gain.setValueAtTime(0, now);
//     secondGain.gain.linearRampToValueAtTime(0.2, now + 0.05); // Slightly lower volume for second oscillator
//     secondGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

//     // Connect everything
//     mainOsc.connect(mainGain);
//     secondOsc.connect(secondGain);
//     mainGain.connect(audioContext.destination);
//     secondGain.connect(audioContext.destination);

//     // Start and stop oscillators
//     mainOsc.start();
//     secondOsc.start();

//     // Clean up
//     const stopTime = now + duration + 0.1; // Add small buffer
//     mainOsc.stop(stopTime);
//     secondOsc.stop(stopTime);
//   } catch (error) {
//     console.warn("Could not play notification sound:", error);
//   }
// };

// export { playNotificationSound };

const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create multiple oscillators for rich bell harmonics
    const fundamental = audioContext.createOscillator();
    const harmonic2 = audioContext.createOscillator();
    const harmonic3 = audioContext.createOscillator();
    const harmonic4 = audioContext.createOscillator();

    // Use sine waves for pure, soft tones
    fundamental.type = "sine";
    harmonic2.type = "sine";
    harmonic3.type = "sine";
    harmonic4.type = "sine";

    // Create gain nodes for each oscillator
    const fundamentalGain = audioContext.createGain();
    const harmonic2Gain = audioContext.createGain();
    const harmonic3Gain = audioContext.createGain();
    const harmonic4Gain = audioContext.createGain();

    // Create a master gain for overall volume control
    const masterGain = audioContext.createGain();

    // Bell-like frequency ratios (based on actual bell harmonics)
    const now = audioContext.currentTime;
    const baseFreq = 523.25; // C5 note - pleasant, not too high or low
    const duration = 1.2; // Longer duration for gentle fade

    // Set frequencies with bell-like harmonic relationships
    fundamental.frequency.setValueAtTime(baseFreq, now);
    harmonic2.frequency.setValueAtTime(baseFreq * 2, now); // Octave
    harmonic3.frequency.setValueAtTime(baseFreq * 3, now); // Perfect fifth above octave
    harmonic4.frequency.setValueAtTime(baseFreq * 4, now); // Two octaves

    // Gentle frequency modulation for more organic bell sound
    fundamental.frequency.linearRampToValueAtTime(baseFreq * 0.99, now + duration);
    harmonic2.frequency.linearRampToValueAtTime(baseFreq * 2 * 0.995, now + duration);
    harmonic3.frequency.linearRampToValueAtTime(baseFreq * 3 * 0.992, now + duration);
    harmonic4.frequency.linearRampToValueAtTime(baseFreq * 4 * 0.988, now + duration);

    // Soft envelope with natural bell decay
    // Fundamental (strongest)
    fundamentalGain.gain.setValueAtTime(0, now);
    fundamentalGain.gain.linearRampToValueAtTime(0.3, now + 0.02); // Very quick attack
    fundamentalGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Second harmonic (medium strength)
    harmonic2Gain.gain.setValueAtTime(0, now);
    harmonic2Gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    harmonic2Gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);

    // Third harmonic (weaker, shorter)
    harmonic3Gain.gain.setValueAtTime(0, now);
    harmonic3Gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    harmonic3Gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.6);

    // Fourth harmonic (weakest, shortest)
    harmonic4Gain.gain.setValueAtTime(0, now);
    harmonic4Gain.gain.linearRampToValueAtTime(0.04, now + 0.02);
    harmonic4Gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.4);

    // Master gain for overall gentle volume
    masterGain.gain.setValueAtTime(0.6, now);

    // Connect the audio graph
    fundamental.connect(fundamentalGain);
    harmonic2.connect(harmonic2Gain);
    harmonic3.connect(harmonic3Gain);
    harmonic4.connect(harmonic4Gain);

    fundamentalGain.connect(masterGain);
    harmonic2Gain.connect(masterGain);
    harmonic3Gain.connect(masterGain);
    harmonic4Gain.connect(masterGain);

    masterGain.connect(audioContext.destination);

    // Start all oscillators
    fundamental.start(now);
    harmonic2.start(now);
    harmonic3.start(now);
    harmonic4.start(now);

    // Stop all oscillators with a small buffer
    const stopTime = now + duration + 0.1;
    fundamental.stop(stopTime);
    harmonic2.stop(stopTime);
    harmonic3.stop(stopTime);
    harmonic4.stop(stopTime);
  } catch (error) {
    console.warn("Could not play notification sound:", error);
  }
};

export { playNotificationSound };
