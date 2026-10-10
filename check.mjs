// Smoke check for the desktop build (npm run check). Play something first, e.g. in Spotify: it launches the app and
// asserts that app:// can't escape dist/, that system audio is auto-selected, that real audio drives the visuals,
// and that the track shows up in now playing.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import electron from "electron";
import { shuffleTimer } from "./src/shuffle.ts";

// Shuffle timing, on synthetic audio at 30fps: when (in seconds) a design's timer says to move on, if ever.
const shuffleAt = (random, level) => {
  const due = shuffleTimer(() => random);
  for (let t = 0; t < 200; t += 1 / 30) if (due(1 / 30, level(t))) return t;
};
assert.equal(shuffleAt(0, () => 0), undefined, "shuffle moved on in silence");
assert(Math.abs(shuffleAt(0, () => 50) - 90) < 1, "music that never lifts should move on at 90s");
assert(Math.abs(shuffleAt(0, t => (t < 30 ? 20 : 60)) - 30) < 1, "a lift after the wait should move on right away");
assert(Math.abs(shuffleAt(1, t => (t < 25 ? 20 : 60)) - 90) < 1, "a lift during the wait shouldn't count");
console.log("ok: shuffle timing");

const port = 9339;
const app = spawn(electron, [".", `--remote-debugging-port=${port}`], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));

try {
  let page;
  for (let i = 0; i < 60 && !page; i++, await sleep(250)) {
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json(), () => []);
    page = targets.find(t => t.url.startsWith("app://"));
  }
  assert(page, "app window never loaded");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => (ws.onopen = r));
  const pending = new Map();
  let lastId = 0;
  ws.onmessage = e => {
    const { id, result } = JSON.parse(e.data);
    pending.get(id)?.(result?.result?.value);
  };
  const evaluate = expression =>
    new Promise(resolve => {
      const id = ++lastId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } }));
    });

  const escaped = await evaluate(`fetch("app://visualify/..%5Cpackage.json").then(r => r.text())`);
  assert.match(escaped, /^<!doctype html>/i, "app:// served a file outside dist/");

  const store = name => `document.getElementById("app")._vnode.component.appContext.config.globalProperties.$pinia._s.get("${name}")`;
  const sources = store("sources");
  let source;
  for (let i = 0; i < 40 && source !== 4; i++, await sleep(250)) source = await evaluate(`${sources}.source`);
  assert.equal(source, 4, "system audio (the MICROPHONE source) was not auto-selected");

  const volumes = await evaluate(`(async () => {
    const v = [];
    for (let i = 0; i < 20; i++, await new Promise(r => setTimeout(r, 100))) v.push(${sources}.volume);
    return v;
  })()`);
  assert(new Set(volumes).size > 1, `volume is flat (${volumes[0]}): is anything playing?`);
  console.log("ok: system audio is driving the visualizer");

  let track;
  for (let i = 0; i < 40 && !track?.title; i++, await sleep(250)) track = await evaluate(`fetch("/now-playing").then(r => r.json())`);
  assert(track?.title, "no now playing (media.ps1): is Spotify, or another media app, playing?");
  console.log(`ok: now playing "${track.title}" by ${track.artist}`);

  // Re-picking a design swaps in a new uniforms object, as + does when it saves. That used to leave three.js drawing a
  // stale copy (frozen visuals) until another design was picked.
  const stale = await evaluate(`(async () => {
    const s = ${store("sketches")};
    s.selectSketch(s.sketch);
    await new Promise(r => setTimeout(r, 300));
    const find = vnode => {
      const c = vnode?.component;
      if (c?.exposed?.context && c.parent?.type?.__name === "Renderer") return c.exposed.context.value ?? c.exposed.context;
      for (const child of [c?.subTree, ...(Array.isArray(vnode?.children) ? vnode.children : [])]) if (child) { const r = find(child); if (r) return r; }
    };
    const { renderer, scene } = find(document.getElementById("app")._vnode);
    let material;
    scene.value.traverse(o => o.visible && o.material?.fragmentShader?.includes(s.shader.slice(-200)) && (material = o.material));
    return renderer.value.properties.get(material).uniforms !== material.uniforms;
  })()`);
  assert.equal(stale, false, "three.js is drawing stale uniforms after re-picking a design (frozen visuals)");
  console.log("ok: visuals keep updating after a design's uniforms are replaced");
} finally {
  app.kill();
}
