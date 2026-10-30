// Docs: docs/05 - UI-UX/Components.md
// Sortable table columns. Click a heading: A to Z, again: Z to A. Empty values always go last.
import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

type Value = string | number | null | undefined;
export type Columns<T> = Record<string, (row: T) => Value>;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const empty = (v: Value) => v === null || v === undefined || v === "";

export function compare(a: Value, b: Value, dir: 1 | -1) {
  if (empty(a) || empty(b)) return empty(a) ? (empty(b) ? 0 : 1) : -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * dir;
  return collator.compare(String(a), String(b)) * dir;
}

export interface Sort<T> {
  rows: T[];
  col: string;
  dir: 1 | -1;
  toggle: (col: string) => void;
}

export function useSort<T>(rows: T[], columns: Columns<T>, initial: string, initialDir: 1 | -1 = 1): Sort<T> {
  const [{ col, dir }, set] = useState({ col: initial, dir: initialDir });
  const sorted = useMemo(() => {
    const get = columns[col];
    return rows.map((r, i) => [r, i] as const).sort((x, y) => compare(get(x[0]), get(y[0]), dir) || x[1] - y[1]).map(x => x[0]);
    // columns only read the row, so they don't need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, col, dir]);
  return { rows: sorted, col, dir, toggle: c => set(s => ({ col: c, dir: s.col === c ? (s.dir === 1 ? -1 : 1) : 1 })) };
}

export function SortTh<T>({ sort, col, children, className }: { sort: Sort<T>; col: string; children: ReactNode; className?: string }) {
  const on = sort.col === col;
  const Icon = !on ? ChevronsUpDown : sort.dir === 1 ? ChevronUp : ChevronDown;
  return (
    <th scope="col" className={className} aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" className={`sort-btn${on ? " is-on" : ""}`} onClick={() => sort.toggle(col)}>
        {children}
        <Icon aria-hidden="true" />
      </button>
    </th>
  );
}
