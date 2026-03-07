import { twMerge } from "tailwind-merge";

type Props = {
  label: string;
};

export default function Button({ label }: Props) {
  return (
    <button
      type={"submit"}
      className={twMerge(
        "h-11 px-6 rounded-full font-medium transition-colors",
        "bg-black text-white hover:bg-zinc-700",
      )}
    >
      {label}
    </button>
  );
}
