// Docs: docs/05 - UI-UX/Navigation.md
import { MapPinOff } from "lucide-react";
import { Empty } from "../ui/feedback";

export function NotFound() {
  return (
    <section className="card">
      <Empty icon={MapPinOff} title="This page does not exist" action={<a className="btn btn-secondary" href="#overview">Go to Overview</a>}>
        The link may be outdated. Use the menu on the left.
      </Empty>
    </section>
  );
}
