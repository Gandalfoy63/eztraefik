// Docs: docs/09 - Data/Data Model.md, docs/03 - Features/Config History.md
package store

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Store keeps State in memory and on disk (state.json), plus one snapshot per change in history/.
type Store struct {
	mu    sync.RWMutex
	dir   string
	state State
}

type HistoryEntry struct {
	ID      int       `json:"id"`
	Time    time.Time `json:"time"`
	Message string    `json:"message"`
	User    string    `json:"user"`
}

const historyKeep = 200

func Open(dir string, defaults TraefikConfig) (*Store, error) {
	if err := os.MkdirAll(filepath.Join(dir, "history"), 0o700); err != nil {
		return nil, err
	}
	s := &Store{dir: dir}
	b, err := os.ReadFile(filepath.Join(dir, "state.json"))
	switch {
	case errors.Is(err, os.ErrNotExist):
		s.state = State{Traefik: defaults}
	case err != nil:
		return nil, err
	default:
		if err := json.Unmarshal(b, &s.state); err != nil {
			return nil, fmt.Errorf("state.json: %w", err)
		}
	}
	s.state.normalize()
	return s, nil
}

func (st *State) normalize() {
	if st.Routes == nil {
		st.Routes = []Route{}
	}
	if st.Services == nil {
		st.Services = []Service{}
	}
	if st.Middlewares == nil {
		st.Middlewares = []Middleware{}
	}
	if st.Domains == nil {
		st.Domains = []Domain{}
	}
	if st.Certificates == nil {
		st.Certificates = []UploadedCert{}
	}
}

// Get returns a deep copy, safe to read without the lock.
func (s *Store) Get() State {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return clone(s.state)
}

// Update runs fn on a copy and saves it only if fn returns nil. Every successful update is a history entry.
func (s *Store) Update(user, message string, fn func(*State) error) (State, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	next := clone(s.state)
	if err := fn(&next); err != nil {
		return State{}, err
	}
	next.normalize()
	if err := s.write(next); err != nil {
		return State{}, err
	}
	s.state = next
	s.snapshot(next, user, message)
	return clone(next), nil
}

func (s *Store) write(st State) error {
	b, err := json.MarshalIndent(st, "", "  ")
	if err != nil {
		return err
	}
	return WriteFileAtomic(filepath.Join(s.dir, "state.json"), b, 0o600)
}

func (s *Store) snapshot(st State, user, message string) {
	ids := s.historyIDs()
	id := 1
	if len(ids) > 0 {
		id = ids[len(ids)-1] + 1
	}
	// The admin password hash is not part of history.
	st.Admin = nil
	b, _ := json.Marshal(struct {
		HistoryEntry
		State State `json:"state"`
	}{HistoryEntry{ID: id, Time: time.Now().UTC(), Message: message, User: user}, st})
	_ = WriteFileAtomic(filepath.Join(s.dir, "history", fmt.Sprintf("%08d.json", id)), b, 0o600)
	for len(ids) >= historyKeep {
		_ = os.Remove(filepath.Join(s.dir, "history", fmt.Sprintf("%08d.json", ids[0])))
		ids = ids[1:]
	}
}

func (s *Store) historyIDs() []int {
	entries, _ := os.ReadDir(filepath.Join(s.dir, "history"))
	ids := []int{}
	for _, e := range entries {
		if n, err := strconv.Atoi(strings.TrimSuffix(e.Name(), ".json")); err == nil {
			ids = append(ids, n)
		}
	}
	sort.Ints(ids)
	return ids
}

// History lists entries newest first.
func (s *Store) History() []HistoryEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()
	ids := s.historyIDs()
	out := make([]HistoryEntry, 0, len(ids))
	for i := len(ids) - 1; i >= 0; i-- {
		if e, _, err := s.readSnapshot(ids[i]); err == nil {
			out = append(out, e)
		}
	}
	return out
}

func (s *Store) Snapshot(id int) (HistoryEntry, State, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.readSnapshot(id)
}

func (s *Store) readSnapshot(id int) (HistoryEntry, State, error) {
	b, err := os.ReadFile(filepath.Join(s.dir, "history", fmt.Sprintf("%08d.json", id)))
	if err != nil {
		return HistoryEntry{}, State{}, err
	}
	var v struct {
		HistoryEntry
		State State `json:"state"`
	}
	if err := json.Unmarshal(b, &v); err != nil {
		return HistoryEntry{}, State{}, err
	}
	v.State.normalize()
	return v.HistoryEntry, v.State, nil
}

func clone(st State) State {
	b, _ := json.Marshal(st)
	var out State
	_ = json.Unmarshal(b, &out)
	out.normalize()
	return out
}

// WriteFileAtomic writes to a temp file in the same folder and renames it, so readers never see half a file.
func WriteFileAtomic(path string, data []byte, perm os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), ".tmp-*")
	if err != nil {
		return err
	}
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		os.Remove(tmp.Name())
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmp.Name())
		return err
	}
	if err := os.Chmod(tmp.Name(), perm); err != nil {
		os.Remove(tmp.Name())
		return err
	}
	return os.Rename(tmp.Name(), path)
}

func NewID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
