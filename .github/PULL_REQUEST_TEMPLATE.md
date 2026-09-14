## Summary of Changes

<!-- Provide a clear and concise description of what this PR accomplishes. -->

### Related Issue / Roadmap Item

- Closes #<!-- issue number -->
- Roadmap Item: `<!-- e.g. [FEAT] [ASR] Parakeet ONNX Fast Tier -->`

---

## Type of Change

- [ ] 🚀 New Feature (`[FEAT]`)
- [ ] 🐛 Bug Fix (`[FIX]`)
- [ ] ⚡ Performance Optimization (`[PERF]`)
- [ ] 🎨 UI / UX Enhancement
- [ ] 📝 Documentation Update (`[DOCS]`)
- [ ] 🧪 Tests & Quality Assurance (`[TEST]`)
- [ ] 🔨 Refactoring & Architecture Cleanup

---

## Testing & Verification

### Automated Checks

- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passed with 0 failures.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml bindings_are_up_to_date` passed (Tauri Specta bindings are synchronized).
- [ ] `bun run build` (or `npm run build`) passed with 0 TypeScript/Vite errors.

### Manual QA & Verification Steps

1. <!-- Step 1 -->
2. <!-- Step 2 -->
3. <!-- Step 3 -->

---

## UI Changes (Screenshots / Recordings)

<!-- If this PR alters or adds UI components in the dashboard or floating pill overlay, attach screenshots or screen recordings below. -->

| Before              | After        |
| :------------------ | :----------- |
| _Screenshot / None_ | _Screenshot_ |

---

## Architecture & Code Quality Checklist

- [ ] **Source of Truth (SOT) Headers**: Every new Rust (`.rs`) and TypeScript (`.ts`/`.tsx`) file includes standard SOT comments (`WHAT:`, `WHY:`, `WHERE:`, `SOURCE OF TRUTH KEYWORDS:`).
- [ ] **Layering Compliance**: Rust adapters and services adhere strictly to hexagonal ports and domain boundaries (no upward imports).
- [ ] **Strict Privacy & Zero Cloud Egress**: Zero cloud telemetry, audio is processed 100% locally on-device in RAM and zero unvetted network sockets are created.
- [ ] **Clean TypeScript**: No `any` types or unsafe type assertions.
- [ ] **Documentation**: `TODO.md` or relevant documentation in `/docs` updated if user-facing behavior changed.
