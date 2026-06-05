# Life OS — intro video (Remotion)

The marketing/intro video shown on the [landing page](../marketing) (the
**"See it in motion"** section). Built with [Remotion](https://remotion.dev) so
it's all code — edit the React scenes and re-render.

- **22s · 1920×1080 · 30fps**, matched to the landing page's dark palette.
- Seven scenes: intro → "one app" feature wall → Finance → Agentic AI →
  Habits & focus → Private/Vault → CTA. See `src/LifeOSIntro.tsx`.

## Edit & preview

```bash
cd video
npm install
npm run studio      # live Remotion Studio at localhost:3000
```

## Re-render

```bash
npm run render      # → out/life-os.mp4  (downloads a headless Chrome on first run)
npm run still       # → out/poster.jpg   (frame 70, used as the <video> poster)
```

Then copy the outputs into the site and rebuild:

```bash
cp out/life-os.mp4        ../marketing/public/life-os.mp4
cp out/poster.jpg         ../marketing/public/life-os-poster.jpg
cd ../marketing && npm run build
```

## Files

| File | What |
| --- | --- |
| `src/Root.tsx` | Composition registration (id `LifeOSIntro`, 660 frames) |
| `src/LifeOSIntro.tsx` | The seven scenes + the sequence timeline |
| `src/components.tsx` | Background, logo, glass cards, motion helpers |
| `src/theme.ts` | Palette (mirrors the landing page) + font (Inter ≈ Geist) |

The video is silent by design — it plays as a muted, autoplaying loop in the
hero. Drop an audio track into `LifeOSIntro` with `<Audio src={staticFile(...)} />`
if you want sound.
