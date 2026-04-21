import type { Variant } from '../types/workout';

interface Props {
  value: Variant;
  onChange: (v: Variant) => void;
}

const options: { value: Variant; label: string }[] = [
  { value: 'gym', label: 'Gym' },
  { value: 'home', label: 'Home' },
];

export default function VariantToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-full bg-slate-200 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`min-w-[80px] rounded-full px-4 py-1.5 text-sm font-medium transition ${
              active ? 'bg-white text-slate-900 shadow' : 'text-slate-600'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
