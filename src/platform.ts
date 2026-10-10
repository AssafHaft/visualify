import { ref } from "vue";

// What kaleidosync's realtime "Microphone" source actually listens to:
// - Desktop (Electron, desktop.js): Windows system audio, always.
// - Browser: the speakers' output via the screen-share picker (desktop Chrome/Edge share a tab's or the whole system's
//   audio), or the microphone, the only option phones give a web page. Set listenTo before selecting the source.
export const isDesktop = navigator.userAgent.includes("Electron");
export const canShareAudio = isDesktop || !!navigator.mediaDevices?.getDisplayMedia;
export const listenTo = ref<"system" | "microphone">("system");

if (navigator.mediaDevices) {
  const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async constraints => {
    if (constraints?.video) return getUserMedia(constraints);
    if (listenTo.value === "microphone") {
      // Music, not a call: echo cancellation, noise suppression and auto gain would flatten it.
      return getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    }
    // desktop.js grants this as screen + loopback audio; a browser asks the user. Chromium won't share audio alone,
    // so drop the video.
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    for (const track of stream.getVideoTracks()) {
      track.stop();
      stream.removeTrack(track);
    }
    if (!stream.getAudioTracks().length) throw new Error("No audio was shared");
    return stream;
  };
}
