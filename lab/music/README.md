# lab/music

A NES-style synthesizer on Web Audio: pulse waves with 12.5 / 25 / 50 % duty, the 4-bit stepped triangle and LFSR
noise, each built from the chip's real stepped waveform. It is a sketch for writing 8-bit tracks for the room as notes
(a few kilobytes of TypeScript instead of an audio file).

It is not shipped: the production build takes `index.html` only, and nothing in `src/` imports from here. The room
currently plays the lofi loop from `public/music/`.

- `chip.ts`: the synthesizer (`ChipPlayer`) and the track format (`Track`, `Section`, `Note`)
- `tracks.ts`: the tracks, written as notes
- `lab.ts`, `index.html`: a page to listen to a track, mute voices and watch a pixel oscilloscope

```sh
npm run dev   # then open http://127.0.0.1:5173/lab/music/
```
