import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: number;
}

/**
 * Minimal CSS spinner: a circular border with one colored arc that rotates.
 * Used inline next to loading text.
 */
export function Spinner({ className, size = 20 }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent align-[-0.2em]",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
