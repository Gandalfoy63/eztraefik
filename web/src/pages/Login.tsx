// Docs: docs/03 - Features/Auth.md
import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api";
import { Button } from "../ui/feedback";
import { Field, invalid } from "../ui/controls";
import { BrandLockup } from "../ui/Brand";

export function Login({ version, onDone }: { version: string; onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Enter your username and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/login", { username, password });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in.");
      setBusy(false);
    }
  };

  return (
    <div className="center-screen">
      <form className="login card" onSubmit={submit} noValidate>
        <div className="login-brand">
          <BrandLockup height={56} animated />
          <h1>Sign in</h1>
          <p className="hint">Version {version}</p>
        </div>
        <Field label="Username" htmlFor="login-user">
          <input className="input" {...invalid("login-user", error)} autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
        </Field>
        <Field label="Password" htmlFor="login-pass" error={error}>
          <input className="input" type="password" {...invalid("login-pass", error)} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
        </Field>
        <Button variant="primary" type="submit" busy={busy} busyLabel="Signing in" className="login-submit">
          Sign in
        </Button>
      </form>
    </div>
  );
}
