// Docs: docs/03 - Features/Auth.md
// Reference: docs/00 - Downloaded Docs/Go/crypto-pbkdf2.md
package auth

import (
	"crypto/md5"
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

const iterations = 600_000 // OWASP 2023 guidance for PBKDF2-HMAC-SHA256

// HashPassword returns "pbkdf2-sha256$<iter>$<salt>$<key>".
func HashPassword(pw string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key, err := pbkdf2.Key(sha256.New, pw, salt, iterations, 32)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("pbkdf2-sha256$%d$%s$%s", iterations, hex.EncodeToString(salt), hex.EncodeToString(key)), nil
}

func CheckPassword(hash, pw string) bool {
	parts := strings.Split(hash, "$")
	if len(parts) != 4 || parts[0] != "pbkdf2-sha256" {
		return false
	}
	iter, err := strconv.Atoi(parts[1])
	if err != nil {
		return false
	}
	salt, err1 := hex.DecodeString(parts[2])
	want, err2 := hex.DecodeString(parts[3])
	if err1 != nil || err2 != nil {
		return false
	}
	got, err := pbkdf2.Key(sha256.New, pw, salt, iter, len(want))
	return err == nil && subtle.ConstantTimeCompare(got, want) == 1
}

// Sessions are kept in memory: restarting eztraefik signs everyone out.
type Sessions struct {
	mu     sync.Mutex
	byID   map[string]session
	TTL    time.Duration
	Secure bool

	failMu sync.Mutex
	fails  map[string][]time.Time
}

type session struct {
	user    string
	expires time.Time
}

const CookieName = "ezt_session"

func NewSessions() *Sessions {
	return &Sessions{byID: map[string]session{}, TTL: 7 * 24 * time.Hour, fails: map[string][]time.Time{}}
}

func (s *Sessions) Create(w http.ResponseWriter, user string) {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	id := base64.RawURLEncoding.EncodeToString(b)
	s.mu.Lock()
	s.byID[id] = session{user: user, expires: time.Now().Add(s.TTL)}
	s.mu.Unlock()
	http.SetCookie(w, &http.Cookie{Name: CookieName, Value: id, Path: "/", HttpOnly: true, Secure: s.Secure,
		SameSite: http.SameSiteStrictMode, MaxAge: int(s.TTL.Seconds())})
}

func (s *Sessions) User(r *http.Request) (string, bool) {
	c, err := r.Cookie(CookieName)
	if err != nil {
		return "", false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, ok := s.byID[c.Value]
	if !ok || time.Now().After(sess.expires) {
		delete(s.byID, c.Value)
		return "", false
	}
	return sess.user, true
}

func (s *Sessions) Destroy(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(CookieName); err == nil {
		s.mu.Lock()
		delete(s.byID, c.Value)
		s.mu.Unlock()
	}
	http.SetCookie(w, &http.Cookie{Name: CookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, SameSite: http.SameSiteStrictMode})
}

// DestroyAll signs every session out, used after a password change.
func (s *Sessions) DestroyAll() {
	s.mu.Lock()
	s.byID = map[string]session{}
	s.mu.Unlock()
}

// Allow limits login attempts: 10 failures per 15 minutes per client.
func (s *Sessions) Allow(client string) bool {
	s.failMu.Lock()
	defer s.failMu.Unlock()
	cut := time.Now().Add(-15 * time.Minute)
	kept := s.fails[client][:0]
	for _, t := range s.fails[client] {
		if t.After(cut) {
			kept = append(kept, t)
		}
	}
	s.fails[client] = kept
	return len(kept) < 10
}

func (s *Sessions) Fail(client string) {
	s.failMu.Lock()
	s.fails[client] = append(s.fails[client], time.Now())
	s.failMu.Unlock()
}

// APR1 hashes a password the way htpasswd -m does. Traefik's BasicAuth middleware accepts it.
func APR1(password string) string {
	saltBytes := make([]byte, 8)
	_, _ = rand.Read(saltBytes)
	const itoa64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	salt := make([]byte, 8)
	for i, b := range saltBytes {
		salt[i] = itoa64[int(b)%64]
	}
	return apr1(password, string(salt))
}

func apr1(pw, salt string) string {
	const magic = "$apr1$"
	const itoa64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	alt := md5.Sum([]byte(pw + salt + pw))
	ctx := []byte(pw + magic + salt)
	for i := len(pw); i > 0; i -= 16 {
		ctx = append(ctx, alt[:min(i, 16)]...)
	}
	for i := len(pw); i > 0; i >>= 1 {
		if i&1 == 1 {
			ctx = append(ctx, 0)
		} else {
			ctx = append(ctx, pw[0])
		}
	}
	final := md5.Sum(ctx)
	for i := 0; i < 1000; i++ {
		var b []byte
		if i&1 == 1 {
			b = append(b, pw...)
		} else {
			b = append(b, final[:]...)
		}
		if i%3 != 0 {
			b = append(b, salt...)
		}
		if i%7 != 0 {
			b = append(b, pw...)
		}
		if i&1 == 1 {
			b = append(b, final[:]...)
		} else {
			b = append(b, pw...)
		}
		final = md5.Sum(b)
	}
	enc := func(a, b, c byte, n int) string {
		v := uint(a)<<16 | uint(b)<<8 | uint(c)
		out := make([]byte, n)
		for i := 0; i < n; i++ {
			out[i] = itoa64[v&0x3f]
			v >>= 6
		}
		return string(out)
	}
	f := final
	s := enc(f[0], f[6], f[12], 4) + enc(f[1], f[7], f[13], 4) + enc(f[2], f[8], f[14], 4) +
		enc(f[3], f[9], f[15], 4) + enc(f[4], f[10], f[5], 4) + enc(0, 0, f[11], 2)
	return magic + salt + "$" + s
}
