import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const v = cva("relative w-full rounded-lg border p-4 text-sm", { variants: { variant: { default: "bg-muted border-border", destructive: "border-destructive/50 text-destructive bg-destructive/5" } }, defaultVariants: { variant: "default" } });
export const Alert = ({ className, variant, ...p }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof v>) => <div role="alert" className={cn(v({ variant }), className)} {...p} />;
export const AlertTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => <h5 className={cn("mb-1 font-semibold", className)} {...p} />;
export const AlertDescription = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("opacity-90", className)} {...p} />;
