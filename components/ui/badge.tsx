import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const v = cva("inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium", { variants: { variant: { default: "bg-muted text-muted-foreground", success: "bg-success/15 text-success", warn: "bg-amber-100 text-amber-900", needed: "bg-destructive/10 text-destructive" } }, defaultVariants: { variant: "default" } });
export const Badge = ({ className, variant, ...p }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof v>) => <span className={cn(v({ variant }), className)} {...p} />;
