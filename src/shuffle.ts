// When Shuffle should move on from the current design (one timer per design; components/Renderer.vue).
// After a random 20–50s it waits for a lift in the music, the short-term level jumping above the long-term one
// (a hit, a chorus, a drop), so the change lands with the song. If nothing lifts, it moves on at the next beat
// after 90s. Silence (paused) holds. `level` is the analyser's loudness, any scale; the tuning knobs are below.
const LIFT = 1.5; // short-term / long-term level that counts as a lift (1.3 caught ordinary beats, 2 only song starts)
const MIN_WAIT = 20;
const MAX_WAIT = 90;

export function shuffleTimer(random = Math.random) {
  const wait = MIN_WAIT + random() * 30;
  let elapsed = 0;
  let fast = 0;
  let slow = 0;

  return (seconds: number, level: number) => {
    const dt = Math.min(seconds, 0.1); // the first frame, or one after the window was hidden
    fast += (level - fast) * Math.min(1, dt / 0.3);
    slow += (level - slow) * Math.min(1, dt / 8);
    if (slow < 1) return false;
    elapsed += dt;
    return (elapsed > wait && fast > slow * LIFT) || (elapsed > MAX_WAIT && fast >= slow);
  };
}
