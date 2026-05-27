# Quality Realignment Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Execution status (2026-05-26):** Completed in this repository. This plan's original completion evidence has been superseded by later gate additions; use the newest `CHANGELOG.md` verification block for current test counts, report paths, and signatures.

**Goal:** Fix the remaining weaknesses in the trust-recovery slice so reports are actually verifiable, browser orchestration is honestly covered, CI is strong without wasteful duplication, and docs stop overclaiming.

**Architecture:** Treat quality evidence as a product surface, not a side effect. The haggis-eval report gets a machine-safe signature format and verifier command; browser orchestration gets focused lifecycle and event tests instead of a blanket coverage escape; CI is reshaped so PRs run one coherent strong gate and main runs the release gate.

**Tech Stack:** Go 1.22 haggis-eval CLI, TypeScript/Vitest/Vite, Playwright browser smokes, GitHub Actions, Rust cargo/clippy.

---

## File Structure

- Modify `tools/haggis-eval/internal/report/report.go`: encode signatures as hex strings and expose deterministic payload/signature helpers.
- Modify `tools/haggis-eval/internal/report/report_test.go`: prove string signatures avoid JavaScript precision loss and verifier logic rejects tampering.
- Create `tools/haggis-eval/internal/cmd/verify_report.go`: CLI gate for verifying an existing `target/haggis-eval/*.json` report.
- Modify `tools/haggis-eval/internal/cmd/registry.go`: register `verify-report` only as a direct subcommand, not a slice gate.
- Modify `tools/haggis-eval/main.go`: wire `verify-report <path>` and document it in usage.
- Modify `src/hub/bothy-runtime.ts`: remove awkward status text construction and add typed listener helpers or a narrower listener bag API.
- Modify `src/hub/bothy-runtime.test.ts`: test status text grammar, listener option removal, and pointer listener behavior.
- Modify `src/hub/bothy-module.ts`: keep pointer callbacks typed as `PointerEvent`, reduce unsafe casts, and isolate any unavoidable DOM orchestration.
- Create `src/hub/bothy-module-lifecycle.test.ts` if practical: node-level fake shell test for mount/destroy listener cleanup without WASM. If WASM import makes this too artificial, do not fake the browser; instead move another testable lifecycle helper to `bothy-runtime.ts`.
- Modify `vite.config.ts`: narrow or remove `src/hub/bothy-module.ts` coverage exclusion after extracting lifecycle helpers.
- Modify `.github/workflows/ci.yml`: remove duplicated PR work by keeping `haggis-eval slice pre-merge` as the strong PR job and making `pnpm verify` either a local command only or a lightweight dependent-free smoke job only if there is a clear timing benefit.
- Modify `tools/haggis-eval/slices.json`: keep pre-merge as the single source of PR truth.
- Modify docs: `README.md`, `WRITEUP.md`, `docs/README.md`, `docs/foundation/07-quality-gates.md`, `docs/architecture/evaluation-strategy.md`, `docs/architecture/testing-strategy.md`, `tools/haggis-eval/README.md`, `docs/audit/2026-05-26-quality-realignment.md`, `CHANGELOG.md`.

---

### Task 1: Make haggis-eval Signatures Machine-Safe

**Files:**
- Modify `tools/haggis-eval/internal/report/report.go`
- Modify `tools/haggis-eval/internal/report/report_test.go`

- [ ] **Step 1: Write failing tests for JSON-safe signature encoding**

Add tests proving the JSON signature is a string and survives JavaScript-style parsing without numeric precision loss:

```go
func TestSignatureSerializesAsHexString(t *testing.T) {
	r := Build("test-run", time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC), sampleResults())
	bytes, err := json.Marshal(r)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var raw map[string]any
	if err := json.Unmarshal(bytes, &raw); err != nil {
		t.Fatalf("unmarshal raw: %v", err)
	}
	signature, ok := raw["signature"].(string)
	if !ok {
		t.Fatalf("signature encoded as %T; want string", raw["signature"])
	}
	if !strings.HasPrefix(signature, "0x") || len(signature) != 18 {
		t.Fatalf("signature = %q; want 0x plus 16 lowercase hex digits", signature)
	}
}
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
cd tools/haggis-eval
go test ./internal/report -run TestSignatureSerializesAsHexString
```

Expected before implementation: fail because `signature` is a JSON number.

- [ ] **Step 3: Change the report model**

Change `Report.Signature` from `uint64` to `string`, keep the digest calculation as `uint64`, and format it with fixed-width hex:

```go
type Report struct {
	Run           string        `json:"run"`
	GeneratedAt   time.Time     `json:"generated_at"`
	OverallStatus gate.Status   `json:"overall_status"`
	Gates         []gate.Result `json:"gates"`
	Signature     string        `json:"signature"`
}

func FormatSignature(value uint64) string {
	return fmt.Sprintf("0x%016x", value)
}
```

Inside `Build`, set:

```go
r.Signature = FormatSignature(fnv.Fnv1a64(body))
```

- [ ] **Step 4: Update existing report tests**

Update `TestSignatureIsFnv1aOfPayload` to compare against `FormatSignature(want)` instead of raw `uint64`.

- [ ] **Step 5: Run report package tests**

Run:

```bash
cd tools/haggis-eval
go test ./internal/report
```

Expected: PASS.

---

### Task 2: Add a Real Report Verifier

**Files:**
- Create `tools/haggis-eval/internal/cmd/verify_report.go`
- Modify `tools/haggis-eval/main.go`
- Modify `tools/haggis-eval/README.md`
- Modify `docs/audit/2026-05-26-quality-realignment.md`

- [ ] **Step 1: Write tests for verifier behavior**

Add a test in `tools/haggis-eval/internal/cmd` that writes a report, verifies it, mutates one field, and expects verification failure:

```go
func TestVerifyReportRejectsTamperedPayload(t *testing.T) {
	dir := t.TempDir()
	r := report.Build("all", time.Date(2026, 5, 26, 3, 19, 18, 0, time.UTC), []gate.Result{
		{Category: "ts", Name: "vitest-run", Status: gate.StatusPass, ExitCode: 0, DurationMs: 1, Command: "pnpm exec vitest run"},
	})
	path, err := r.Write(dir)
	if err != nil {
		t.Fatalf("write report: %v", err)
	}
	if result := VerifyReport(path); result.Status != gate.StatusPass {
		t.Fatalf("VerifyReport clean status = %s; want PASS", result.Status)
	}
	bytes, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read report: %v", err)
	}
	tampered := strings.Replace(string(bytes), `"status": "PASS"`, `"status": "FAIL"`, 1)
	if err := os.WriteFile(path, []byte(tampered), 0o644); err != nil {
		t.Fatalf("write tampered report: %v", err)
	}
	if result := VerifyReport(path); result.Status != gate.StatusFail {
		t.Fatalf("VerifyReport tampered status = %s; want FAIL", result.Status)
	}
}
```

- [ ] **Step 2: Implement `VerifyReport(path string) gate.Result`**

Read the JSON, unmarshal into `report.Report`, rebuild the payload without `signature`, compute `FormatSignature(fnv.Fnv1a64(payloadBytes))`, and compare with the report signature. Return a `gate.Result` with category `report`, name `verify-report`, status PASS/FAIL, and a useful stderr tail on mismatch.

- [ ] **Step 3: Wire CLI**

In `main.go`, add:

```go
case "verify-report":
	if len(os.Args) != 3 {
		fmt.Fprintln(os.Stderr, "usage: haggis-eval verify-report <report.json>")
		os.Exit(2)
	}
	printAndExit("verify-report", []gate.Result{cmd.VerifyReport(os.Args[2])})
```

- [ ] **Step 4: Run verifier tests**

Run:

```bash
cd tools/haggis-eval
go test ./internal/cmd ./internal/report
```

Expected: PASS.

- [ ] **Step 5: Verify a generated report**

Run:

```bash
./tools/haggis-eval/haggis-eval verify-report target/haggis-eval/<report>.json
```

Expected: PASS after regenerating the report with string signatures.

---

### Task 3: Fix Bothy Runtime Copy and Listener Safety

**Files:**
- Modify `src/hub/bothy-runtime.ts`
- Modify `src/hub/bothy-runtime.test.ts`
- Modify `src/hub/bothy-module.ts`

- [ ] **Step 1: Write failing test for duplicate "door door" copy**

Add:

```ts
it('does not append a duplicate door suffix to locked titles', () => {
  expect(launchStatusForDoor('locked-door', registry)).toEqual({
    kind: 'locked',
    statusText: 'Locked Door — comin’ soon.'
  });
});
```

Expected before implementation: fails with `Locked Door door — comin’ soon.`

- [ ] **Step 2: Implement title-aware copy**

Add:

```ts
function formatLockedDoorStatus(title: string): string {
  return /\bdoor$/i.test(title) ? `${title} — comin’ soon.` : `${title} door — comin’ soon.`;
}
```

Use it in `launchStatusForDoor`.

- [ ] **Step 3: Strengthen listener tests**

Extend `createDomListenerBag` tests to assert options are preserved:

```ts
const options = { capture: true } as const;
bag.add(target, 'pointerdown', listener, options);
bag.removeAll();
expect(calls).toEqual([
  ['add', 'pointerdown', options],
  ['remove', 'pointerdown', options]
]);
```

- [ ] **Step 4: Reduce unsafe pointer casts**

Keep handlers in `bothy-module.ts` typed as `PointerEvent` and wrap them at registration if needed:

```ts
function asEventListener<T extends Event>(handler: (event: T) => void): EventListener {
  return (event) => handler(event as T);
}
```

Use one wrapper per pointer handler so the unsafe cast is centralized and testable instead of scattered across the module.

- [ ] **Step 5: Run focused TypeScript tests**

Run:

```bash
pnpm exec vitest run src/hub/bothy-runtime.test.ts
pnpm exec tsc --noEmit
```

Expected: PASS.

---

### Task 4: Replace Blanket Browser-Module Coverage Escape With Narrower Tests

**Files:**
- Modify `src/hub/bothy-runtime.ts`
- Modify `src/hub/bothy-runtime.test.ts`
- Modify `vite.config.ts`
- Modify `docs/architecture/testing-strategy.md`

- [ ] **Step 1: Identify remaining authored logic in `bothy-module.ts`**

Classify each piece:

```text
Pure/testable: listener registration, pointer capture lifecycle, locked-door copy, URL parsing, input packing.
Browser-only: WASM init, RAF loop, real canvas context, Playwright navigation.
```

- [ ] **Step 2: Extract pointer capture lifecycle helper if still inline**

Add pure helper:

```ts
export function finishPointerCapture(options: {
  readonly pointerActive: boolean;
  readonly pointerId: number;
  readonly target: Pick<HTMLCanvasElement, 'hasPointerCapture' | 'releasePointerCapture'>;
}): boolean {
  if (!options.pointerActive) return false;
  if (options.target.hasPointerCapture(options.pointerId)) {
    options.target.releasePointerCapture(options.pointerId);
  }
  return false;
}
```

- [ ] **Step 3: Test pointer capture helper**

Add tests for active/inactive and captured/not-captured cases.

- [ ] **Step 4: Narrow `vite.config.ts` exclusion comment**

If `bothy-module.ts` must remain excluded, say exactly what is excluded:

```ts
'src/hub/bothy-module.ts', // Browser mount orchestration only: WASM init, RAF loop, real DOM/canvas integration. Authored input/lifecycle helpers are unit-tested in bothy-runtime.ts.
```

Do not claim the module is fully covered by Playwright. Say Playwright covers user-visible flows.

- [ ] **Step 5: Run coverage and inspect module summary**

Run:

```bash
pnpm run coverage
```

Expected: thresholds pass; docs list the remaining browser-only exclusion honestly.

---

### Task 5: Fix CI Shape Without Weakening Gates

**Files:**
- Modify `.github/workflows/ci.yml`
- Modify `README.md`
- Modify `docs/foundation/07-quality-gates.md`
- Modify `tools/haggis-eval/slices.json` only if needed

- [ ] **Step 1: Decide the PR contract**

Use this contract:

```text
PR required: haggis-eval slice pre-merge.
Local fast command: pnpm verify.
Main required: haggis-eval all.
```

Do not run both `pnpm verify` and pre-merge in CI unless there is a measured timing reason.

- [ ] **Step 2: Remove duplicated PR job or make it clearly optional**

Preferred CI shape:

```yaml
haggis-eval-pre-merge:
  name: haggis-eval pre-merge (PR gate)
  if: github.event_name == 'pull_request'
```

Remove the separate `ts-verify` job from CI. Keep `pnpm verify` documented as the local fast gate.

- [ ] **Step 3: Keep release gate unchanged**

Do not weaken push-to-main. It stays `haggis-eval all` with report upload.

- [ ] **Step 4: Validate workflow syntax locally if tooling exists**

Run:

```bash
git diff --check .github/workflows/ci.yml
```

If `actionlint` is available, run:

```bash
actionlint .github/workflows/ci.yml
```

Expected: no syntax issues.

---

### Task 6: Regenerate Evidence and Truth-Up Docs

**Files:**
- Modify `README.md`
- Modify `WRITEUP.md`
- Modify `docs/README.md`
- Modify `docs/foundation/07-quality-gates.md`
- Modify `docs/architecture/evaluation-strategy.md`
- Modify `docs/architecture/testing-strategy.md`
- Modify `tools/haggis-eval/README.md`
- Modify `docs/audit/2026-05-26-quality-realignment.md`
- Modify `CHANGELOG.md`

- [ ] **Step 1: Run final verification**

Run:

```bash
pnpm verify
pnpm run coverage
cd tools/haggis-eval && go test ./... && go build .
cd ../..
node scripts/run-browser-smokes.mjs
./tools/haggis-eval/haggis-eval slice pre-merge
./tools/haggis-eval/haggis-eval all
./tools/haggis-eval/haggis-eval verify-report target/haggis-eval/<new-report>.json
```

Expected: every command PASS.

- [ ] **Step 2: Update evidence surfaces**

Update the audit and changelog with:

```text
pnpm verify: exact test count
coverage: exact statement/branch/function/line percentages
haggis-eval all: exact report path
haggis-eval verify-report: PASS
signature: exact string from JSON
```

- [ ] **Step 3: Drift scan**

Run a stale-claim scan against current surfaces, excluding this implementation plan if needed. Check for old report paths/signatures, old test counts, cryptographic-signing overclaims, stale gate-count claims, and future-tense verifier claims.

Expected: only historical changelog/archive hits remain, and current surfaces use the new string-signature/report-verifier language.

- [ ] **Step 4: Final status checks**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intended files changed.

---

## Directional Non-Negotiables

- Do not lower coverage thresholds.
- Do not describe FNV as cryptographic.
- Do not keep JSON `uint64` signatures.
- Do not add a fake unit test around browser orchestration by mocking half the platform.
- Do not keep PR CI duplicated if the stronger gate already runs the same commands.
- Do not update docs before the final report is regenerated.

## Self-Review

Spec coverage:
- Report precision loss: Task 1.
- Missing verifier: Task 2.
- Browser module coverage overclaim: Task 4.
- Pointer cast/type regression: Task 3.
- Bad locked-door copy: Task 3.
- Duplicate PR CI: Task 5.
- Docs/evidence drift: Task 6.

Placeholder scan:
- No TBD/TODO placeholders. Every task has exact files, commands, expected outcomes, and representative code.

Type consistency:
- `Report.Signature` becomes a string everywhere.
- `FormatSignature(uint64) string` is reused by report build and verification.
- `VerifyReport(path string) gate.Result` is a command helper, not a slice gate.
