package fnv

import "testing"

func TestFnv1a64ReferenceVectors(t *testing.T) {
	cases := []struct {
		input []byte
		want  uint64
	}{
		{[]byte(""), 0xcbf29ce484222325},
		{[]byte("a"), 0xaf63dc4c8601ec8c},
		{[]byte("foobar"), 0x85944171f73967e8},
		{[]byte("chongo was here!\n"), 0x46810940eff5f915},
	}
	for _, tc := range cases {
		got := Fnv1a64(tc.input)
		if got != tc.want {
			t.Errorf("Fnv1a64(%q) = %#x, want %#x", tc.input, got, tc.want)
		}
	}
}

func TestStreamingEqualsOneShot(t *testing.T) {
	input := []byte("the quick brown haggis jumps over the lazy bothy")
	hasher := NewHasher()
	for i := 0; i < len(input); i += 7 {
		end := i + 7
		if end > len(input) {
			end = len(input)
		}
		hasher.Write(input[i:end])
	}
	got := hasher.Digest()
	want := Fnv1a64(input)
	if got != want {
		t.Errorf("streaming digest %#x != one-shot %#x", got, want)
	}
}
