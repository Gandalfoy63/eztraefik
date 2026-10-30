package traefik

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestClearAndRestoreACMECerts(t *testing.T) {
	dir := t.TempDir()
	acme := filepath.Join(dir, "acme")
	_ = os.MkdirAll(acme, 0o700)
	original := `{"le":{"Account":{"Email":"a@example.com","PrivateKey":"KEEP"},"Certificates":[{"domain":{"main":"a.test"}},{"domain":{"main":"b.test"}}]}}`
	file := filepath.Join(acme, "le.json")
	_ = os.WriteFile(file, []byte(original), 0o600)

	n, err := ClearACMECerts(dir)
	if err != nil || n != 2 {
		t.Fatalf("cleared %d, err %v", n, err)
	}
	b, _ := os.ReadFile(file)
	var got map[string]struct {
		Account      map[string]string
		Certificates []any
	}
	if err := json.Unmarshal(b, &got); err != nil {
		t.Fatal(err)
	}
	if len(got["le"].Certificates) != 0 || got["le"].Account["PrivateKey"] != "KEEP" {
		t.Errorf("certificates must go, the account must stay: %s", b)
	}
	if info, _ := os.Stat(file); info.Mode().Perm() != 0o600 {
		t.Errorf("Traefik refuses storage files wider than 600: %v", info.Mode())
	}
	if !HasACMEBackup(dir) {
		t.Fatal("no backup")
	}
	if err := RestoreACMECerts(dir); err != nil {
		t.Fatal(err)
	}
	if b, _ := os.ReadFile(file); string(b) != original {
		t.Errorf("restore: %s", b)
	}
}

// A damaged file must stop everything before any certificate is deleted.
func TestClearStopsOnDamagedFile(t *testing.T) {
	dir := t.TempDir()
	acme := filepath.Join(dir, "acme")
	_ = os.MkdirAll(acme, 0o700)
	good := `{"le":{"Certificates":[{"domain":{"main":"a.test"}}]}}`
	_ = os.WriteFile(filepath.Join(acme, "a.json"), []byte(good), 0o600)
	_ = os.WriteFile(filepath.Join(acme, "b.json"), []byte("not json"), 0o600)
	if _, err := ClearACMECerts(dir); err == nil || !strings.Contains(err.Error(), "b.json") {
		t.Fatalf("err %v", err)
	}
	if b, _ := os.ReadFile(filepath.Join(acme, "a.json")); string(b) != good {
		t.Errorf("a.json changed: %s", b)
	}
}
