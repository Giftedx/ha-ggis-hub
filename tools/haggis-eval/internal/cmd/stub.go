package cmd

import (
	"fmt"
	"os"
)

// ExConfig is sysexits.h EX_CONFIG — "configuration error"; the gate
// exists in the spec but its prerequisites (Playwright, size-limit,
// public/_headers, etc) have not been wired yet.
const ExConfig = 78

// Stub prints a one-line "not configured" message and returns ExConfig.
func Stub(name, blocker string) int {
	fmt.Fprintf(os.Stderr, "haggis-eval: %q is declared in spec §2.7 but not yet wired (%s)\n", name, blocker)
	return ExConfig
}
