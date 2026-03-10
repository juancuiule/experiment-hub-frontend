type Option = { label: string; value: string };

type Props = {
  dataKey: string;
  label: string;
  options: Option[];
  error?: string;
};

export default function Dropdown({ dataKey, label, options, error }: Props) {
  return (
    <div>
      <label htmlFor={dataKey}>{label}</label>
      <select
        id={dataKey}
        name={dataKey}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
      >
        <option value="">Select…</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
