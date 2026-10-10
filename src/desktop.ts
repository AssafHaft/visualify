// Renderer half of the Electron build (desktop.js). kaleidosync already analyses live audio for its "Microphone"
// source; on desktop that source gets Windows system audio instead, so it reacts to whatever is playing.
export const isDesktop = navigator.userAgent.includes("Electron");

if (isDesktop) {
  const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async constraints => {
    if (constraints?.video) return getUserMedia(constraints);
    // desktop.js grants this as screen + loopback audio; Chromium won't capture audio alone, so drop the video.
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    for (const track of stream.getVideoTracks()) {
      track.stop();
      stream.removeTrack(track);
    }
    return stream;
  };
}
