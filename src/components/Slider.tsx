type Props = {
  dataKey: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  minLabel?: string;
  maxLabel?: string;
  error?: string;
};

export default function Slider({
  dataKey,
  label,
  min = 0,
  max = 100,
  step = 1,
  defaultValue,
  minLabel,
  maxLabel,
  error,
}: Props) {
  return (
    <div>
      <label htmlFor={dataKey}>{label}</label>
      <input
        id={dataKey}
        name={dataKey}
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue ?? min}
        className="mt-1 block w-full"
      />
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-sm text-gray-500 mt-1">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
