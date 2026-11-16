import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border-0 bg-white px-3 py-1.5 text-base shadow-[0_1px_2px_rgb(0_0_0/0.04)] ring-1 ring-black/10 transition-[box-shadow] duration-200 ease-out-cubic outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-gray-400 focus-visible:shadow-[0_0_0_1px_color-mix(in_oklab,black_15%,transparent),0_0_0_4px_color-mix(in_oklab,black_8%,transparent)] focus-visible:ring-0 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:shadow-none disabled:ring-0 disabled:outline-dashed disabled:outline-1 disabled:outline-gray-200 aria-invalid:ring-red-400 md:text-[0.875rem] dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
