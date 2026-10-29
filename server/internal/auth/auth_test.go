package auth

import "testing"

// Reference values from `openssl passwd -apr1 -salt <salt> <password>`.
func TestAPR1MatchesOpenSSL(t *testing.T) {
	cases := []struct{ pw, salt, want string }{
		{"secret123", "abcdefgh", "$apr1$abcdefgh$aQ26yFH6V5G5PJBY/utXg/"},
		{"a longer password with spaces!!", "x1Y2z3W4", "$apr1$x1Y2z3W4$jLytm9tP8MIghuKtunnGb0"},
	}
	for _, c := range cases {
		if got := apr1(c.pw, c.salt); got != c.want {
			t.Errorf("apr1(%q) = %s, want %s", c.pw, got, c.want)
		}
	}
}

func TestPasswordHash(t *testing.T) {
	h, err := HashPassword("correct horse battery")
	if err != nil {
		t.Fatal(err)
	}
	if !CheckPassword(h, "correct horse battery") {
		t.Error("right password rejected")
	}
	if CheckPassword(h, "wrong") {
		t.Error("wrong password accepted")
	}
}
