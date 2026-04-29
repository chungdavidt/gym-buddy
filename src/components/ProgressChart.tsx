import type { Units } from '../types/workout';
import type { ProgressPoint } from '../utils/progress';

interface Props {
  data: ProgressPoint[];
  units: Units;
  exerciseType: 'weighted' | 'bodyweight';
}

const VIEWBOX_W = 200;
const VIEWBOX_H = 60;
const PAD_X = 4;
const PAD_Y = 6;

function formatValue(
  value: number,
  exerciseType: 'weighted' | 'bodyweight',
  units: Units,
): string {
  if (exerciseType === 'weighted') return `~${value} ${units}`;
  return `${value} reps`;
}

function mapY(value: number, min: number, max: number, h: number): number {
  if (max === min) return h / 2;
  const ratio = (value - min) / (max - min);
  return h - PAD_Y - ratio * (h - 2 * PAD_Y);
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function ProgressChart({ data, units, exerciseType }: Props) {
  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const xs = data.map((_, i) => {
    if (data.length === 1) return VIEWBOX_W / 2;
    return PAD_X + (i * (VIEWBOX_W - 2 * PAD_X)) / (data.length - 1);
  });
  const ys = data.map((p) => mapY(p.value, min, max, VIEWBOX_H));
  const points = xs.map((x, i) => `${x},${ys[i]}`).join(' ');

  return (
    <div className="mt-3">
      <div className="flex items-stretch gap-2">
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          preserveAspectRatio="none"
          className="h-32 flex-1 text-indigo-500"
        >
          {data.length > 1 && (
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              points={points}
            />
          )}
          {xs.map((x, i) => (
            <circle
              key={i}
              cx={x}
              cy={ys[i]}
              r={2}
              fill="currentColor"
              className="text-indigo-600"
            />
          ))}
        </svg>
        <div className="flex w-14 flex-col justify-between py-1 text-right text-[10px] tabular-nums text-slate-500">
          <span>{formatValue(max, exerciseType, units)}</span>
          {min !== max && <span>{formatValue(min, exerciseType, units)}</span>}
        </div>
      </div>
      <div className="mt-1 flex justify-between pr-16 text-[10px] text-slate-500">
        <span>{formatDate(data[0].date)}</span>
        {data.length > 1 && (
          <span>{formatDate(data[data.length - 1].date)}</span>
        )}
      </div>
    </div>
  );
}
