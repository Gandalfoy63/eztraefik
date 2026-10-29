// Docs: docs/04 - Architecture/Dynamic Config.md
package traefik

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
)

// M is an ordered-by-key map for YAML output. Keys are sorted so the file is stable between saves.
type M = map[string]any

// ToYAML renders maps, slices, strings, numbers and bools as block YAML. Enough for Traefik's file provider.
func ToYAML(v any) string {
	var b strings.Builder
	writeYAML(&b, v, 0, false)
	return b.String()
}

func writeYAML(b *strings.Builder, v any, indent int, inList bool) {
	pad := strings.Repeat("  ", indent)
	switch t := v.(type) {
	case map[string]any:
		keys := make([]string, 0, len(t))
		for k := range t {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for i, k := range keys {
			p := pad
			if inList && i == 0 {
				p = ""
			}
			val := t[k]
			if isScalar(val) {
				fmt.Fprintf(b, "%s%s: %s\n", p, key(k), scalar(val))
			} else if isEmpty(val) {
				fmt.Fprintf(b, "%s%s: %s\n", p, key(k), emptyOf(val))
			} else {
				fmt.Fprintf(b, "%s%s:\n", p, key(k))
				writeYAML(b, val, indent+1, false)
			}
		}
	case []any:
		for _, item := range t {
			if isScalar(item) {
				fmt.Fprintf(b, "%s- %s\n", pad, scalar(item))
			} else {
				fmt.Fprintf(b, "%s- ", pad)
				writeYAML(b, item, indent+1, true)
			}
		}
	case []string:
		items := make([]any, len(t))
		for i, s := range t {
			items[i] = s
		}
		writeYAML(b, items, indent, inList)
	case []map[string]any:
		items := make([]any, len(t))
		for i, s := range t {
			items[i] = s
		}
		writeYAML(b, items, indent, inList)
	}
}

func isScalar(v any) bool {
	switch v.(type) {
	case string, bool, int, int64, float64, nil:
		return true
	}
	return false
}

func isEmpty(v any) bool {
	switch t := v.(type) {
	case map[string]any:
		return len(t) == 0
	case []any:
		return len(t) == 0
	case []string:
		return len(t) == 0
	case []map[string]any:
		return len(t) == 0
	}
	return false
}

func emptyOf(v any) string {
	if _, ok := v.(map[string]any); ok {
		return "{}"
	}
	return "[]"
}

func key(k string) string {
	for _, r := range k {
		if !(r == '-' || r == '_' || r == '.' || r >= '0' && r <= '9' || r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z') {
			return strconv.Quote(k)
		}
	}
	return k
}

func scalar(v any) string {
	switch t := v.(type) {
	case nil:
		return "null"
	case bool:
		return strconv.FormatBool(t)
	case int:
		return strconv.Itoa(t)
	case int64:
		return strconv.FormatInt(t, 10)
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64)
	case string:
		// Always quote strings: rules contain backticks, colons and other YAML-special characters.
		return strconv.Quote(t)
	}
	return strconv.Quote(fmt.Sprint(v))
}
