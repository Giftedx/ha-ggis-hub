// Package report builds the signed JSON report that `haggis-eval all`
// emits. The signature is the FNV-1a 64-bit digest of the report payload
// (every field except the signature itself) so tampering with the report
// after writing is detectable.
package report

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/fnv"
	"github.com/aggis/ha-ggis-hub/tools/haggis-eval/internal/gate"
)

// Report is the on-disk JSON shape.
type Report struct {
	Run           string        `json:"run"`            // identifier for this invocation
	GeneratedAt   time.Time     `json:"generated_at"`   //
	OverallStatus gate.Status   `json:"overall_status"` //
	Gates         []gate.Result `json:"gates"`          //
	Signature     uint64        `json:"signature"`      // FNV-1a 64-bit of (Run, GeneratedAt, OverallStatus, Gates)
}

// payloadShape mirrors Report minus the Signature field so the signed
// bytes are deterministic regardless of struct evolution.
type payloadShape struct {
	Run           string        `json:"run"`
	GeneratedAt   time.Time     `json:"generated_at"`
	OverallStatus gate.Status   `json:"overall_status"`
	Gates         []gate.Result `json:"gates"`
}

// Build assembles a Report from a list of gate results and signs it.
func Build(run string, generatedAt time.Time, gates []gate.Result) Report {
	overall := gate.StatusPass
	for _, g := range gates {
		if g.Status != gate.StatusPass {
			overall = gate.StatusFail
			break
		}
	}
	r := Report{
		Run:           run,
		GeneratedAt:   generatedAt,
		OverallStatus: overall,
		Gates:         gates,
	}
	body, err := json.Marshal(payload(r))
	if err != nil {
		// json.Marshal of a fixed-shape struct never fails for these
		// types — panic surfaces a logic bug rather than masking it.
		panic(fmt.Sprintf("internal: report payload marshal failed: %v", err))
	}
	r.Signature = fnv.Fnv1a64(body)
	return r
}

// payload extracts the signable payload from a Report.
func payload(r Report) payloadShape {
	return payloadShape{
		Run:           r.Run,
		GeneratedAt:   r.GeneratedAt,
		OverallStatus: r.OverallStatus,
		Gates:         r.Gates,
	}
}

// Write writes the report as pretty-printed JSON to outDir/<run>-<utc>.json.
// Returns the absolute path written.
func (r Report) Write(outDir string) (string, error) {
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return "", fmt.Errorf("create %s: %w", outDir, err)
	}
	filename := fmt.Sprintf("%s-%s.json", r.Run, r.GeneratedAt.UTC().Format("20060102T150405Z"))
	path := filepath.Join(outDir, filename)
	bytes, err := json.MarshalIndent(r, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal report: %w", err)
	}
	if err := os.WriteFile(path, bytes, 0o644); err != nil {
		return "", fmt.Errorf("write %s: %w", path, err)
	}
	return path, nil
}
