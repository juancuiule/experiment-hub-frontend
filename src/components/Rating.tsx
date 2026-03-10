type Props = {
  dataKey: string;
  label: string;
  max: number;
  error?: string;
};

export default function Rating({ dataKey, label, max, error }: Props) {
  return (
    <div>
      <p>{label}</p>
      <div className="flex gap-4 mt-2">
        {Array.from({ length: max }, (_, i) => (
          <label key={i} className="flex items-center gap-1">
            <input type="radio" name={dataKey} value={i + 1} />
            {i + 1}
          </label>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
