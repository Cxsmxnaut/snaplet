import { cn } from "@/lib/utils";

type ToggleSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  label?: string;
  id?: string;
  disabled?: boolean;
};

export default function ToggleSwitch({
  checked,
  onCheckedChange,
  className,
  label,
  id,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <label
      className={cn(
        "relative inline-flex items-center gap-3 text-gray-900",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      <div className="h-7 w-12 rounded-full bg-slate-300 ring-offset-1 transition-colors duration-200 peer-checked:bg-indigo-600 peer-focus:ring-2 peer-focus:ring-indigo-500 dark:bg-slate-600 dark:peer-checked:bg-primary" />
      <span className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out peer-checked:translate-x-5" />
      {label ? <span>{label}</span> : null}
    </label>
  );
}
