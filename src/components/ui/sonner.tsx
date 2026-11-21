import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

import { M3Icon } from "@/components/ui/material3"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <M3Icon name="check_circle" filled className="text-[18px]" />,
        info: <M3Icon name="info" filled className="text-[18px]" />,
        warning: <M3Icon name="warning" filled className="text-[18px]" />,
        error: <M3Icon name="error" filled className="text-[18px]" />,
        loading: <M3Icon name="progress_activity" className="animate-spin text-[18px]" />,
      }}
      style={
        {
          "--normal-bg": "var(--surface-container-high)",
          "--normal-text": "var(--on-surface)",
          "--normal-border": "var(--outline-variant)",
          "--border-radius": "1.25rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
