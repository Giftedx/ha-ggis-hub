package gate

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

type packageManifest struct {
	PackageManager string `json:"packageManager"`
}

type pnpmResolution struct {
	exe string
	dir string
}

var pnpmOnce sync.Once
var pnpmResolved *pnpmResolution

func resolvePinnedPnpm() *pnpmResolution {
	pnpmOnce.Do(func() {
		version := pinnedPnpmVersion()
		if version == "" {
			return
		}
		for _, candidate := range pnpmCandidates(os.Getenv("PATH"), runtime.GOOS) {
			if pnpmVersion(candidate) == version {
				pnpmResolved = &pnpmResolution{
					exe: candidate,
					dir: filepath.Dir(candidate),
				}
				return
			}
		}
	})
	return pnpmResolved
}

func pinnedPnpmVersion() string {
	root, ok := findPackageJSON()
	if !ok {
		return ""
	}
	body, err := os.ReadFile(root)
	if err != nil {
		return ""
	}
	var manifest packageManifest
	if err := json.Unmarshal(body, &manifest); err != nil {
		return ""
	}
	return parsePnpmPackageManager(manifest.PackageManager)
}

func findPackageJSON() (string, bool) {
	dir, err := os.Getwd()
	if err != nil {
		return "", false
	}
	for {
		candidate := filepath.Join(dir, "package.json")
		if _, err := os.Stat(candidate); err == nil {
			return candidate, true
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", false
		}
		dir = parent
	}
}

func parsePnpmPackageManager(value string) string {
	const prefix = "pnpm@"
	if !strings.HasPrefix(value, prefix) {
		return ""
	}
	return strings.TrimSpace(strings.SplitN(strings.TrimPrefix(value, prefix), "+", 2)[0])
}

func pnpmCandidates(pathValue string, goos string) []string {
	var names []string
	if goos == "windows" {
		names = []string{"pnpm.cmd", "pnpm.exe", "pnpm.bat", "pnpm"}
	} else {
		names = []string{"pnpm"}
	}

	seen := make(map[string]struct{})
	var out []string
	for _, dir := range filepath.SplitList(pathValue) {
		if dir == "" {
			continue
		}
		for _, name := range names {
			candidate := filepath.Join(dir, name)
			key := strings.ToLower(candidate)
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
				out = append(out, candidate)
			}
		}
	}
	return out
}

func pnpmVersion(candidate string) string {
	cmd := exec.Command(candidate, "-v")
	cmd.WaitDelay = time.Second
	var out strings.Builder
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return ""
	}
	return strings.TrimSpace(out.String())
}
