// Visualify, the Electron shell for Kaleidosync: serves the Vite build (dist/) and feeds its realtime analyser Windows
// system audio, so it visualizes whatever is playing, e.g. the Spotify desktop app. Renderer half: src/desktop.ts.
import { app, BrowserWindow, desktopCapturer, net, protocol, session, shell } from "electron";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

const dist = path.join(import.meta.dirname, "dist");

// What Spotify (or the current media app) is playing, and its controls, via Windows' media session API: see media.ps1.
let nowPlaying = null;
const script = Buffer.from(readFileSync(path.join(import.meta.dirname, "media.ps1"), "utf8"), "utf16le").toString("base64");
const media = spawn(
  path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
  ["-NoProfile", "-NonInteractive", "-EncodedCommand", script],
  { stdio: ["pipe", "pipe", "ignore"] }
);
// If PowerShell is missing or dies, the visualizer just runs without now playing.
media.on("error", () => {});
media.stdin.on("error", () => {});
createInterface({ input: media.stdout }).on("line", line => {
  try {
    nowPlaying = JSON.parse(line);
  } catch {}
});

// Each variant thumbnail on the design page is its own WebGL context. Past Chromium's default of 16, it drops the oldest,
// which is the main visualizer. ponytail: one design would now need ~60 saved variants; draw thumbnails as images if so.
app.commandLine.appendSwitch("max-active-webgl-contexts", "64");

// The app routes on location.pathname and needs a secure context for audio capture, so serve it from app://, not file://.
protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

app.whenReady().then(() => {
  protocol.handle("app", req => {
    const { pathname } = new URL(req.url);
    // For src/components/NowPlaying.vue: GET the track, POST /now-playing/toggle|next|previous (media.ps1 ignores the rest).
    if (pathname === "/now-playing") return Response.json(nowPlaying);
    if (req.method === "POST" && pathname.startsWith("/now-playing/")) {
      media.stdin.write(`${pathname.slice("/now-playing/".length)}\n`);
      return new Response(null, { status: 204 });
    }

    const file = path.join(dist, decodeURIComponent(pathname));
    const isFile = file.startsWith(dist + path.sep) && existsSync(file) && statSync(file).isFile();
    return net.fetch(pathToFileURL(isFile ? file : path.join(dist, "index.html")).href); // anything else is an SPA route
  });

  // getDisplayMedia() gets the screen (Chromium insists on video; the page drops it) plus WASAPI loopback system audio.
  session.defaultSession.setDisplayMediaRequestHandler((_req, grant) => {
    desktopCapturer.getSources({ types: ["screen"] }).then(([screen]) => grant({ video: screen, audio: "loopback" }));
  });

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#000",
    autoHideMenuBar: true,
    icon: path.join(dist, "favicon.png"),
    webPreferences: { autoplayPolicy: "no-user-gesture-required" }
  });
  // Stay on the bundled app; real links open in the browser.
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("app://")) e.preventDefault();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  win.loadURL("app://visualify/visualizer");
});
