# Hub Music Assets

These tracks are user-provided Wario Synth shares rendered into browser-native MP3 files for the hub music toggle.

| Track | Share link | MIDI source | Runtime audio |
|---|---|---|---|
| Flower of Scotland | https://www.wario.style/s/7u0vk4ok | `flower-of-scotland.mid` | `flower-of-scotland.mp3` |
| Scotland the Brave | https://www.wario.style/s/tw6IWdAL | `scotland-the-brave.mid` | `scotland-the-brave.mp3` |

The `.mid` files are the exact MIDI sources referenced by the share pages. The `.mp3` files were rendered through the Wario Synth player path with `scripts/render-wario-share-audio.mjs`, then compressed with `ffmpeg` at 96 kbps. Runtime playback is explicit opt-in; the hub does not autoplay or preload music on first paint.
