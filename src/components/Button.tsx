type Props = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  variant?: "primary" | "secondary";
};

export default function Button({
  children,
  onClick,
  disabled,
  type = "button",
  variant = "primary",
}: Props) {
  const base =
    "h-11 px-6 rounded-full font-medium transition-colors disabled:opacity-40";
  const styles =
    variant === "primary"
      ? "bg-black text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      : "border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles}`}
    >
      {children}
    </button>
  );
}
