// Two plain designs alongside Kaleidosync's 50 (added first in components/Renderer.vue). Like every design they see the
// music as `volume` (loudness, 0–1) and `stream` (a clock that runs faster when it's louder), not per-frequency levels.
// Bar count and equalizer colours are fixed in the shader: Customize sliders drift every few seconds (the "magic"
// animation), and a jumping bar count would look broken.
export const simpleDesigns = [
  {
    // Sine wave: one glowing wave whose height follows the loudness and which flows faster when it's louder.
    shader: `void main() {
  vec2 uv = k_uv();
  float wave = amplitude * (0.1 + volume) * sin(uv.x * frequency + stream * speed);
  vec3 color = 0.5 + 0.5 * cos(6.28318 * (hue + vec3(0., 0.33, 0.67)));
  gl_FragColor = vec4(color * min(glow / abs(uv.y - wave), 4.), 1.);
}`,
    variants: [{ amplitude: { value: 0.5 }, frequency: { value: 6 }, speed: { value: 0.5 }, hue: { value: 0.55 }, glow: { value: 0.012 } }]
  },
  {
    // Equalizer: LED-style bars, green to red, that jump with the loudness, each at its own pace; lower bars run taller.
    shader: `#define BARS 32.

float eqHash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  float i = floor(vUv.x * BARS);
  float t = stream * speed + i * 0.37;
  float wobble = mix(eqHash(i + floor(t) * 7.13), eqHash(i + (floor(t) + 1.) * 7.13), smoothstep(0., 1., fract(t)));
  float level = clamp(height * pow(volume, 0.7) * (0.35 + 0.65 * wobble) * (1.2 - 0.5 * i / BARS), 0.02, 1.);
  float inBar = step(0.12, fract(vUv.x * BARS)) * step(fract(vUv.x * BARS), 0.88);
  float lit = step(vUv.y, level) * step(0.3, fract(vUv.y * 24.));
  vec3 color = mix(vec3(0.1, 0.9, 0.3), vec3(1., 0.85, 0.1), smoothstep(0.3, 0.65, vUv.y));
  color = mix(color, vec3(1., 0.15, 0.15), smoothstep(0.7, 0.95, vUv.y));
  gl_FragColor = vec4(color * inBar * lit, 1.);
}`,
    variants: [{ height: { value: 1.4 }, speed: { value: 2 } }]
  }
];
