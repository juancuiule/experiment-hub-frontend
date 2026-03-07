type Props = {
  dataKey: string;
  label: string;
  placeholder?: string;
  error?: string;
  inputType?: "text" | "number" | "email" | "date";
};

export default function Input(props: Props) {
  const { dataKey, label, placeholder, error, inputType = "text" } = props;
  return (
    <div>
      <label htmlFor={dataKey}>{label}</label>
      <input
        id={dataKey}
        name={dataKey}
        type={inputType}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
