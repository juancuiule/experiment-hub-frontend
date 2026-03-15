import { twMerge } from "tailwind-merge";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export function Input(props: Props) {
  return (
    <input
      {...props}
      className={twMerge(
        "border-b border-gray-300 py-1 outline-none bg-transparent w-full placeholder:text-gray-300 focus:border-black transition-colors text-sm",
      )}
    />
  );
}
