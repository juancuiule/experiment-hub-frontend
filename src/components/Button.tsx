import { twMerge } from "tailwind-merge";

type Props = {
  text?: string;
  disabled?: boolean;
};

export default function Button({ text, disabled }: Props) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={twMerge(
        "h-11 px-6 rounded-full font-medium transition-colors",
        "bg-black text-white hover:bg-zinc-700",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {text}
    </button>
  );
}
