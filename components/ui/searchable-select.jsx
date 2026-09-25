"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, LoaderCircle, Search } from "lucide-react";

export function SearchableSelect({ value, onChange, options = [], searchValue = "", onSearchChange, placeholder = "Search and select…", emptyMessage = "No matches found.", disabled = false, loading = false, required = false, id, className = "" }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listId = `${inputId}-listbox`;
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = options.find(([key]) => String(key) === String(value));
  const displayValue = open ? searchValue : (selected?.[1] || searchValue);

  useEffect(() => {
    const close = (event) => !rootRef.current?.contains(event.target) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  function select([key, label]) { onChange(String(key)); onSearchChange?.(label); inputRef.current?.setCustomValidity(""); setOpen(false); }
  function handleKeyDown(event) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((i) => open ? Math.min(i + 1, options.length - 1) : 0); setOpen(true); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (event.key === "Enter" && open && options[activeIndex]) { event.preventDefault(); select(options[activeIndex]); }
    else if (event.key === "Escape") setOpen(false);
  }

  return <div ref={rootRef} className={`relative ${className}`}>
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input ref={inputRef} id={inputId} type="text" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-required={required} required={required} disabled={disabled} value={displayValue} placeholder={placeholder} autoComplete="off" onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onKeyDown={handleKeyDown} onInvalid={(event) => { if (!value) event.currentTarget.setCustomValidity("Please select an option from the list."); }} onChange={(event) => { if (value) onChange(""); if (required) event.currentTarget.setCustomValidity("Please select an option from the list."); onSearchChange?.(event.target.value); setActiveIndex(0); setOpen(true); }} className="h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
      <button type="button" tabIndex={-1} disabled={disabled} aria-label="Toggle options" onClick={() => setOpen((current) => !current)} className="absolute right-0 top-0 flex h-11 w-10 items-center justify-center text-slate-400">{loading ? <LoaderCircle className="size-4 animate-spin" /> : <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />}</button>
    </div>
    {open && !disabled && <div id={listId} role="listbox" className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-600 dark:bg-slate-900">
      {options.length ? options.map((option, index) => <button key={option[0]} type="button" role="option" aria-selected={String(value) === String(option[0])} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => select(option)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm ${index === activeIndex ? "bg-cyan-50 text-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-100" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"}`}><Check className={`size-4 shrink-0 ${String(value) === String(option[0]) ? "opacity-100" : "opacity-0"}`} /><span className="truncate">{option[1]}</span></button>) : <p className="px-3 py-4 text-center text-sm text-slate-500">{loading ? "Searching…" : emptyMessage}</p>}
    </div>}
  </div>;
}
