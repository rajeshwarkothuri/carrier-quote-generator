import { cn } from "@/lib/utils";

export const SAMPLES = [
  { id: "a", label: "Sample Profile A (Maya - Eligible)" },
  { id: "b", label: "Sample Profile B (Sam - Ineligible)" },
];
/** Posts to a server action, so the profile never appears in a URL. Works without client JS. */
export function ProfileToggle({ active, action }: { active?: string; action: (fd: FormData) => void | Promise<void> }) {
  return (
    <form action={action} aria-label="Sample profile" className="flex flex-col gap-1 rounded-lg border bg-muted p-1 sm:flex-row">
      {SAMPLES.map((s) => (
        <button key={s.id} name="sample" value={s.id} aria-pressed={active === s.id}
          className={cn("flex-1 rounded-md px-3 py-2 font-sans text-sm transition-colors", active === s.id ? "bg-primary text-primary-foreground" : "hover:bg-background")}>
          {s.label}
        </button>
      ))}
    </form>
  );
}
