"use client"

import { useEffect, useState } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckIcon, InfoIcon, TriangleAlertIcon, XIcon, Loader2Icon } from "lucide-react"

// shadcn'ning standart varianti next-themes'ga tayanadi; bu loyihada tema <html data-theme>
// atributi orqali boshqariladi (ThemeToggle shuni yozadi), shuning uchun o'sha atribut o'qiladi.
function useDataTheme(): ToasterProps["theme"] {
  const [theme, setTheme] = useState<ToasterProps["theme"]>("dark")
  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark")
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
    return () => observer.disconnect()
  }, [])
  return theme
}

/* Pastel Studio: har bir tur — o'z rangli doirasi */
const Disc = ({ tone, children }: { tone: string; children: React.ReactNode }) => (
  <span className={`inline-flex size-9 items-center justify-center rounded-full ${tone}`}>{children}</span>
)

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useDataTheme()

  return (
    <Sonner
      theme={theme}
      closeButton
      /* Header (≈72px) ustini yopmasin — ostidan chiqadi */
      offset={{ top: 84, right: 24 }}
      mobileOffset={{ top: 72, left: 12, right: 12 }}
      className="toaster group ps-shell"
      icons={{
        success: (
          <Disc tone="bg-[var(--ps-green)] text-white"><CheckIcon className="size-4 stroke-[3]" /></Disc>
        ),
        info: (
          <Disc tone="bg-[var(--ps-purple)] text-white"><InfoIcon className="size-4" /></Disc>
        ),
        warning: (
          <Disc tone="bg-[var(--ps-orange)] text-[#080808]"><TriangleAlertIcon className="size-4" /></Disc>
        ),
        error: (
          <Disc tone="bg-[var(--ps-coral)] text-white"><XIcon className="size-4 stroke-[3]" /></Disc>
        ),
        loading: (
          <Disc tone="bg-[var(--ps-neutral)] text-[var(--ps-purple)]"><Loader2Icon className="size-4 animate-spin" /></Disc>
        ),
        close: <XIcon className="size-3.5" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "relative flex w-full items-center gap-3 rounded-[26px] bg-[var(--ps-paper)] py-2.5 pl-2.5 pr-12 text-[var(--text-primary)] shadow-[0_24px_50px_-22px_rgba(40,20,80,0.6)] ring-1 ring-black/[0.06] dark:ring-white/10 min-h-[56px]",
          icon: "!m-0 shrink-0 !size-9 flex items-center justify-center",
          content: "flex min-w-0 flex-1 flex-col gap-0.5",
          title: "text-[14px] font-bold leading-snug",
          description: "text-[12.5px] font-medium leading-snug text-[var(--text-muted)]",
          actionButton:
            "shrink-0 cursor-pointer rounded-full bg-[#080808] px-3.5 py-2 text-[12px] font-bold text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]",
          cancelButton:
            "shrink-0 cursor-pointer rounded-full bg-[var(--ps-neutral)] px-3.5 py-2 text-[12px] font-bold text-[var(--text-primary)]",
          closeButton:
            "!absolute !left-auto !right-3 !top-1/2 !-translate-y-1/2 !transform-none inline-flex size-7 cursor-pointer items-center justify-center rounded-full bg-[var(--ps-neutral)] text-[var(--text-muted)] transition-colors hover:bg-[#080808] hover:text-[#FFFCF7] dark:hover:bg-[#FFFCF7] dark:hover:text-[#080808]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
