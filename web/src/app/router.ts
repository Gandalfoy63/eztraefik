// Docs: docs/04 - Architecture/Frontend.md
// Hash router: #routes, #routes?new=1&host=app.example.com. Deep links survive reloads without server routing.
import { useEffect, useState } from "react";

export interface Location {
  page: string;
  params: URLSearchParams;
}

function parse(): Location {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [page, query = ""] = raw.split("?");
  return { page: page || "overview", params: new URLSearchParams(query) };
}

export function useLocation(): Location {
  const [loc, setLoc] = useState(parse);
  useEffect(() => {
    const on = () => setLoc(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return loc;
}

export function navigate(page: string, params?: Record<string, string>) {
  const q = params ? "?" + new URLSearchParams(params).toString() : "";
  window.location.hash = page + q;
}

// clearParams drops the query part (for example after a prefilled form opened) without adding a history entry.
export function clearParams(page: string) {
  history.replaceState(null, "", "#" + page);
}
