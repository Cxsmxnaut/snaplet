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
        "relative inline-flex items-center gap-3 text-on-surface",
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
      <div className="h-7 w-12 rounded-full border border-outline-variant/50 bg-surface-container-high transition-colors duration-200 peer-checked:border-primary/30 peer-checked:bg-primary/75 peer-focus:ring-2 peer-focus:ring-primary/30" />
      <span className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-surface shadow-sm transition-transform duration-200 ease-in-out peer-checked:translate-x-5" />
      {label ? <span>{label}</span> : null}
    </label>
  );
}
