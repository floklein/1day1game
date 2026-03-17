"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[1rem] border bg-clip-padding text-sm font-semibold uppercase tracking-[0.14em] whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-[#ffd37a]/35 bg-[#ffb000] text-[#09111b] shadow-[0_14px_40px_rgba(255,176,0,0.22)] hover:-translate-y-0.5 hover:bg-[#ffc247]",
        outline:
          "border-[#4bb5c9]/35 bg-[#0d1724]/85 text-[#dce9ff] hover:border-[#59e1ff]/55 hover:bg-[#122033] aria-expanded:bg-[#122033] aria-expanded:text-[#f6f7fb]",
        secondary:
          "border-[#23344c] bg-[#131f31] text-[#dce9ff] hover:bg-[#1a2940] aria-expanded:bg-[#1a2940] aria-expanded:text-[#f6f7fb]",
        ghost:
          "border-transparent bg-transparent text-[#dce9ff] hover:bg-white/5 hover:text-[#f6f7fb] aria-expanded:bg-white/5 aria-expanded:text-[#f6f7fb]",
        destructive:
          "border-[#ff94a0]/25 bg-[#3a1018] text-[#ffd8dd] hover:bg-[#4a1520] focus-visible:border-[#ff6b7a]/40 focus-visible:ring-[#ff6b7a]/20 dark:focus-visible:ring-[#ff6b7a]/40",
        link: "border-transparent p-0 text-[#59e1ff] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 px-2.5 text-[11px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1 px-3.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-12 gap-2 px-5 text-sm has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
