# Package encoding/pem

Source: `go doc -all encoding/pem` from Go 1.27.3 (official standard library docs, also at https://pkg.go.dev/encoding/pem).

```text
package pem // import "encoding/pem"

Package pem implements the PEM data encoding, which originated in Privacy
Enhanced Mail. The most common use of PEM encoding today is in TLS keys and
certificates. See RFC 1421.

FUNCTIONS

func Encode(out io.Writer, b *Block) error
    Encode writes the PEM encoding of b to out.

func EncodeToMemory(b *Block) []byte
    EncodeToMemory returns the PEM encoding of b.

    If b has invalid headers and cannot be encoded, EncodeToMemory returns nil.
    If it is important to report details about this error case, use Encode
    instead.


TYPES

type Block struct {
	Type    string            // The type, taken from the preamble (i.e. "RSA PRIVATE KEY").
	Headers map[string]string // Optional headers.
	Bytes   []byte            // The decoded bytes of the contents. Typically a DER encoded ASN.1 structure.
}
    A Block represents a PEM encoded structure.

    The encoded form is:

        -----BEGIN Type-----
        Headers
        base64-encoded Bytes
        -----END Type-----

    where Block.Headers is a possibly empty sequence of Key: Value lines.

func Decode(data []byte) (p *Block, rest []byte)
    Decode will find the next PEM formatted block (certificate, private key etc)
    in the input. It returns that block and the remainder of the input. If no
    PEM data is found, p is nil and the whole of the input is returned in rest.
    Blocks must start at the beginning of a line and end at the end of a line.
```
