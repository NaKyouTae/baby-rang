import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        outline: "text-foreground",
        // 상태 배지는 옅은 바탕 + 진한 글자. 앞에 점을 찍어 색만으로 구분하지 않게 한다.
        success: "border-transparent bg-emerald-500/10 text-emerald-700 before:size-1.5 before:rounded-full before:bg-current",
        warning: "border-transparent bg-amber-500/15 text-amber-700 before:size-1.5 before:rounded-full before:bg-current",
        info: "border-transparent bg-blue-500/10 text-blue-700 before:size-1.5 before:rounded-full before:bg-current",
        purple: "border-transparent bg-violet-500/10 text-violet-700",
        pink: "border-transparent bg-pink-500/10 text-pink-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
