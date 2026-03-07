type Props = {
  dataKey: string;
  label: string;
  scale: number;
  error?: string;
};

export default function Rating(props: Props) {
  const { dataKey, label, scale, error } = props;

  return (
    <div>
      <p>{label}</p>
      <div className="flex gap-4 mt-2">
        {Array.from({ length: scale }, (_, i) => (
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
