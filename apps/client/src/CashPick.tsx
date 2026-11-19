import { STARTING_CASH_OPTIONS } from "@stonks/engine";
import { useState } from "react";
import { money } from "./format";

// Preset amounts, or "Autre montant" to type any amount
export function CashPick({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [custom, setCustom] = useState(!STARTING_CASH_OPTIONS.includes(value));
  return (
    <span className="cash-inputs">
      <select
        value={custom ? "custom" : value}
        onChange={(e) => {
          const v = e.target.value;
          setCustom(v === "custom");
          if (v !== "custom") onChange(Number(v));
        }}
      >
        {STARTING_CASH_OPTIONS.map((v) => (
          <option key={v} value={v}>
            {money(v)}
          </option>
        ))}
        <option value="custom">Autre montant...</option>
      </select>
      {custom && (
        <input type="number" min={1000} max={1000000} step={1000} value={value} onChange={(e) => onChange(Math.floor(Number(e.target.value)))} aria-label="Montant en k$" />
      )}
    </span>
  );
}
