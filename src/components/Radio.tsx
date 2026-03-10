type Option = { label: string; value: string };

type Props = {
  dataKey: string;
  label: string;
  options: Option[];
  error?: string;
};

export default function Radio({ dataKey, label, options, error }: Props) {
  return (
    <div>
      <span>{label}</span>
      <div className="mt-2 flex flex-col gap-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2">
            <input type="radio" name={dataKey} value={option.value} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
