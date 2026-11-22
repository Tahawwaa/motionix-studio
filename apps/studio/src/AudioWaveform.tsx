import { useEffect, useState } from "react";
const cache = new Map<string, Promise<{ peaks: number[]; duration: number }>>();
async function decode(src: string) {
  const r = await fetch(src);
  if (!r.ok) throw new Error("Audio unavailable");
  if (Number(r.headers.get("content-length")) > 25 * 1024 * 1024)
    throw new Error("Waveform preview limit is25MB");
  const buffer = await r.arrayBuffer();
  if (buffer.byteLength > 25 * 1024 * 1024)
    throw new Error("Waveform preview limit is25MB");
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(buffer);
    const data = audio.getChannelData(0);
    const bins = 600,
      block = Math.ceil(data.length / bins);
    const peaks = Array.from({ length: bins }, (_, i) => {
      let max = 0;
      for (
        let n = i * block;
        n < Math.min((i + 1) * block, data.length);
        n += Math.max(1, Math.floor(block / 100))
      )
        max = Math.max(max, Math.abs(data[n]));
      return max;
    });
    return { peaks, duration: audio.duration };
  } finally {
    await context.close();
  }
}
export function AudioWaveform({
  src,
  trimStart,
  duration,
  fps,
}: {
  src: string;
  trimStart: number;
  duration: number;
  fps: number;
}) {
  const [wave, setWave] = useState<{
    peaks: number[];
    duration: number;
  } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    if (!cache.has(src)) cache.set(src, decode(src));
    cache
      .get(src)!
      .then((p) => {
        if (active) setWave(p);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [src]);
  if (!wave)
    return (
      <span className="waveform-status">
        {error ? "Waveform unavailable" : "Reading audio…"}
      </span>
    );
  const from = trimStart / fps / wave.duration,
    to = (trimStart + duration) / fps / wave.duration;
  const samples = 120;
  const max = Math.max(0.01, ...wave.peaks);
  return (
    <svg
      className="audio-waveform"
      viewBox="0 0 240 26"
      preserveAspectRatio="none"
      aria-label="Decoded audio waveform"
    >
      {Array.from({ length: samples }, (_, i) => {
        const peak =
          wave.peaks[
            Math.floor((from + ((to - from) * i) / samples) * wave.peaks.length)
          ] ?? 0;
        const h = Math.max(0.8, (peak / max) * 22);
        return (
          <path
            key={i}
            d={`M${i * 2} ${13 - h / 2}v${h}`}
            stroke="currentColor"
            strokeWidth="1.2"
          />
        );
      })}
    </svg>
  );
}
