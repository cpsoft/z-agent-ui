function niceStep(raw: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  let step: number;
  if (norm <= 1) step = 1;
  else if (norm <= 2) step = 2;
  else if (norm <= 2.5) step = 2.5;
  else if (norm <= 5) step = 5;
  else step = 10;
  return step * mag;
}

export function niceTicks(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const raw = (max - min) / Math.max(1, count - 1);
  const step = niceStep(raw);
  const first = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = first; v <= max + step * 1e-6; v += step) {
    ticks.push(Number(v.toPrecision(12)));
  }
  if (ticks.length === 0) ticks.push(min);
  return ticks;
}

const TIME_STEPS: Array<[number, number]> = [
  [1_000, 1],
  [5_000, 5],
  [15_000, 15],
  [30_000, 30],
  [60_000, 60],
  [300_000, 300],
  [900_000, 900],
  [1_800_000, 1800],
  [3_600_000, 3600],
  [10_800_000, 10800],
  [21_600_000, 21600],
  [43_200_000, 43200],
  [86_400_000, 86400],
  [604_800_000, 604800],
  [2_592_000_000, 2592000],
  [7_776_000_000, 7776000],
  [15_552_000_000, 15552000],
  [31_104_000_000, 31104000],
  [155_520_000_000, 155520000],
];

export function timeTicks(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const span = max - min;
  const raw = span / Math.max(1, count - 1);
  let step = TIME_STEPS[TIME_STEPS.length - 1][0];
  for (const [ms, _label] of TIME_STEPS) {
    if (ms >= raw) {
      step = ms;
      break;
    }
  }
  const first = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = first; v <= max + step * 1e-6; v += step) {
    ticks.push(v);
  }
  if (ticks.length === 0) ticks.push(min);
  return ticks;
}
