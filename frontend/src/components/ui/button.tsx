import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/*
  Botones según Clerk Seed:
  - Todos rounded-md; sombra multicapa con brillo interior en los rellenos.
  - Primario púrpura con un brillo (sheen) que aparece al pasar el cursor.
  - Transiciones explícitas con ease-out-cubic (nunca `transition: all`).
*/
const buttonVariants = cva(
  "group/button relative isolate inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-transparent font-medium whitespace-nowrap select-none transition-[background-color,box-shadow,color,opacity,transform] duration-150 ease-out-cubic active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Primario: púrpura + sheen blanco al hover
        default:
          "bg-primary text-primary-foreground shadow-button after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-linear-to-b after:from-white/20 after:to-transparent after:opacity-60 after:transition-opacity after:duration-300 after:ease-shimmer hover:after:opacity-100 active:bg-purple-600",
        brand:
          "bg-primary text-primary-foreground shadow-button after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-linear-to-b after:from-white/20 after:to-transparent after:opacity-60 after:transition-opacity after:duration-300 after:ease-shimmer hover:after:opacity-100 active:bg-purple-600",
        // Neutro oscuro (gray-900)
        neutral:
          "bg-gray-900 text-white shadow-button-neutral after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-linear-to-b after:from-white/15 after:to-transparent after:opacity-60 after:transition-opacity after:duration-300 after:ease-shimmer hover:after:opacity-100",
        // "Navigation": fondo casi transparente con anillo compuesto
        outline:
          "bg-linear-to-b from-white to-gray-25 text-foreground shadow-nav hover:to-gray-50 hover:text-foreground",
        // Secundario: solo texto púrpura
        secondary: "text-primary hover:text-purple-700",
        ghost: "text-foreground hover:bg-gray-100 duration-100",
        destructive: "bg-destructive-soft text-destructive-foreground hover:bg-[#fde3e3]",
        // Translúcido para fondos oscuros
        glass: "bg-white/10 text-white ring-1 ring-white/15 ring-inset hover:bg-white/15",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[1.875rem] gap-1.5 px-2.5 text-[0.8125rem]",
        xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-[1.625rem] gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-4 text-[0.9375rem]",
        xl: "h-11 gap-2 px-5 text-[0.9375rem]",
        icon: "size-[1.875rem]",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-[1.625rem]",
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
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

/** Flecha triangular de 10×10 que aparece deslizándose al pasar el cursor por el botón */
function ButtonArrow() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 10 10"
      fill="currentColor"
      className="-ml-1.5 size-2.5 -translate-x-1 opacity-0 transition-[margin,opacity,transform] duration-200 ease-bounce group-hover/button:ml-0 group-hover/button:translate-x-0 group-hover/button:opacity-100 motion-reduce:transition-none"
    >
      <path d="M2.5 1.5v7L8 5z" />
    </svg>
  )
}

export { Button, ButtonArrow, buttonVariants }
