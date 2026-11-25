// music-lab.html (dev only, not in the build): listen to a track, mute voices, watch a pixel oscilloscope.
import { ChipPlayer, VOICES, flatten } from './chip';
import type { Track } from './chip';
import { TRACKS } from './tracks';

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} is missing`);
  return el;
};

const first = TRACKS[0];
if (!first) throw new Error('no tracks');
const track: Track = first;
const flat = flatten(track);
let player: ChipPlayer | null = null;
const muted = new Set<string>();

$('title').textContent = track.title;
const seconds = (flat.length * 60) / track.bpm / 4;
$('sub').textContent = `${track.artist} · ${String(track.bpm)} BPM · ${String(Math.round(seconds))} s, looped`;

const fmt = (s: number): string => `${String(Math.floor(s / 60))}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function ensure(): ChipPlayer {
  player ??= new ChipPlayer();
  return player;
}

$('play').addEventListener('click', () => {
  const p = ensure();
  void p.play(track).then(() => {
    for (const v of muted) p.mute(v as (typeof VOICES)[number], true);
  });
});
$('stop').addEventListener('click', () => {
  player?.stop();
});

/** 16-bit PCM WAV of a rendered buffer. */
function wav(buf: AudioBuffer): Blob {
  const ch = buf.numberOfChannels;
  const n = buf.length;
  const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (o: number, t: string): void => {
    for (let i = 0; i < t.length; i++) out.setUint8(o + i, t.charCodeAt(i));
  };
  str(0, 'RIFF');
  out.setUint32(4, 36 + n * ch * 2, true);
  str(8, 'WAVEfmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, ch, true);
  out.setUint32(24, buf.sampleRate, true);
  out.setUint32(28, buf.sampleRate * ch * 2, true);
  out.setUint16(32, ch * 2, true);
  out.setUint16(34, 16, true);
  str(36, 'data');
  out.setUint32(40, n * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  for (let i = 0; i < n; i++)
    chans.forEach((d, c) => {
      const v = Math.max(-1, Math.min(1, d[i] ?? 0));
      out.setInt16(44 + (i * ch + c) * 2, v * 0x7fff, true);
    });
  return new Blob([out.buffer], { type: 'audio/wav' });
}

/** Peak and loudness (RMS, dBFS) of each section of a rendered pass: a check without ears. */
export async function levels(): Promise<{ name: string; peak: number; rms: number }[]> {
  const buf = await ChipPlayer.render(track);
  const d = buf.getChannelData(0);
  const sd = 60 / track.bpm / 4;
  return flat.marks.map((m, i) => {
    const a = Math.floor((0.05 + m.step * sd) * buf.sampleRate);
    const b = Math.floor((0.05 + (flat.marks[i + 1]?.step ?? flat.length) * sd) * buf.sampleRate);
    let peak = 0;
    let sum = 0;
    for (let j = a; j < b; j++) {
      const v = d[j] ?? 0;
      peak = Math.max(peak, Math.abs(v));
      sum += v * v;
    }
    const db = (x: number): number => Math.round(20 * Math.log10(Math.max(x, 1e-9)) * 10) / 10;
    return { name: m.name, peak: db(peak), rms: db(Math.sqrt(sum / Math.max(1, b - a))) };
  });
}
(window as unknown as { levels: typeof levels }).levels = levels;

const dl = document.createElement('button');
dl.type = 'button';
dl.textContent = '⬇ wav';
dl.addEventListener('click', () => {
  dl.disabled = true;
  void ChipPlayer.render(track).then((buf) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(wav(buf));
    a.download = `${track.title}.wav`;
    a.click();
    dl.disabled = false;
  });
});
$('stop').after(dl);

for (const v of VOICES) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = v;
  b.addEventListener('click', () => {
    const off = !muted.has(v);
    if (off) muted.add(v);
    else muted.delete(v);
    b.classList.toggle('off', off);
    player?.mute(v, off);
  });
  $('mutes').appendChild(b);
}

const cv = $('scope') as HTMLCanvasElement;
const g = cv.getContext('2d');
const data = new Uint8Array(1024);

function draw(): void {
  requestAnimationFrame(draw);
  if (!g) return;
  g.fillStyle = '#061008';
  g.fillRect(0, 0, cv.width, cv.height);
  const p = player;
  if (!p?.playing) return;
  p.analyser.getByteTimeDomainData(data);
  g.fillStyle = '#7dff8a';
  for (let x = 0; x < cv.width; x++) {
    const v = data[Math.floor((x / cv.width) * data.length)] ?? 128;
    const y = Math.round(((255 - v) / 255) * (cv.height - 1));
    g.fillRect(x, y, 1, 1);
  }
  const step = p.position;
  const mark = [...flat.marks].reverse().find((m) => m.step <= step);
  $('section').textContent = mark?.name ?? '';
  $('time').textContent = `${fmt(step * p.stepDur)} / ${fmt(seconds)}`;
  $('progress').style.width = `${String((step / flat.length) * 100)}%`;
}
draw();
