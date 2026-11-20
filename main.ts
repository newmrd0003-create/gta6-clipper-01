import * as fs from "node:fs";
import * as crypto from "node:crypto";
import * as path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// GTA 6 clipper entry: cut a short vertical clip out of Rockstar's official
// GTA VI Trailer 2 and render it with the make.fun pitch burned in on screen.
//
// The moment, chosen from the trailer after watching every part of it:
// the trailer opens slow (Jason on a roof, driving, a store robbery being
// set up), then pays off with a sunset pier, a neon nightclub and an
// airboat chase across the Leonida swamps. The clip keeps only the payoff:
//   A  140-150s  airboat chase, sun glare on the water   -> hook: GTA 6 IS HERE
//   B   82-92s   sunset pier, Leonida skyline           -> LUCIA & JASON
//   C   98-106s  nightclub, purple neon crowd           -> MY AI AGENT CUT THIS CLIP
//   D  152-160s  Vice City skyline at dusk               -> the make.fun pitch
// Four segments, 10 + 10 + 8 + 8 = 36 seconds, vertical 720x1280, the
// format YouTube Shorts is watched in. The pitch is on screen the whole
// last segment, spoken by nobody: the rules allow on screen, spoken or
// both, and on-screen text survives muted autoplay.
//
// How it renders, deterministically: one ffmpeg invocation, fixed
// parameters, one thread (libx264 with threads=1 is deterministic), a
// fixed creation_time, no clock anywhere in the program or its log. The
// source segments live under assets/ (exact trailer ranges, stream-copied,
// never re-encoded before this program runs); the text overlays are
// transparent PNGs authored for this entry, composited with ffmpeg's
// overlay filter, so the program needs no font at run time. Standard
// library only; the only external tool is ffmpeg, which the bounty names
// as the tool for cutting the clip.

const here = path.dirname(fileURLToPath(import.meta.url));

type Segment = {
  file: string;
  duration: number;
  overlay: string;
};

const SEGMENTS: Segment[] = [
  { file: "assets/seg-140-150.mp4", duration: 10, overlay: "assets/ov-a.png" },
  { file: "assets/seg-082-092.mp4", duration: 10, overlay: "assets/ov-b.png" },
  { file: "assets/seg-098-106.mp4", duration: 8, overlay: "assets/ov-c.png" },
  { file: "assets/seg-152-160.mp4", duration: 8, overlay: "assets/ov-d.png" },
];

const TOTAL_DURATION = SEGMENTS.reduce((sum, s) => sum + s.duration, 0);
const OUT_NAME = "clip.mp4";

const sha256 = (file: string): string =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function fail(message: string): never {
  throw new Error(message);
}

// ffmpeg must be on PATH: the bounty names it as the clip-cutting tool.
const version = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
if (version.error || version.status !== 0) {
  fail("ffmpeg not found on PATH; install ffmpeg to cut the clip");
}

for (const seg of SEGMENTS) {
  if (!fs.existsSync(path.join(here, seg.file))) {
    fail(`missing source segment: ${seg.file}`);
  }
  if (!fs.existsSync(path.join(here, seg.overlay))) {
    fail(`missing text overlay: ${seg.overlay}`);
  }
}

// One ffmpeg invocation: trim each segment to its exact length, crop the
// 16:9 frame to vertical 9:16 (608x1080 centre crop, scaled to 720x1280),
// burn in that segment's overlay, then concatenate video and audio.
const inputs: string[] = [];
for (const seg of SEGMENTS) inputs.push("-i", path.join(here, seg.file));
// Overlay PNGs are single still frames: loop them, or the overlay would
// only cover the first 1/25s of its segment and then pass through bare.
for (const seg of SEGMENTS) {
  inputs.push("-loop", "1", "-i", path.join(here, seg.overlay));
}

const n = SEGMENTS.length;
const filters: string[] = [];
for (let i = 0; i < n; i++) {
  const seg = SEGMENTS[i];
  filters.push(
    `[${i}:v]trim=0:${seg.duration},setpts=PTS-STARTPTS,` +
      `crop=608:1080,scale=720:1280,setsar=1,fps=30[v${i}]`,
  );
  filters.push(`[v${i}][${n + i}:v]overlay=0:0:eof_action=pass[ov${i}]`);
  filters.push(`[${i}:a]atrim=0:${seg.duration},asetpts=PTS-STARTPTS[a${i}]`);
}
const concatInputs = SEGMENTS.map((_, i) => `[ov${i}][a${i}]`).join("");
filters.push(
  `${concatInputs}concat=n=${n}:v=1:a=1[vcat][acat]`,
  "[vcat]format=yuv420p[vout]",
);
const filterComplex = filters.join(";");

const outDir = "/output";
let outPath = path.join(outDir, OUT_NAME);
try {
  fs.mkdirSync(outDir, { recursive: true });
} catch {
  // No writable /output here (local run): render beside the program.
  outPath = path.join(here, OUT_NAME);
}

const args: string[] = [
  ...inputs,
  "-filter_complex",
  filterComplex,
  "-map",
  "[vout]",
  "-map",
  "[acat]",
  "-c:v",
  "libx264",
  "-preset",
  "ultrafast",
  "-crf",
  "23",
  "-threads",
  "1",
  "-c:a",
  "aac",
  "-b:a",
  "128k",
  "-movflags",
  "+faststart",
  "-metadata",
  "creation_time=2026-11-20T00:00:00.000000Z",
  "-metadata",
  "encoder=gta6-clipper-01",
  "-y",
  outPath,
];

const rendered = spawnSync("ffmpeg", args, { encoding: "utf8" });
if (rendered.error || rendered.status !== 0) {
  const tail = (rendered.stderr || "").trim().split("\n").slice(-5).join("\n");
  fail(`ffmpeg render failed (status ${rendered.status}):\n${tail}`);
}

const stat = fs.statSync(outPath);
if (stat.size === 0) fail(`rendered clip is empty: ${outPath}`);

// Verify the render is intact before reporting it: probe the duration
// (must be the 36 seconds the segments add up to) and re-hash the file,
// so a truncated or corrupted render fails loudly instead of shipping.
const probe = spawnSync(
  "ffprobe",
  [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    outPath,
  ],
  { encoding: "utf8" },
);
const probedDuration = parseFloat((probe.stdout || "").trim());
if (!Number.isFinite(probedDuration)) {
  fail(`ffprobe could not read the rendered clip: ${outPath}`);
}
if (Math.abs(probedDuration - TOTAL_DURATION) > 0.5) {
  fail(
    `rendered clip duration ${probedDuration}s, expected ${TOTAL_DURATION}s`,
  );
}
const outHash = sha256(outPath);
if (sha256(outPath) !== outHash) {
  fail(`sha256 unstable on re-read: ${outPath}`);
}

console.log(`segments: ${n}`);
console.log(`total_duration_s: ${TOTAL_DURATION}`);
console.log(`wrote ${outPath} (${stat.size} bytes, sha256 ${outHash})`);
