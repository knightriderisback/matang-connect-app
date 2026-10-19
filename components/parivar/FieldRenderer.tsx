"use client";
import { FormField, activeOptions, pickLabel, statusLabel } from "@/lib/parivar/form";

const inputCls =
  "w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-matang-gold focus:outline-none bg-white text-base disabled:bg-gray-50 disabled:text-gray-500";
const labelCls = "block text-sm font-medium text-matang-navy mb-1";

function selectPlaceholder(lang: string): string {
  if (lang === "hi" || lang === "mr" || lang === "cg") return "चुनें…";
  if (lang === "hng") return "Chunein…";
  return "Select…";
}

interface Props {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  lang: string;
  disabled?: boolean;
}

export default function FieldRenderer({ field, value, onChange, lang, disabled }: Props) {
  const label = pickLabel(field.label, lang);
  const help = pickLabel(field.help_text, lang);
  const placeholder = pickLabel(field.placeholder, lang);
  const opts = activeOptions(field);

  const header = (
    <label className={labelCls}>
      {label}
      {field.is_required && <span className="text-red-500"> *</span>}
    </label>
  );
  const helper = help ? <p className="text-xs text-gray-500 mt-1">{help}</p> : null;

  let control: React.ReactNode = null;

  switch (field.field_type) {
    case "text":
    case "phone":
    case "number":
    case "date": {
      const type =
        field.field_type === "phone" ? "tel" : field.field_type === "number" ? "number" : field.field_type;
      control = (
        <input
          type={type}
          inputMode={field.field_type === "phone" || field.field_type === "number" ? "numeric" : undefined}
          className={inputCls}
          disabled={disabled}
          placeholder={placeholder || (field.field_type === "phone" ? "10-digit mobile" : "")}
          value={value ?? ""}
          max={field.field_type === "date" && field.system_column === "dob" ? new Date().toISOString().slice(0, 10) : undefined}
          maxLength={field.field_type === "phone" ? 10 : (field.config?.max_length as number | undefined)}
          onChange={(e) => {
            let v = e.target.value;
            if (field.field_type === "phone") v = v.replace(/\D/g, "").slice(0, 10);
            else if (field.field_type === "number" && field.config?.digits_only) v = v.replace(/\D/g, "");
            onChange(v);
          }}
        />
      );
      break;
    }
    case "textarea":
      control = (
        <textarea
          rows={3}
          className={inputCls}
          disabled={disabled}
          placeholder={placeholder}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case "dropdown":
      control = (
        <select className={inputCls} disabled={disabled} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">{selectPlaceholder(lang)}</option>
          {opts.map((o) => (
            <option key={o.id} value={o.value}>
              {pickLabel(o.label, lang)}
            </option>
          ))}
        </select>
      );
      break;
    case "multi_select": {
      const sel: string[] = Array.isArray(value) ? value : [];
      control = (
        <div className="flex flex-wrap gap-2">
          {opts.map((o) => {
            const on = sel.includes(o.value);
            return (
              <button
                key={o.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(on ? sel.filter((x) => x !== o.value) : [...sel, o.value])}
                className={`px-3 py-2 rounded-full text-sm font-medium border cursor-pointer ${
                  on ? "bg-matang-gold text-matang-navy border-matang-gold" : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {pickLabel(o.label, lang)}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    case "yes_no":
      control = (
        <select className={inputCls} disabled={disabled} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">{selectPlaceholder(lang)}</option>
          <option value="yes">{statusLabel("yn", "yes", lang)}</option>
          <option value="no">{statusLabel("yn", "no", lang)}</option>
        </select>
      );
      break;
    case "yes_no_number": {
      const v = (value && typeof value === "object" ? value : {}) as { status?: string; number?: string };
      const numberLabel = pickLabel(field.config?.number_label, lang) || "Number / ID (optional)";
      const digitsOnly = !!field.config?.digits_only;
      control = (
        <div className="space-y-2">
          <select
            className={inputCls}
            disabled={disabled}
            value={v.status ?? ""}
            onChange={(e) => {
              const status = e.target.value;
              if (!status) onChange(undefined);
              else onChange(status === "yes" ? { status, number: v.number } : { status });
            }}
          >
            <option value="">{selectPlaceholder(lang)}</option>
            <option value="yes">{statusLabel("doc", "yes", lang)}</option>
            <option value="no">{statusLabel("doc", "no", lang)}</option>
            <option value="unknown">{statusLabel("doc", "unknown", lang)}</option>
          </select>
          {v.status === "yes" && (
            <div>
              <input
                type="text"
                inputMode={digitsOnly ? "numeric" : undefined}
                className={inputCls}
                disabled={disabled}
                placeholder={numberLabel}
                maxLength={(field.config?.max_length as number | undefined) || 40}
                value={v.number ?? ""}
                onChange={(e) => {
                  let n = e.target.value;
                  if (digitsOnly) n = n.replace(/\D/g, "");
                  onChange({ status: "yes", number: n });
                }}
              />
              {field.config?.store === "last4" && (
                <p className="text-[11px] text-gray-500 mt-1">
                  {lang === "hi" || lang === "mr" || lang === "cg"
                    ? "सुरक्षा के लिए सिर्फ़ आख़िरी 4 अंक सेव होंगे।"
                    : "Only the last 4 digits are saved, for safety."}
                </p>
              )}
            </div>
          )}
        </div>
      );
      break;
    }
  }

  return (
    <div data-no-translate>
      {header}
      {control}
      {helper}
    </div>
  );
}
