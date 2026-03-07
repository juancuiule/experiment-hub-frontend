type Props = {
  dataKey: string;
  label: string;
  options: { value: string; label: string }[];
  error?: string;
};

export default function CheckboxGroup(props: Props) {
  const { dataKey, label, options, error } = props;
  return (
    <div>
      <span>{label}</span>
      {options.map((option) => (
        <label
          key={`${dataKey}-${option.value}`}
          className="flex items-center space-x-2"
        >
          <input type="checkbox" name={dataKey} value={option.value} />
          <span>{option.label}</span>
        </label>
      ))}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
