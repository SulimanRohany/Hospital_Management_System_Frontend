"use client";

import { useEffect, useState } from "react";
import { AlertCircle, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { hasRole } from "@/lib/roles";
import { 
  api, 
  Field, 
  formatDate, 
  inputError, 
  Modal, 
  money, 
  qty, 
  readableErrors, 
  rows, 
  Select, 
  Textarea, 
  today 
} from "@/components/pharmacy-ui";

const post = (path, payload, method = "POST") => 
  api(path, { 
    method, 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify(payload) 
  });

async function lookupDuplicateCandidates({ fetcher, endpoint, ownId, fieldNames, value }) {
  const search = String(value || "").trim();
  if (!search) return [];

  try {
    const data = await fetcher(`${endpoint}/?search=${encodeURIComponent(search)}&page_size=20`);
    return rows(data).filter((record) => {
      if (ownId && record.id === ownId) return false;
      return fieldNames.some((field) => {
        const candidate = String(record[field] ?? "").trim();
        return candidate && candidate.localeCompare(search, undefined, { sensitivity: "base" }) === 0;
      });
    });
  } catch {
    return [];
  }
}

function DuplicateResolutionAlert({ title, message, matches, onOpenExisting, onDismiss }) {
  if (!matches?.length) return null;

  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      <AlertCircle className="text-amber-700 dark:text-amber-300" />
      <AlertDescription>
        <strong className="block text-amber-900 dark:text-amber-200">{title}</strong>
        <p className="mt-1 text-sm">{message}</p>
        <ul className="mt-2 space-y-2">
          {matches.slice(0, 5).map((match) => (
            <li key={match.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white/80 px-2.5 py-2 dark:border-amber-700 dark:bg-slate-900/40">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {match.name || match.code || match.title || match.invoice_number || "Existing record"}
                {match.code ? <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{match.code}</span> : null}
              </span>
              {onOpenExisting && (
                <Button type="button" size="sm" variant="outline" onClick={() => onOpenExisting(match)}>
                  Open
                </Button>
              )}
            </li>
          ))}
        </ul>
        {onDismiss && (
          <button type="button" className="mt-3 text-sm font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100" onClick={onDismiss}>
            Keep editing
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function SaleForm({ user, onClose, onSaved }) {
  const [medicines, setMedicines] = useState([]);
  const [patients, setPatients] = useState([]);
  const [cart, setCart] = useState([]);
  const [medicine, setMedicine] = useState("");
  const [quantity, setQuantity] = useState("1.000");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ 
    patient: "", 
    prescription_reference: "", 
    discount_amount: "0.00", 
    discount_reason: "" 
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      api(`medicines/?search=${encodeURIComponent(query)}&ordering=name`)
        .then((d) => setMedicines(rows(d)))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    api("patients/?is_active=true&ordering=first_name")
      .then((d) => setPatients(rows(d)))
      .catch(() => setPatients([]));
  }, []);

  const subtotal = cart.reduce((sum, line) => 
    sum + Number(line.quantity) * Number(line.unit_price), 0);
  const discount = Number(form.discount_amount || 0);
  const total = Math.max(0, subtotal - discount);
  const needsRx = cart.some((line) => line.requires_prescription);

  async function allocate() {
    if (!medicine || Number(quantity) <= 0) return;
    
    if (cart.some((line) => line.medicine === medicine)) {
      setError(new Error("This medicine is already in the sale. Remove it before allocating a different quantity."));
      return;
    }
    
    setAllocating(true);
    setError(null);
    
    try {
      const selected = medicines.find((m) => m.id === medicine);
      const data = await post("sales/fefo-allocation/", { medicine, quantity });
      
      setCart((current) => [
        ...current, 
        ...data.allocations.map((a) => ({ 
          ...a, 
          medicine, 
          medicine_name: selected?.name, 
          requires_prescription: selected?.requires_prescription 
        }))
      ]);
      
      setMedicine("");
      setQuery("");
      setQuantity("1.000");
    } catch (e) {
      setError(e);
    } finally {
      setAllocating(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      await post("sales/", {
        ...form,
        patient: form.patient || null,
        sale_date: new Date().toISOString(),
        discount_amount: discount.toFixed(2),
        paid_amount: total.toFixed(2),
        lines: cart.map(({ batch, quantity: q, unit_price }) => ({ 
          batch, 
          quantity: q, 
          unit_price 
        }))
      });
      onSaved();
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal 
      title="New pharmacy sale" 
      subtitle="Stock is allocated by earliest expiry first (FEFO)." 
      onClose={onClose} 
      wide
    >
      <form onSubmit={submit} className="space-y-6">
        {error && <FormError error={error} />}

        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 p-4 sm:p-5">
          <h3 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">
            Add medicine
          </h3>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Search inventory, choose an item, then enter the quantity to allocate.</p>
          <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
            <Field label="Medicine">
              <SearchableSelect
                value={medicine} 
                onChange={setMedicine} 
                searchValue={query}
                onSearchChange={setQuery}
                placeholder="Search by code, name, generic name, or strength…"
                options={medicines
                  .filter((m) => m.is_active && !cart.some((line) => line.medicine === m.id))
                  .map((m) => [
                    m.id, 
                    `${m.name}${m.strength ? ` ${m.strength}` : ""} · ${qty(m.stock_quantity)} available${m.requires_prescription ? " · Rx" : ""}`
                  ])
                }
              />
            </Field>
            <Field label="Quantity">
              <Input 
                type="number" 
                min="0.001" 
                step="0.001" 
                placeholder="e.g. 1.000"
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)} 
              />
            </Field>
            <Button 
              type="button" 
              className="px-4"
              disabled={!medicine || allocating} 
              onClick={allocate}
            >
              {allocating ? <LoaderCircle className="animate-spin" /> : <Plus />}
              Allocate
            </Button>
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">
            Allocated batches
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="pharmacy-table w-full min-w-[650px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="p-3">Medicine / batch</th>
                  <th className="p-3">Expiry</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Unit price</th>
                  <th className="p-3">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {!cart.length ? (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-muted-foreground">
                      Add at least one medicine.
                    </td>
                  </tr>
                ) : (
                  cart.map((line, i) => (
                    <tr className="border-t" key={`${line.batch}-${i}`}>
                      <td className="p-3">
                        <strong>{line.medicine_name}</strong>
                        <small className="block text-muted-foreground">
                          {line.batch_number}
                          {line.requires_prescription ? " · Prescription" : ""}
                        </small>
                      </td>
                      <td className="p-3">
                        {formatDate(line.expiry_date)}
                      </td>
                      <td className="p-3">
                        {qty(line.quantity)}
                      </td>
                      <td className="p-3">
                        {hasRole(user, "administrator") ? (
                          <Input 
                            className="w-28" 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            value={line.unit_price} 
                            onChange={(e) => setCart(cart.map((x, j) => 
                              j === i ? { ...x, unit_price: e.target.value } : x
                            ))} 
                          />
                        ) : (
                          `AFN ${money(line.unit_price)}`
                        )}
                      </td>
                      <td className="p-3 font-medium">
                        AFN {money(Number(line.quantity) * Number(line.unit_price))}
                      </td>
                      <td className="p-3">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          aria-label={`Remove ${line.medicine_name}`}
                          title="Remove line"
                          onClick={() => setCart(cart.filter((_, j) => j !== i))}
                        >
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/70 p-4 md:grid-cols-2">
          <Field 
            label={`Patient ${needsRx ? "(required)" : "(optional)"}`} 
            error={inputError(error, "patient")}
          >
            <Select 
              required={needsRx}
              value={form.patient} 
              onChange={(v) => setForm({ ...form, patient: v })} 
              placeholder="Walk-in / select patient" 
              options={patients.map((p) => [
                p.id, 
                `${p.full_name} · ${p.medical_record_number}`
              ])} 
            />
          </Field>
          
          <Field 
            label={`Prescription reference ${needsRx ? "(required)" : ""}`} 
            error={inputError(error, "prescription_reference")}
          >
            <Input 
              required={needsRx}
              placeholder="e.g. RX-2026-00124"
              value={form.prescription_reference} 
              onChange={(e) => setForm({ ...form, prescription_reference: e.target.value })} 
            />
          </Field>
          
          <Field 
            label="Discount" 
            error={inputError(error, "discount_amount")}
          >
            <Input 
              type="number" 
              min="0" 
              max={subtotal} 
              step="0.01" 
              placeholder="0.00"
              value={form.discount_amount} 
              onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} 
            />
          </Field>
          
          <Field 
            label="Discount reason" 
            error={inputError(error, "discount_reason")}
          >
            <Input 
              required={discount > 0}
              placeholder="Explain why a discount was applied"
              value={form.discount_reason} 
              onChange={(e) => setForm({ ...form, discount_reason: e.target.value })} 
            />
          </Field>
          
          <div className="md:col-span-2 flex justify-end gap-6 border-t pt-4 text-sm">
            <span>
              Subtotal <strong>AFN {money(subtotal)}</strong>
            </span>
            <span>
              Paid in full <strong className="text-cyan-700 dark:text-cyan-300">AFN {money(total)}</strong>
            </span>
          </div>
        </section>

        <Actions 
          close={onClose} 
          saving={saving} 
          disabled={!cart.length || discount > subtotal} 
          label="Post sale" 
        />
      </form>
    </Modal>
  );
}

export function PurchaseForm({ onClose, onSaved }) {
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [form, setForm] = useState({ 
    supplier: "", 
    invoice_number: "", 
    purchase_date: today(), 
    paid_amount: "0.00", 
    notes: "" 
  });
  const [lines, setLines] = useState([newPurchaseLine()]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api("suppliers/?ordering=name"),
      api("medicines/?ordering=name")
    ]).then(([s, m]) => {
      setSuppliers(rows(s).filter((x) => x.is_active));
      setMedicines(rows(m).filter((x) => x.is_active));
    }).catch(setError);
  }, []);

  const total = lines.reduce((sum, l) => 
    sum + Number(l.quantity || 0) * Number(l.unit_cost || 0), 0);

  function line(index, key, value) {
    setLines(lines.map((l, i) => 
      i === index ? { ...l, [key]: value } : l
    ));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      await post("purchases/", {
        ...form,
        paid_amount: Number(form.paid_amount || 0).toFixed(2),
        lines
      });
      onSaved();
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal 
      title="Record purchase" 
      subtitle="Posting creates batches, receives stock and records the initial payment." 
      onClose={onClose} 
      wide
    >
      <form onSubmit={submit} className="space-y-6">
        {error && <FormError error={error} />}
        
        <div className="grid gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 p-4 md:grid-cols-3">
          <Field label="Supplier" error={inputError(error, "supplier")}>
            <Select 
              required 
              placeholder="Select supplier"
              value={form.supplier} 
              onChange={(v) => setForm({ ...form, supplier: v })} 
              options={suppliers.map((s) => [s.id, s.name])} 
            />
          </Field>
          
          <Field label="Supplier invoice" error={inputError(error, "invoice_number")}>
            <Input 
              required 
              placeholder="e.g. INV-2026-1048"
              value={form.invoice_number} 
              onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} 
            />
          </Field>
          
          <Field label="Purchase date">
            <DatePicker 
              required 
              max={today()} 
              value={form.purchase_date} 
              onChange={(purchase_date) => setForm({ ...form, purchase_date })} 
            />
          </Field>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">
              Purchase lines
            </h3>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => setLines([...lines, newPurchaseLine()])}
            >
              <Plus />Add line
            </Button>
          </div>
          
          <div className="space-y-3">
            {lines.map((l, i) => (
              <div 
                key={i} 
                className="grid gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_44px]"
              >
                <Select 
                  required 
                  value={l.medicine} 
                  onChange={(v) => line(i, "medicine", v)} 
                  placeholder="Medicine" 
                  options={medicines.map((m) => [
                    m.id, 
                    `${m.name}${m.strength ? ` ${m.strength}` : ""}`
                  ])} 
                />
                <Input 
                  required 
                  placeholder="Batch no." 
                  value={l.batch_number} 
                  onChange={(e) => line(i, "batch_number", e.target.value)} 
                />
                <DatePicker 
                  required 
                  aria-label="Expiry date"
                  min={dayAfter(form.purchase_date || today())} 
                  value={l.expiry_date} 
                  onChange={(value) => line(i, "expiry_date", value)} 
                />
                <Input 
                  required 
                  type="number" 
                  min="0.001" 
                  step="0.001" 
                  placeholder="Quantity" 
                  value={l.quantity} 
                  onChange={(e) => line(i, "quantity", e.target.value)} 
                />
                <div className="space-y-2">
                  <Input 
                    required 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    placeholder="Unit cost" 
                    value={l.unit_cost} 
                    onChange={(e) => line(i, "unit_cost", e.target.value)} 
                  />
                  <Input 
                    required 
                    type="number" 
                    min={l.unit_cost || 0} 
                    step="0.01" 
                    placeholder="Sale price" 
                    value={l.sale_price} 
                    onChange={(e) => line(i, "sale_price", e.target.value)} 
                  />
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  aria-label={`Remove purchase line ${i + 1}`}
                  title="Remove line"
                  disabled={lines.length === 1} 
                  onClick={() => setLines(lines.filter((_, j) => i !== j))}
                >
                  <Trash2 />
                </Button>
                <p className="text-xs text-muted-foreground md:col-span-6">
                  Line total: AFN {money(Number(l.quantity || 0) * Number(l.unit_cost || 0))}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/70 p-4 md:grid-cols-2">
          <Field 
            label={`Initial payment · Total AFN ${money(total)}`} 
            error={inputError(error, "paid_amount")}
          >
            <Input 
              type="number" 
              min="0" 
              max={total} 
              step="0.01" 
              value={form.paid_amount} 
              onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} 
            />
          </Field>
          
          <Field label="Notes">
            <Input 
              value={form.notes} 
              onChange={(e) => setForm({ ...form, notes: e.target.value })} 
            />
          </Field>
        </div>
        
        <Actions 
          close={onClose} 
          saving={saving} 
          disabled={!lines.length || Number(form.paid_amount) > total} 
          label="Post purchase" 
        />
      </form>
    </Modal>
  );
}

export function MedicineForm({ item, onClose, onSaved, onOpenExisting }) {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(item || { 
    category: "", 
    code: "", 
    name: "", 
    generic_name: "", 
    strength: "", 
    dosage_form: "", 
    unit: "unit", 
    reorder_level: "0.000", 
    default_sale_price: "0.00", 
    requires_prescription: false, 
    is_active: true 
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  
  // Common dosage forms
  const commonDosageForms = [
    "Tablet",
    "Capsule",
    "Syrup",
    "Injection",
    "Ointment",
    "Cream",
    "Drops",
    "Inhaler",
    "Suppository",
    "Powder",
    "Suspension",
    "Solution",
    "Gel",
    "Patch",
    "Spray"
  ];
  
  // Common units
  const commonUnits = [
    "unit",
    "mg",
    "g",
    "kg",
    "ml",
    "l",
    "tablet",
    "capsule",
    "ampoule",
    "vial",
    "bottle",
    "tube",
    "pack",
    "strip",
    "box"
  ];
  
  // Filtered options based on input
  const [filteredDosageForms, setFilteredDosageForms] = useState(commonDosageForms);
  const [filteredUnits, setFilteredUnits] = useState(commonUnits);
  const [showDosageDropdown, setShowDosageDropdown] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  
  // Handle dosage form input change
  const handleDosageFormChange = (value) => {
    setForm({ ...form, dosage_form: value });
    if (value) {
      const filtered = commonDosageForms.filter(form => 
        form.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredDosageForms(filtered);
      setShowDosageDropdown(true);
    } else {
      setFilteredDosageForms(commonDosageForms);
      setShowDosageDropdown(false);
    }
  };
  
  // Handle unit input change
  const handleUnitChange = (value) => {
    setForm({ ...form, unit: value });
    if (value) {
      const filtered = commonUnits.filter(unit => 
        unit.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredUnits(filtered);
      setShowUnitDropdown(true);
    } else {
      setFilteredUnits(commonUnits);
      setShowUnitDropdown(false);
    }
  };
  
  // Handle dosage form focus
  const handleDosageFormFocus = () => {
    if (form.dosage_form) {
      const filtered = commonDosageForms.filter(formOption => 
        formOption.toLowerCase().includes(form.dosage_form.toLowerCase())
      );
      setFilteredDosageForms(filtered);
    }
    setShowDosageDropdown(true);
  };
  
  // Handle unit focus
  const handleUnitFocus = () => {
    if (form.unit) {
      const filtered = commonUnits.filter(unitOption => 
        unitOption.toLowerCase().includes(form.unit.toLowerCase())
      );
      setFilteredUnits(filtered);
    }
    setShowUnitDropdown(true);
  };
  
  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dosage-form-dropdown')) {
        setShowDosageDropdown(false);
      }
      if (!event.target.closest('.unit-dropdown')) {
        setShowUnitDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    api("medicine-categories/?ordering=name")
      .then((d) => setCategories(rows(d).filter((x) => x.is_active || x.id === item?.category)))
      .catch(setError);
  }, [item]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setDuplicateMatches([]);
    
    try {
      await post(
        item ? `medicines/${item.id}/` : "medicines/",
        form,
        item ? "PATCH" : "POST"
      );
      onSaved();
    } catch (reason) {
      setError(reason);
      const searchValue = (form.name || form.code || "").trim();
      if (searchValue) {
        const matches = await lookupDuplicateCandidates({
          fetcher: api,
          endpoint: "medicines",
          ownId: item?.id,
          fieldNames: ["name", "code"],
          value: searchValue,
        });
        setDuplicateMatches(matches);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal 
      title={item ? "Edit medicine" : "New medicine"} 
      onClose={onClose} 
      wide
    >
      <form onSubmit={submit} className="space-y-5">
        {error && <FormError error={error} />}
        <DuplicateResolutionAlert
          title="Possible duplicate medicine found"
          message="This medicine matches an existing record already in the system. Use the existing master record instead of creating a duplicate."
          matches={duplicateMatches}
          onOpenExisting={onOpenExisting}
          onDismiss={() => setDuplicateMatches([])}
        />
        
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Category">
            <Select 
              required 
              value={form.category} 
              onChange={(v) => setForm({ ...form, category: v })} 
              options={categories.map((x) => [x.id, x.name])} 
            />
          </Field>
          
          <Field label="Code">
            <Input 
              required 
              value={form.code} 
              onChange={(e) => setForm({ ...form, code: e.target.value })} 
            />
          </Field>
          
          <Field label="Name">
            <Input 
              required 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
            />
          </Field>
          
          <Field label="Generic name">
            <Input 
              value={form.generic_name} 
              onChange={(e) => setForm({ ...form, generic_name: e.target.value })} 
            />
          </Field>
          
          <Field label="Strength">
            <Input 
              value={form.strength} 
              onChange={(e) => setForm({ ...form, strength: e.target.value })} 
            />
          </Field>
          
          <Field label="Dosage form">
            <div className="relative dosage-form-dropdown">
              <Input 
                value={form.dosage_form} 
                onChange={(e) => handleDosageFormChange(e.target.value)} 
                onFocus={handleDosageFormFocus}
                placeholder="Select or type custom form"
              />
              {showDosageDropdown && filteredDosageForms.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                  <div className="max-h-60 overflow-y-auto py-1">
                    {filteredDosageForms.map((formOption) => (
                      <button
                        key={formOption}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 focus:outline-none"
                        onClick={() => {
                          setForm({ ...form, dosage_form: formOption });
                          setShowDosageDropdown(false);
                        }}
                      >
                        {formOption}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Field>
          
          <Field label="Unit">
            <div className="relative unit-dropdown">
              <Input 
                required 
                value={form.unit} 
                onChange={(e) => handleUnitChange(e.target.value)} 
                onFocus={handleUnitFocus}
                placeholder="Select or type custom unit"
              />
              {showUnitDropdown && filteredUnits.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                  <div className="max-h-60 overflow-y-auto py-1">
                    {filteredUnits.map((unitOption) => (
                      <button
                        key={unitOption}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 focus:outline-none"
                        onClick={() => {
                          setForm({ ...form, unit: unitOption });
                          setShowUnitDropdown(false);
                        }}
                      >
                        {unitOption}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Field>
          
          <Field label="Reorder level">
            <Input 
              type="number" 
              min="0" 
              step="0.001" 
              value={form.reorder_level} 
              onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} 
            />
          </Field>
          
          <Field label="Default sale price">
            <Input 
              type="number" 
              min="0" 
              step="0.01" 
              value={form.default_sale_price} 
              onChange={(e) => setForm({ ...form, default_sale_price: e.target.value })} 
            />
          </Field>
        </div>
        
        <div className="flex gap-6">
          <Check 
            label="Requires prescription" 
            checked={form.requires_prescription} 
            onChange={(v) => setForm({ ...form, requires_prescription: v })} 
          />
          <Check 
            label="Active" 
            checked={form.is_active} 
            onChange={(v) => setForm({ ...form, is_active: v })} 
          />
        </div>
        
        <Actions 
          close={onClose} 
          saving={saving} 
          label={item ? "Save changes" : "Create medicine"} 
        />
      </form>
    </Modal>
  );
}

export function CategoryForm({ item, onClose, onSaved, onOpenExisting }) {
  return (
    <EntityForm 
      endpoint="medicine-categories" 
      title="category" 
      item={item} 
      onClose={onClose} 
      onSaved={onSaved} 
      onOpenExisting={onOpenExisting}
      fields={["name", "description"]} 
    />
  );
}

export function SimpleEntityForm({ item, onClose, onSaved, onOpenExisting }) {
  return (
    <EntityForm 
      endpoint="suppliers" 
      title="supplier" 
      item={item} 
      onClose={onClose} 
      onSaved={onSaved} 
      onOpenExisting={onOpenExisting}
      fields={["name", "contact_person", "phone", "email", "address", "tax_number"]} 
    />
  );
}

function EntityForm({ endpoint, title, item, fields, onClose, onSaved, onOpenExisting }) {
  const initial = Object.fromEntries(fields.map((f) => [f, item?.[f] || ""]));
  const [form, setForm] = useState({ 
    ...initial, 
    is_active: item?.is_active ?? true 
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState([]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setDuplicateMatches([]);
    
    try {
      await post(
        item ? `${endpoint}/${item.id}/` : `${endpoint}/`,
        form,
        item ? "PATCH" : "POST"
      );
      onSaved();
    } catch (reason) {
      setError(reason);
      const searchValue = (form.name || form.code || "").trim();
      if (searchValue) {
        const matches = await lookupDuplicateCandidates({
          fetcher: api,
          endpoint,
          ownId: item?.id,
          fieldNames: ["name", "code"],
          value: searchValue,
        });
        setDuplicateMatches(matches);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal 
      title={`${item ? "Edit" : "New"} ${title}`} 
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <FormError error={error} />}
        <DuplicateResolutionAlert
          title={`Possible duplicate ${title} found`}
          message={`This ${title} matches an existing record already in the system. Review the current master entry before saving again.`}
          matches={duplicateMatches}
          onOpenExisting={onOpenExisting}
          onDismiss={() => setDuplicateMatches([])}
        />
        
        {fields.map((key) => (
          <Field 
            key={key} 
            label={fieldLabel(key)}
          >
            <Input 
              required={key === "name"}
              type={key === "email" ? "email" : "text"}
              value={form[key]} 
              onChange={(e) => setForm({ ...form, [key]: e.target.value })} 
            />
          </Field>
        ))}
        
        <Check 
          label="Active" 
          checked={form.is_active} 
          onChange={(v) => setForm({ ...form, is_active: v })} 
        />
        
        <Actions 
          close={onClose} 
          saving={saving} 
          label="Save" 
        />
      </form>
    </Modal>
  );
}

export function StockAdjustmentForm({ onClose, onSaved }) {
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState({ 
    batch: "", 
    quantity_change: "", 
    category: "count_correction", 
    reason: "" 
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("medicine-batches/?in_stock=true&active=true&ordering=expiry_date")
      .then((d) => setBatches(rows(d)))
      .catch(setError);
  }, []);

  const selected = batches.find((b) => b.id === form.batch);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      await post("stock-movements/adjust/", form);
      onSaved();
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal 
      title="Stock adjustment" 
      subtitle="Adjustments are permanent audited stock movements." 
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <FormError error={error} />}
        
        <Field label="Batch">
          <Select 
            required 
            value={form.batch} 
            onChange={(v) => setForm({ ...form, batch: v })} 
            options={batches.map((b) => [
              b.id, 
              `${b.medicine_name} · ${b.batch_number} · ${qty(b.quantity_available)}`
            ])} 
          />
        </Field>
        
        <Field 
          label="Quantity change" 
          hint={selected ? 
            `Current ${qty(selected.quantity_available)} → resulting ${qty(Number(selected.quantity_available) + Number(form.quantity_change || 0))}` : 
            "Use a negative value for damage, expiry, loss or count reduction."
          }
        >
          <Input 
            required 
            type="number" 
            step="0.001" 
            value={form.quantity_change} 
            onChange={(e) => setForm({ ...form, quantity_change: e.target.value })} 
          />
        </Field>
        
        <Field label="Category">
          <Select 
            required 
            value={form.category} 
            onChange={(v) => setForm({ ...form, category: v })} 
            options={[
              ["count_correction", "Count correction"],
              ["damage", "Damage"],
              ["expiry", "Expiry"],
              ["loss", "Loss"],
              ["return", "Return"]
            ]} 
          />
        </Field>
        
        <Field label="Reason">
          <Textarea 
            required 
            maxLength="220" 
            value={form.reason} 
            onChange={(e) => setForm({ ...form, reason: e.target.value })} 
          />
        </Field>
        
        <Actions 
          close={onClose} 
          saving={saving} 
          disabled={!selected || 
            !Number(form.quantity_change) || 
            Number(selected?.quantity_available || 0) + Number(form.quantity_change || 0) < 0 || 
            Number(selected?.quantity_received || 0) < Number(selected?.quantity_available || 0) + Number(form.quantity_change || 0)
          } 
          label="Post adjustment" 
          danger 
        />
      </form>
    </Modal>
  );
}

export function PaymentForm({ onClose, onSaved }) {
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [form, setForm] = useState({ 
    supplier: "", 
    purchase: "", 
    wallet: "", 
    payment_date: today(), 
    amount: "", 
    reference_number: "", 
    notes: "" 
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api("suppliers/?ordering=name"),
      api("wallets/?ordering=name")
    ]).then(([s, w]) => {
      setSuppliers(rows(s).filter((x) => x.is_active));
      setWallets(rows(w).filter((x) => x.is_active && ["pharmacy", "manager"].includes(x.kind)));
    }).catch(setError);
  }, []);

  useEffect(() => {
    if (form.supplier) {
      api(`purchases/?supplier=${form.supplier}&outstanding=true`)
        .then((d) => setPurchases(rows(d)))
        .catch(setError);
    }
  }, [form.supplier]);

  const supplier = suppliers.find((x) => x.id === form.supplier);
  const purchase = purchases.find((x) => x.id === form.purchase);
  const supplierDue = Math.max(0, Number(supplier?.amount_due || 0));
  const purchaseDue = Math.max(0, Number(purchase?.amount_due || 0));
  const due = purchase ? Math.min(purchaseDue, supplierDue) : supplierDue;

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      await post("supplier-payments/", { 
        ...form, 
        purchase: form.purchase || null 
      });
      onSaved();
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal 
      title="Supplier payment" 
      subtitle="Pay a specific purchase or reduce the supplier's overall balance." 
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <FormError error={error} />}
        
        <Field label="Supplier">
          <Select 
            required 
            value={form.supplier} 
            onChange={(v) => { 
              setForm({ ...form, supplier: v, purchase: "", amount: "" }); 
              setPurchases([]); 
            }} 
            options={suppliers.map((s) => [
              s.id, 
              `${s.name} · AFN ${money(s.amount_due)} due`
            ])} 
          />
        </Field>
        
        <Field label="Outstanding purchase (optional)">
          <Select 
            value={form.purchase} 
            onChange={(v) => setForm({ ...form, purchase: v, amount: "" })} 
            placeholder="Apply to supplier balance" 
            options={purchases.map((p) => [
              p.id, 
              `${p.purchase_number} · AFN ${money(Math.min(Number(p.amount_due), supplierDue))} payable`
            ])} 
          />
        </Field>
        
        <Field label="Wallet">
          <Select 
            required 
            value={form.wallet} 
            onChange={(v) => setForm({ ...form, wallet: v })} 
            options={wallets.map((w) => [
              w.id, 
              `${w.name} · AFN ${money(w.balance)}`
            ])} 
          />
        </Field>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Payment date">
            <DatePicker 
              required 
              max={today()} 
              value={form.payment_date} 
              onChange={(payment_date) => setForm({ ...form, payment_date })} 
            />
          </Field>
          
          <Field
            label={`Amount · Maximum AFN ${money(due)}`}
            hint={purchase && purchaseDue > supplierDue
              ? "The supplier's remaining balance is lower than this purchase balance."
              : "The payment cannot exceed the current outstanding balance."
            }
            error={inputError(error, "amount")}
          >
            <Input 
              required 
              type="number" 
              min="0.01" 
              max={due} 
              step="0.01" 
              value={form.amount} 
              onChange={(e) => setForm({ ...form, amount: e.target.value })} 
            />
          </Field>
        </div>
        
        <Field label="Reference number">
          <Input 
            value={form.reference_number} 
            onChange={(e) => setForm({ ...form, reference_number: e.target.value })} 
          />
        </Field>
        
        <Field label="Notes">
          <Textarea 
            value={form.notes} 
            onChange={(e) => setForm({ ...form, notes: e.target.value })} 
          />
        </Field>
        
        <Actions 
          close={onClose} 
          saving={saving} 
          disabled={due <= 0 || Number(form.amount) <= 0 || Number(form.amount) > due} 
          label="Post payment" 
        />
      </form>
    </Modal>
  );
}

export function VoidForm({ kind, item, onClose, onSaved }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const endpoint = kind === "payments" ? "supplier-payments" : kind;

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      await post(`${endpoint}/${item.id}/void/`, { reason });
      onSaved();
    } catch (value) {
      setError(value);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal 
      title={`Void ${kind === "payments" ? "payment" : kind.slice(0, -1)}`} 
      subtitle="This action creates reversal records and cannot be undone." 
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <FormError error={error} />}
        
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>
            {kind === "sales" ? 
              "Stock will be restored and the received payment reversed." : 
              kind === "purchases" ? 
                "Stock and the initial payment will be reversed. The purchase must have untouched stock and no active allocated payments." : 
                "The wallet payment will be reversed."
            }
          </AlertDescription>
        </Alert>
        
        <Field label="Reason">
          <Textarea 
            required 
            maxLength="255" 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
          />
        </Field>
        
        <Actions 
          close={onClose} 
          saving={saving} 
          disabled={!reason.trim()} 
          label="Confirm void" 
          danger 
        />
      </form>
    </Modal>
  );
}

export function TransactionDetail({ kind, item, user, onClose, onChanged, initialMode = "" }) {
  const [mode, setMode] = useState(initialMode);
  
  if (mode === "void") {
    return (
      <VoidForm 
        kind={kind} 
        item={item} 
        onClose={() => setMode("")} 
        onSaved={() => onChanged("Transaction voided successfully.")} 
      />
    );
  }
  
  if (mode === "edit") {
    if (kind === "medicines") {
      return (
        <MedicineForm 
          item={item} 
          onClose={() => setMode("")} 
          onSaved={() => onChanged("Medicine updated.")} 
        />
      );
    }
    if (kind === "suppliers") {
      return (
        <SimpleEntityForm 
          kind="supplier" 
          item={item} 
          onClose={() => setMode("")} 
          onSaved={() => onChanged("Supplier updated.")} 
        />
      );
    }
    if (kind === "categories") {
      return (
        <CategoryForm 
          item={item} 
          onClose={() => setMode("")} 
          onSaved={() => onChanged("Category updated.")} 
        />
      );
    }
    if (kind === "batches") {
      return (
        <BatchEdit 
          item={item} 
          onClose={() => setMode("")} 
          onSaved={() => onChanged("Batch updated.")} 
        />
      );
    }
  }

  const canVoid = item.status !== "void" && 
    !item.is_void && 
    ((["sales", "purchases"].includes(kind) && hasRole(user, "administrator")) || 
     (kind === "payments" && hasRole(user, "administrator", "finance")));
  
  const canEdit = ["medicines", "suppliers", "categories", "batches"].includes(kind) && 
    hasRole(user, "administrator", "pharmacy");
  const details = detailFields(kind, item);

  return (
    <Modal 
      title={item.sale_number || item.purchase_number || item.name || item.medicine_name || item.supplier_name} 
      subtitle={kind.replaceAll("_", " ")} 
      onClose={onClose} 
      wide
    >
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Record information</h3>
        <div className="grid overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-3">
          {details.map(([key, value]) => (
            <div key={key} className="min-w-0 border-b border-slate-100 dark:border-slate-800 p-4 last:border-b-0 sm:border-r">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{detailLabel(key)}</p>
              <p className="mt-1.5 break-words text-sm font-semibold leading-5 text-slate-900 dark:text-slate-100">
                {formatDetailValue(key, value)}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {item.lines?.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Line items</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="pharmacy-table w-full min-w-[650px] text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th scope="col" className="p-3.5 font-semibold">Medicine / batch</th>
                <th scope="col" className="p-3.5 font-semibold">Expiry</th>
                <th scope="col" className="p-3.5 text-right font-semibold">Quantity</th>
                <th scope="col" className="p-3.5 text-right font-semibold">Unit price/cost</th>
                <th scope="col" className="p-3.5 text-right font-semibold">Line total</th>
              </tr>
            </thead>
            <tbody>
              {item.lines.map((line) => (
                <tr className="border-t border-slate-100 dark:border-slate-800 odd:bg-white even:bg-slate-50/40 dark:bg-slate-900/40" key={line.id}>
                  <td className="p-3">
                    <strong>{line.medicine_name}</strong>
                    <small className="block text-muted-foreground">
                      {line.batch_number}
                    </small>
                  </td>
                  <td className="p-3">
                    {formatDate(line.expiry_date)}
                  </td>
                  <td className="p-3 text-right font-semibold tabular-nums">
                    {qty(line.quantity)}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    AFN {money(line.unit_price ?? line.unit_cost)}
                  </td>
                  <td className="p-3 text-right font-semibold tabular-nums">
                    AFN {money(line.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
      
      <div className="mt-6 flex justify-end gap-2 border-t pt-5">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {canEdit && (
          <Button onClick={() => setMode("edit")}>
            Edit
          </Button>
        )}
        {canVoid && (
          <Button variant="destructive" onClick={() => setMode("void")}>
            Void
          </Button>
        )}
      </div>
    </Modal>
  );
}

function BatchEdit({ item, onClose, onSaved }) {
  const [form, setForm] = useState({ 
    sale_price: item.sale_price, 
    expiry_date: item.expiry_date, 
    is_active: item.is_active 
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      await post(`medicine-batches/${item.id}/`, form, "PATCH");
      onSaved();
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal 
      title={`Edit ${item.batch_number}`} 
      subtitle="Batch identity, supplier, purchase cost and received quantity are immutable." 
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <FormError error={error} />}
        
        <Field label={`Sale price · Cost AFN ${money(item.purchase_price)}`}>
          <Input 
            type="number" 
            min={item.purchase_price} 
            step="0.01" 
            value={form.sale_price} 
            onChange={(e) => setForm({ ...form, sale_price: e.target.value })} 
          />
        </Field>
        
        <Field label="Expiry date">
          <DatePicker 
            value={form.expiry_date} 
            onChange={(expiry_date) => setForm({ ...form, expiry_date })} 
          />
        </Field>
        
        <Check 
          label="Active" 
          checked={form.is_active} 
          onChange={(v) => setForm({ ...form, is_active: v })} 
        />
        
        <Actions 
          close={onClose} 
          saving={saving} 
          label="Save batch" 
        />
      </form>
    </Modal>
  );
}

function FormError({ error }) {
  const messages = error?.messages || readableErrors(error?.fields, error?.status);
  
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertDescription>
        <strong className="block">
          We couldn&apos;t save this information.
        </strong>
        {messages.length === 1 ? (
          <p className="mt-1">{messages[0]}</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {messages.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}

function Actions({ close, saving, disabled, label, danger }) {
  return (
    <div className="flex justify-end gap-3 border-t pt-5">
      <Button 
        type="button" 
        variant="outline" 
        onClick={close}
      >
        Cancel
      </Button>
      <Button 
        type="submit" 
        disabled={saving || disabled} 
        variant={danger ? "destructive" : "default"} 
        className={danger ? "" : "bg-cyan-700 hover:bg-cyan-800"}
      >
        {saving && <LoaderCircle className="animate-spin" />}
        {label}
      </Button>
    </div>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox 
        checked={checked} 
        onCheckedChange={(v) => onChange(Boolean(v))} 
      />
      {label}
    </label>
  );
}

function newPurchaseLine() {
  return { 
    medicine: "", 
    batch_number: "", 
    expiry_date: "", 
    quantity: "", 
    unit_cost: "", 
    sale_price: "" 
  };
}

function dayAfter(value) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fieldLabel(value) {
  const label = String(value).replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const detailKeys = {
  sales: [
    "sale_number", "patient_name", "sale_date", "prescription_reference", "subtotal",
    "discount_amount", "discount_reason", "total_amount", "paid_amount", "profit",
    "status", "void_reason", "created_at"
  ],
  purchases: [
    "purchase_number", "supplier_name", "invoice_number", "purchase_date", "total_amount",
    "paid_amount", "amount_due", "notes", "status", "void_reason", "created_at"
  ],
  medicines: [
    "code", "name", "generic_name", "category_name", "strength", "dosage_form", "unit",
    "stock_quantity", "reorder_level", "default_sale_price", "requires_prescription", "is_active", "updated_at"
  ],
  batches: [
    "medicine_name", "batch_number", "supplier_name", "expiry_date", "quantity_received",
    "quantity_available", "purchase_price", "sale_price", "is_active", "updated_at"
  ],
  suppliers: [
    "name", "contact_person", "phone", "email", "address", "tax_number", "amount_due", "is_active", "updated_at"
  ],
  payments: [
    "supplier_name", "wallet_name", "payment_date", "amount", "reference_number", "notes",
    "is_void", "void_reason", "created_at"
  ],
  categories: ["name", "description", "is_active", "updated_at"]
};

const detailLabels = {
  amount_due: "Amount due",
  default_sale_price: "Default sale price",
  is_active: "Status",
  is_void: "Status",
  patient_name: "Patient",
  supplier_name: "Supplier",
  wallet_name: "Wallet"
};

const moneyFields = new Set([
  "amount", "amount_due", "default_sale_price", "discount_amount", "paid_amount",
  "profit", "purchase_price", "sale_price", "subtotal", "total_amount"
]);
const quantityFields = new Set(["quantity_available", "quantity_received", "reorder_level", "stock_quantity"]);

function detailFields(kind, item) {
  return (detailKeys[kind] || Object.keys(item))
    .filter((key) => item[key] !== null && item[key] !== undefined && item[key] !== "")
    .map((key) => [key, item[key]]);
}

function detailLabel(key) {
  return detailLabels[key] || fieldLabel(key);
}

function formatDetailValue(key, value) {
  if (key === "is_active") return value ? "Active" : "Inactive";
  if (key === "is_void") return value ? "Void" : "Active";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (moneyFields.has(key)) return `AFN ${money(value)}`;
  if (quantityFields.has(key)) return qty(value);
  if (key.endsWith("_at")) return formatDate(value, true);
  if (key.endsWith("_date")) return formatDate(value);
  if (key === "status") return fieldLabel(value);
  return String(value);
}
