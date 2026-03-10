type Props = {
  dataKey: string;
  label: string;
  defaultValue?: boolean;
  error?: string;
};

export default function SingleCheckbox({ dataKey, label, defaultValue, error }: Props) {
  return (
    <div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name={dataKey}
          value="true"
          defaultChecked={defaultValue}
        />
        <span>{label}</span>
      </label>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
