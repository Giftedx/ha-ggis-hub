// One-shot music regeneration tool — pnpm rasterize:music
//
// Renders Flower of Scotland and Scotland the Brave to WAV by driving the
// Wario Synth (wario.style) Game Boy engine in a headless Chromium page.
// Output: .tmp/wario-audio/*.wav — convert to MP3 manually: ffmpeg -i foo.wav -q:a 2 foo.mp3
//
// FRAGILE: imports two content-hashed Vite assets from wario.style by their
// build-time paths (/assets/audioUnlock-*.js, /assets/MotifEngine-*.js).
// These hashes change on every wario.style deploy. If the script errors with
// 404s, inspect wario.style's network tab to find the current asset paths and
// update the import() calls below.
//
// MIDI sources: bitmidi.com (proxied via wario.style /api/midi/fetch).
// Not wired into CI — run manually when tracks need to be regenerated.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const OUT_DIR = '.tmp/wario-audio';
const SAMPLE_RATE = 44_100;

const tracks = [
  {
    title: 'flower-of-scotland',
    midiUrl: 'https://bitmidi.com/uploads/46997.mid',
    wavOut: join(OUT_DIR, 'flower-of-scotland.wav'),
  },
  {
    title: 'scotland-the-brave',
    midiUrl: 'https://bitmidi.com/uploads/35295.mid',
    wavOut: join(OUT_DIR, 'scotland-the-brave.wav'),
  },
];

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto('https://www.wario.style/', { waitUntil: 'networkidle' });

  for (const track of tracks) {
    console.log(`[render-wario-share-audio] rendering ${track.title}...`);
    const base64Wav = await page.evaluate(
      async ({ midiUrl, sampleRate }) => {
        const [{ M: MidiProcessor }, { M: MotifEngine }] = await Promise.all([
          import('/assets/audioUnlock-C54PZlYh.js'),
          import('/assets/MotifEngine-CBPa3-eV.js'),
        ]);
        const response = await fetch(`/api/midi/fetch?u=${encodeURIComponent(midiUrl)}`);
        if (!response.ok) {
          throw new Error(`MIDI fetch failed with ${response.status}`);
        }
        const midiBytes = await response.arrayBuffer();
        const midiEvents = MidiProcessor.parseMIDI(midiBytes);
        const engine = new MotifEngine();
        const audioBuffer = await engine.renderOffline(midiEvents, 'procedural', sampleRate);

        function writeString(view, offset, value) {
          for (let i = 0; i < value.length; i += 1) {
            view.setUint8(offset + i, value.charCodeAt(i));
          }
        }

        function encodeWav(buffer) {
          const channelCount = buffer.numberOfChannels;
          const sampleCount = buffer.length;
          const bytesPerSample = 2;
          const blockAlign = channelCount * bytesPerSample;
          const wav = new ArrayBuffer(44 + sampleCount * blockAlign);
          const view = new DataView(wav);
          writeString(view, 0, 'RIFF');
          view.setUint32(4, 36 + sampleCount * blockAlign, true);
          writeString(view, 8, 'WAVE');
          writeString(view, 12, 'fmt ');
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, channelCount, true);
          view.setUint32(24, buffer.sampleRate, true);
          view.setUint32(28, buffer.sampleRate * blockAlign, true);
          view.setUint16(32, blockAlign, true);
          view.setUint16(34, 16, true);
          writeString(view, 36, 'data');
          view.setUint32(40, sampleCount * blockAlign, true);

          const channels = Array.from({ length: channelCount }, (_, index) =>
            buffer.getChannelData(index)
          );
          let offset = 44;
          for (let sample = 0; sample < sampleCount; sample += 1) {
            for (let channel = 0; channel < channelCount; channel += 1) {
              const clamped = Math.max(-1, Math.min(1, channels[channel][sample]));
              view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
              offset += bytesPerSample;
            }
          }
          return wav;
        }

        const bytes = new Uint8Array(encodeWav(audioBuffer));
        let binary = '';
        const chunkSize = 0x8000;
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
        }
        return btoa(binary);
      },
      { midiUrl: track.midiUrl, sampleRate: SAMPLE_RATE }
    );

    await mkdir(dirname(track.wavOut), { recursive: true });
    await writeFile(track.wavOut, Buffer.from(base64Wav, 'base64'));
    console.log(`[render-wario-share-audio] wrote ${track.wavOut}`);
  }
} finally {
  await browser.close();
}
