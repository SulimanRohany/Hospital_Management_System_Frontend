"use client"

import * as React from "react"
import { enUS, faIR } from "date-fns/locale"
import { CalendarDays, X } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useLanguage } from "@/components/language-provider"

const pashtoLocale = {
  ...enUS,
  code: "ps-AF",
  localize: {
    ...enUS.localize,
    month: (month) => new Intl.DateTimeFormat("ps-AF-u-ca-gregory-nu-latn", { month: "long" }).format(new Date(2020, month, 1)),
    day: (day) => new Intl.DateTimeFormat("ps-AF-u-ca-gregory-nu-latn", { weekday: "short" }).format(new Date(2020, 5, 7 + day)),
  },
}

function localizedDate(date, language) {
  const months = {
    ps: ["جنوري", "فبروري", "مارچ", "اپرېل", "مې", "جون", "جولای", "اګست", "سېپتمبر", "اکتوبر", "نومبر", "دسمبر"],
    fa: ["جنوری", "فبروری", "مارچ", "اپریل", "می", "جون", "جولای", "اگست", "سپتمبر", "اکتوبر", "نومبر", "دسمبر"],
  }
  if (language === "ps") return `${date.getFullYear()} ${months.ps[date.getMonth()]} ${date.getDate()}`
  if (language === "fa") return `${date.getDate()} ${months.fa[date.getMonth()]} ${date.getFullYear()}`
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(date)
}

function parseDate(value) {
  if (!value) return undefined
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number)
  if (!year || !month || !day) return undefined
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function serializeDate(date) {
  if (!date) return ""
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function DatePicker({ value = "", onChange, className, placeholder = "Select date", min, max, disabled, required, name, id, "aria-label": ariaLabel }) {
  const { language } = useLanguage()
  const [open, setOpen] = React.useState(false)
  const selected = parseDate(value)
  const minDate = parseDate(min)
  const maxDate = parseDate(max)
  const disabledDays = [...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]

  function select(date) {
    onChange?.(serializeDate(date))
    setOpen(false)
  }

  return (
    <div className={cn("relative w-full", className)}>
      {name && <input type="hidden" name={name} value={value || ""} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger id={id} disabled={disabled} aria-label={ariaLabel || placeholder} aria-required={required || undefined} render={<Button type="button" variant="outline" className={cn("h-[2.75rem] w-full justify-start gap-2 bg-background px-3 text-left font-normal shadow-xs", !selected && "text-muted-foreground")} />}>
          <CalendarDays className="size-4 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{selected ? localizedDate(selected, language) : placeholder}</span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar locale={language === "fa" ? faIR : language === "ps" ? pashtoLocale : enUS} mode="single" selected={selected} onSelect={select} defaultMonth={selected || maxDate || new Date()} disabled={disabledDays.length ? disabledDays : undefined} captionLayout="dropdown" startMonth={minDate || new Date(1900, 0)} endMonth={maxDate || new Date(2100, 11)} autoFocus />
          {selected && !required && <div className="border-t p-2"><Button type="button" variant="ghost" size="sm" className="w-full justify-center text-muted-foreground" onClick={() => select(undefined)}><X />Clear date</Button></div>}
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { DatePicker }
