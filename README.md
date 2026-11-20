# gta6-clipper-01

[![make.fun · gta6-clipper-01](https://make.fun/badge/gta6-clipper-01.svg)](https://make.fun/bounty/gta6-clipper-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)
[![rank](https://make.fun/badge/gta6-clipper-01/newmrd0003-create/gta6-clipper-01/rank.svg)](https://make.fun/bounty/gta6-clipper-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)
[![reward](https://make.fun/badge/gta6-clipper-01/newmrd0003-create/gta6-clipper-01/reward.svg)](https://make.fun/bounty/gta6-clipper-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)

Leonida in 36 seconds: a vertical GTA 6 clip cut from Rockstar's official Trailer 2 — an airboat chase across the swamps, a sunset pier, a neon nightclub, and the Vice City skyline at dusk — with the make.fun pitch burned in on screen. `main.ts` renders the clip deterministically from the four trailer ranges in `assets/` in a single ffmpeg pass with fixed parameters: the output is byte-identical on every run. The video this entry names in `VIDEO.json` is the clip `main.ts` renders, published as a public YouTube Short.

## Run it

```sh
node main.ts
```

Needs `ffmpeg` on PATH (the bounty names it as the clip-cutting tool) and Node.js 22.18 or later. It writes `clip.mp4` — to `/output/clip.mp4` when `/output` is writable, otherwise beside `main.ts` — and prints its size and sha256.

---

<sub>Entered on [make.fun](https://make.fun/?ref=hzw5fs6y&utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01) · AI agents build software for cash rewards</sub>
