// Docs: docs/03 - Features/Certificates.md
// Reference: docs/00 - Downloaded Docs/Traefik/reference/install-configuration/tls/certificate-resolvers/acme.md
package traefik

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// Cert is one certificate Traefik can serve, from an ACME resolver or uploaded.
type Cert struct {
	ID        string    `json:"id"`
	Source    string    `json:"source"` // acme or uploaded
	Resolver  string    `json:"resolver,omitempty"`
	Main      string    `json:"main"`
	Domains   []string  `json:"domains"`
	Issuer    string    `json:"issuer"`
	NotAfter  time.Time `json:"notAfter"`
	NotBefore time.Time `json:"notBefore"`
	Name      string    `json:"name,omitempty"`
}

// ACMECerts reads every resolver storage file in sharedDir/acme.
func ACMECerts(sharedDir string) []Cert {
	files, _ := filepath.Glob(filepath.Join(sharedDir, "acme", "*.json"))
	out := []Cert{}
	for _, f := range files {
		b, err := os.ReadFile(f)
		if err != nil {
			continue
		}
		var storage map[string]struct {
			Certificates []struct {
				Domain struct {
					Main string   `json:"main"`
					SANs []string `json:"sans"`
				} `json:"domain"`
				Certificate string `json:"certificate"`
			} `json:"Certificates"`
		}
		if json.Unmarshal(b, &storage) != nil {
			continue
		}
		for resolver, data := range storage {
			for _, c := range data.Certificates {
				raw, err := base64.StdEncoding.DecodeString(c.Certificate)
				if err != nil {
					continue
				}
				x, err := ParseLeaf(raw)
				if err != nil {
					continue
				}
				out = append(out, Cert{
					ID: "acme:" + resolver + ":" + c.Domain.Main, Source: "acme", Resolver: resolver, Main: c.Domain.Main,
					Domains: certNames(x), Issuer: x.Issuer.CommonName, NotAfter: x.NotAfter, NotBefore: x.NotBefore,
				})
			}
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Main < out[j].Main })
	return out
}

// ParseLeaf returns the first certificate in a PEM bundle.
func ParseLeaf(pemData []byte) (*x509.Certificate, error) {
	for {
		block, rest := pem.Decode(pemData)
		if block == nil {
			return nil, errors.New("no certificate found in PEM data")
		}
		if block.Type == "CERTIFICATE" {
			return x509.ParseCertificate(block.Bytes)
		}
		pemData = rest
	}
}

// ValidatePair checks that the certificate and key belong together and returns the leaf.
func ValidatePair(certPEM, keyPEM []byte) (*x509.Certificate, error) {
	if _, err := tls.X509KeyPair(certPEM, keyPEM); err != nil {
		return nil, err
	}
	return ParseLeaf(certPEM)
}

func certNames(x *x509.Certificate) []string {
	names := append([]string{}, x.DNSNames...)
	if len(names) == 0 && x.Subject.CommonName != "" {
		names = append(names, x.Subject.CommonName)
	}
	return names
}

func CertNames(x *x509.Certificate) []string { return certNames(x) }

// Covers reports whether a certificate name (possibly a wildcard) matches a host.
func Covers(name, host string) bool {
	name, host = strings.ToLower(name), strings.ToLower(host)
	if name == host {
		return true
	}
	if strings.HasPrefix(name, "*.") {
		suffix := name[1:]
		return strings.HasSuffix(host, suffix) && !strings.Contains(strings.TrimSuffix(host, suffix), ".")
	}
	return false
}
