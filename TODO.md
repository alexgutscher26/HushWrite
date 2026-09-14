# HushWrite — Feature & Improvement Backlog

> Organized by area. Items are roughly priority-ordered within each section.
> Prefix legend: [BUG] · [PERF] · [FEAT] · [DX] · [UX] · [INFRA] · [WIN] · [SEC] · [BIZ] · [SEO] · [CONTENT] · [MARKETING] · [VIRALITY]
>
> Status: `[x]` done · `[ ]` open · `[~]` in-progress · `[!]` blocked

---

## Table of Contents

1. [Core Reliability & Habit Formation](#core-reliability--habit-formation-activation--daily-habit)
2. [Windows-Specific](#windows-specific)
3. [Audio Capture & VAD](#audio-capture--vad)
4. [Transcription Engine](#transcription-engine)
5. [Text Enhancement & Post-Processing](#text-enhancement--post-processing)
6. [Clipboard & Delivery](#clipboard--delivery)
7. [UI — Pill](#ui--pill)
8. [UI — Dashboard / Settings](#ui--dashboard--settings)
9. [Hotkeys](#hotkeys)
10. [Privacy & Security](#privacy--security)
11. [Privacy & Auditable Security](#privacy--auditable-security)
12. [Developer Beachhead & Code-Aware Dictation](#developer-beachhead--code-aware-dictation)
13. [Internationalization & Languages](#internationalization--languages)
14. [Updates & Distribution](#updates--distribution)
15. [Architecture & Reliability](#architecture--reliability)
16. [Latency & Performance Benchmarks](#latency--performance-benchmarks)
17. [Power-User Customization & Vocabulary Ownership](#power-user-customization--vocabulary-ownership)
18. [High-Intent SEO & Trust-Earning Content](#high-intent-seo--trust-earning-content)
19. [Sustainable Commercialization & Product Virality](#sustainable-commercialization--product-virality)
20. [Analytics & Stats](#analytics--stats)
21. [Integrations](#integrations)
22. [Known Bugs & Tech Debt](#known-bugs--tech-debt)
23. [Accessibility](#accessibility)
24. [Testing & Quality Assurance](#testing--quality-assurance)
25. [Documentation](#documentation)
26. [Community & Ecosystem](#community--ecosystem)
27. [Mobile & Cross-Platform](#mobile--cross-platform)
28. [AI & Machine Learning Roadmap](#ai--machine-learning-roadmap)
29. [Air-Gap & Verifiable Offline Mode](#air-gap--verifiable-offline-mode)
30. [Onboarding & Growth Experiments](#onboarding--growth-experiments)
31. [macOS Feature Parity](#macos-feature-parity)
32. [Enterprise & Compliance](#enterprise--compliance)
33. [Release Engineering & CI/CD](#release-engineering--cicd)
34. [Website & Marketing Engineering](#website--marketing-engineering)
35. [Observability & Diagnostics](#observability--diagnostics)
36. [Monetization Experiments](#monetization-experiments)

---

## Core Reliability & Habit Formation (Activation & Daily Habit)

> Goal: ensure every user has a "first wow" within 5 minutes and builds a daily dictation habit within 7 days.

- [x] [UX] 5-minute "first wow" onboarding flow: mic permissions -> model weight download -> first in-app dictation test without opening external editors.
- [x] [WIN] Push-to-talk reliability: dedicated low-latency keyboard hook with modifier tap/hold detection (Alt+Space / Option+Space).
- [x] [WIN] Non-conflicting shortcut handler: suppress system menu conflict (WM_SYSCOMMAND SC_KEYMENU) when target focus is Win32.
- [x] [UX] Safe microphone status: live audio level visualization in floating pill + instant silence warning.
- [x] [UX] Fast audio error recovery: auto-reopen stream on device switch within 500ms before failing session.
- [x] [FEAT] Low-end hardware presets: downloadable Tiny & Base Q5_0 quantizations for budget laptops without dedicated GPUs.
- [x] [FEAT] Interruption & backtracking correction: detect voice backtracks ("no wait", "scratch that") and scrub previous segment in memory before injection.
  - Detect phrase variants: "no wait", "scratch that", "delete that", "undo", "never mind", "cancel that", "forget it"
  - Identify the segment boundary and remove only the corrected span, not the whole transcript
  - Re-arm automatically after the cancel command so the user can continue
  - Show a brief pill flash ("Removed last segment") as confirmation
- [x] [UX] First-run interactive dictation tutorial: guided step-by-step practice dictating a messy thought into a clean formatted email or commit.
  - Step 1: speak a short messy sentence (fillers allowed)
  - Step 2: show before/after transformation with the post-processing rules
  - Step 3: demonstrate paste into a dummy text field inside the onboarding window
  - Step 4: show the history entry and the WPM summary
  - Skip button that marks tutorial complete and never shows again
- [x] [UX] Habit-formation streak tracker: show a daily streak counter in the dashboard header as a low-pressure retention nudge.
  - Only count days with at least 3 successful sessions or 100 words dictated
  - Milestone badges at 7, 30, 90, and 365 days
  - Streak calculated from session timestamps in SQLite — no external dependency
- [x] [UX] Re-engagement prompt: if 3+ days pass with zero sessions, show a soft notification with a one-tap re-activation shortcut.
  - Show as Windows toast, not an in-app modal
  - Respect system Do Not Disturb state
  - Max one prompt per 7-day idle window to avoid spam
- [x] [FEAT] Adaptive onboarding re-entry points: if user skips onboarding mid-way, resume from the last completed step rather than restarting.
  - Persist onboarding step index in registry
  - Show a "Resume Setup" card in the dashboard for users with incomplete onboarding
- [x] [PERF] Sub-100ms hotkey-to-recording latency: profile and reduce the gap between keydown event and first audio sample captured to under 100ms.
  - Instrument with `tracing::span!` from keydown in the keyboard hook to first AudioData event
  - Target: p99 under 100ms on a mid-range 2022 laptop without GPU

---

## Windows-Specific

- [x] [BUG] [WIN] Text injection fails in elevated-privilege apps (e.g. Task Manager, regedit). SendInput is blocked by UIPI when the target process runs at a higher integrity level. Need UAC elevation detection and a graceful fallback message.
- [x] [BUG] [WIN] Clipboard not restored when target app does a fast Ctrl+V itself — arboard sets the clipboard, a race with the target app's own paste listener can clear it before Ctrl+V fires. Investigate using SetClipboardData with a delayed-render owner.
- [x] [BUG] [WIN] Alt+Space conflicts with the Windows system menu shortcut (WM_SYSCOMMAND SC_KEYMENU) in some legacy apps. Should detect when the app receiving focus is a Win32 window and optionally suppress the system menu.
- [x] [BUG] [WIN] Sound adapter uses MessageBeep (modal) — PlaySound with SND_ASYNC | SND_MEMORY would be non-blocking and allow custom WAV assets.
- [x] [WIN] [FEAT] DirectML / CUDA backend for Whisper — whisper.cpp has CUDA and DirectML build options. On NVIDIA/AMD GPUs this would bring realtime_factor well below 0.1. Add a GPU detection step during onboarding and expose a "Use GPU acceleration" toggle in settings.
- [x] [WIN] [FEAT] Windows Accessibility API injection — For apps that block SendInput + clipboard, implement IUIAutomation::SetFocus + ITextProvider::InsertText as a secondary delivery method.
- [x] [WIN] [FEAT] Windows Hello / Credential Manager integration — Store encryption keys for any future audio export in Windows Credential Manager rather than AppData.
- [x] [WIN] [UX] Windows 11 notification toasts — Replace tray-only feedback with Windows.UI.Notifications toast cards for transcription delivery and errors.
- [x] [WIN] [UX] System tray context menu keyboard navigation — Current menu is click-only; add keyboard shortcuts for open dashboard, pause, quit.
- [x] [WIN] [INFRA] MSIX packaging — Build an MSIX bundle (alongside the current NSIS installer) for distribution through the Microsoft Store and enterprise MDM.
- [x] [WIN] [INFRA] Fix pnpm tauri build on Windows — [EPERM] on node_modules/.bin/tauri.EXE unlink fails when Bun lockfile-cached binary is in use. Investigate switching to bun tauri build exclusively or adding a pre-build script that kills stale handles.
- [x] [WIN] [PERF] WASAPI exclusive-mode capture — Current CPAL setup uses shared mode (WASAPI shared), which adds ~10 ms of audio latency. Exclusive-mode gives sub-millisecond capture latency at the cost of stealing the device; expose as an advanced setting.
- [x] [WIN] [PERF] Promote [profile.dev.package."*"] opt-level = 3 to the project README so other Windows contributors don't hit 20-second Whisper decode times in debug builds.
- [x] [WIN] [FEAT] Raw Input hook for mouse push-to-talk — Register WM_INPUT on a hidden HWND so mouse button 4/5 can trigger dictation even when a game or fullscreen app has mouse focus captured.
  - Use RegisterRawInputDevices with HID_USAGE_PAGE_GENERIC and HID_USAGE_GENERIC_MOUSE
  - Parse RI_MOUSE_BUTTON_4_DOWN / RI_MOUSE_BUTTON_5_DOWN from RAWMOUSE.usButtonFlags
  - Forward to the same session actor event as keyboard push-to-talk
- [x] [WIN] [FEAT] Dark mode tray icon variants — Ship two tray icon assets (light and dark) and switch based on SystemUsesLightTheme registry key.
  - Poll the registry on WM_SETTINGCHANGE with lParam == L"ImmersiveColorSet" to detect theme switches at runtime without restarting
- [x] [WIN] [PERF] Low-latency audio path via WASAPI event-driven mode — Switch from the current callback-polling model to IAudioClient::SetEventHandle + a dedicated high-priority thread (SetThreadPriority(THREAD_PRIORITY_TIME_CRITICAL)) to reduce jitter below 2ms.
- [x] [WIN] [UX] Per-monitor DPI awareness v2 — Declare PerMonitorV2 in the app manifest so the pill and dashboard scale correctly when dragged across mixed-DPI displays (e.g. laptop 200% + external 100%).
- [x] [WIN] [BUG] Tray icon disappears after Explorer crash — Register a TaskbarCreated message handler (RegisterWindowMessage(L"TaskbarCreated")) and re-add the tray icon when Explorer restarts.
- [x] [WIN] [SEC] Memory-safe clipboard clear on lock — On WM_WTSSESSION_CHANGE with WTS_SESSION_LOCK, zero out the clipboard if it contains a HushWrite-set value using EmptyClipboard() followed by CloseClipboard().
- [x] [WIN] [INFRA] ARM64 Windows build — Add an aarch64-pc-windows-msvc target to the release CI matrix for Snapdragon X Elite / Surface Pro devices.
  - Validate whisper.cpp compiles with MSVC on ARM64 (requires CMake flag -DWHISPER_BLAS=OFF and possible NEON SIMD adjustments)
  - Add a GitHub Actions runner with windows-arm64 runner label once available, or use cross-compilation from x86_64 with QEMU

---

## Audio Capture & VAD

- [x] [BUG] CPAL stream error on device switch — When Windows switches the default audio device (e.g. plugging in headphones), CPAL reports AudioDeviceLost. The session actor sends DeviceLost, which currently terminates the session. Instead, attempt to reopen the stream on the new default device within 500 ms and send ArmingFailed only if that also fails.
- [x] [FEAT] Per-session audio device locking — Once arming succeeds, pin the capture to that specific device for the session's lifetime so that Windows default device changes mid-sentence do not interrupt recording.
- [x] [FEAT] Multiple microphone support — The INPUT_DEVICE setting key exists but is not surfaced in onboarding. Wire up device enumeration in the UI: show a dropdown of available WASAPI input endpoints with their friendly names.
- [x] [FEAT] Speaker diarization — For multi-speaker environments, integrate a speaker-tracking build and prefix each paragraph with a speaker label.
- [x] [FEAT] Background noise profile — Capture a 1-second ambient baseline at session start and subtract it from subsequent chunks to improve VAD accuracy in noisy rooms.
- [x] [FEAT] Adjustable VAD sensitivity — Expose earshot VAD threshold as a user-visible setting (slider from Sensitive to Aggressive) so users in noisy environments can tune how much silence is trimmed.
- [x] [PERF] VAD-gated chunking — Only submit a chunk to the ASR worker if the VAD reports speech in it; currently interior chunks with only silence still go through engine.transcribe() which does a digital-silence fast-path but still allocates.
- [x] [PERF] Streaming / partial transcription display — Feed intermediate Whisper beam outputs back to the pill UI every 1-2 seconds so users see a live partial transcript instead of waiting for the tail decode. Requires whisper.cpp partial-decode callback support.
- [x] [UX] Waveform visualizer in the pill — Show a live audio waveform during recording using CaptureEvent::Level data already emitted so the user can see the mic is picking up their voice.
- [x] [UX] Silence warning — If peak_amplitude == 0.0 for more than 1 second, show a brief "No microphone signal detected" error inside the pill rather than silently failing.
- [x] [UX] Auto-detect mono vs stereo — If the user's mic sends stereo, down-mix to mono before feeding Whisper to avoid stereo-channel phasing artifacts.
- [ ] [FEAT] Noise gate with adaptive threshold — Automatically learn the ambient noise floor during the first 500ms of each session and apply a dynamic gate so whispers do not get clipped.
  - Use an exponential moving average over CaptureEvent::Level values
  - Gate threshold = noise_floor_ema * 1.5 (configurable multiplier in advanced settings)
  - Show gate threshold on the audio level meter as a faint horizontal line
- [ ] [FEAT] Push-to-talk recording limit — Add a configurable max_recording_seconds cap (default 120s) after which recording auto-finalizes to prevent accidentally leaving the mic open.
  - Show a countdown in the pill during the last 10 seconds
  - Play a soft chime at the auto-stop point
  - Make the cap configurable from 30s to unlimited in advanced settings
- [ ] [FEAT] Audio playback for quality review — After each session, allow the user to re-listen to their own recording (opt-in, stored locally, auto-purged per retention policy).
  - Requires a new opt-in "Save audio recordings" setting (off by default, clearly labeled as local-only)
  - Store as Opus at 16kHz mono in the session data directory
  - Delete audio file when the session is deleted or on retention purge
- [ ] [PERF] Ring-buffer audio pre-roll — Maintain a 500ms circular buffer before the hotkey fires so the first word (often captured while the mic is still opening) is not cut off.
- [ ] [PERF] Parallel VAD + accumulation — Run VAD on a separate thread from audio accumulation so the VAD decision does not block the capture callback and add latency.
- [ ] [BUG] Double-open mic on rapid hotkey press — If the user presses and releases the hotkey faster than the CPAL stream opens (~80ms), the session may arm twice. Add a mutex guard around the arming transition in the session state machine.

---

## Transcription Engine

- [x] [FEAT] DirectML encoder for Windows — The codebase has a coreml feature gate. Add a parallel directml gate that uses whisper.cpp's WHISPER_DIRECTML build to offload the encoder to the GPU, matching the macOS CoreML speedup.
- [x] [FEAT] Faster-Whisper / CTranslate2 backend — Implement a second TranscriptionEngine variant backed by faster-whisper via subprocess or Python FFI. At batch size 1, faster-whisper is 2-4x faster than whisper.cpp for the same model.
- [x] [FEAT] Online model registry — Instead of hard-coding model download URLs, fetch a models.json manifest from a CDN so new model releases appear in the UI without an app update.
- [x] [FEAT] Model download resume — If a model download is interrupted, resume from the last byte offset rather than starting over. reqwest supports Range headers.
- [x] [FEAT] Model integrity re-check on startup — Compute the SHA-256 of each model file at launch and compare to the stored hash. If corrupted, delete and re-download automatically.
- [x] [FEAT] Quantization options per model — For each model (e.g. large-v3-turbo), offer multiple quantizations: q4_0, q5_0, q8_0, f16. Show estimated size, speed, and quality trade-offs in the UI.
- [x] [FEAT] Parallel decode for interior chunks — Spawn a second ASR worker thread so interior chunks submitted while still recording can decode concurrently with the previous chunk, cutting overall latency on long dictations.
- [x] [FEAT] Whisper token timestamps — Enable token_timestamps = true in build_full_params and use per-word timestamps to build a word-level confidence map. Highlight low-confidence words in the history view.
- [x] [PERF] Persistent WhisperState across sessions — Currently states.acquire() creates a new state for each chunk. Reusing a single persistent state (resetting it between chunks) would save ~5 ms per chunk on allocation overhead.
- [x] [PERF] Thread count auto-tuning — decode_thread_count() is currently a fixed heuristic. Measure transcription speed during the prepare() warmup across 1-N threads and pick the fastest count automatically.
- [x] [BUG] Hallucination filter misses multi-sentence hallucinations — The blocklist drops a segment only when it is the entire segment text. Whisper sometimes emits "[BLANK_AUDIO] Thank you. [BLANK_AUDIO]" as one segment; the prefix/suffix noise bypasses the exact-match check. Add a strip-and-retry path.
- [x] [FEAT] Whisper large-v3-turbo-q3_K_M quantization — Add a 3-bit quantization option for the large-v3-turbo model giving ~40% smaller footprint (~280MB) suitable for 8GB RAM devices, with a "Compressed" badge in the model picker.
- [x] [FEAT] Custom vocabulary / hotword biasing — Pass a hotwords prompt to whisper.cpp's whisper_full_params.initial_prompt to bias toward user-defined technical terms, names, and brand words.
  - Read from the user's active dictionary and format as a comma-separated string
  - Cap at 224 tokens (whisper's context limit) and prefer high-frequency dictionary terms
  - Re-generate the prompt string when the dictionary changes without reloading the model
- [ ] [FEAT] Confidence-based word coloring — In the history detail view, shade low-confidence words (<0.7 probability) in amber so users can spot likely transcription errors at a glance.
- [ ] [FEAT] Language-pinned decode mode — Allow users to hard-pin the decode language in settings, bypassing auto-detect. This reduces p99 decode latency by ~15ms on short utterances where language detection adds overhead.
- [ ] [PERF] GGML memory-mapped model loading — Use mmap = true in whisper.cpp so the OS handles page-in lazily; this reduces cold-start model load from ~1.5s to ~300ms on SSDs by avoiding a full heap copy.
- [ ] [PERF] Encoder/decoder split threading — Pin the Whisper encoder to performance cores and the decoder to efficiency cores using Windows thread affinity masks, measured against the auto-tuning benchmark.
- [ ] [BUG] Model selector shows stale download progress after network error — The download progress bar stays at a non-zero value if the download errors out. Reset download_progress to 0 and show the error state in the model card on failure.
- [ ] [BUG] Empty segment after long silence — When the user holds the hotkey for >5s without speaking, Whisper decodes the silence and emits an empty or hallucination-only segment that passes through to delivery. Add a minimum-words guard (>=1 non-noise word) before triggering delivery.
- [ ] [DX] Model benchmarking CLI — A HushWrite-bench binary that accepts a WAV file and prints decode time, RTF, and WER against a reference transcript. Used by contributors to validate model changes without running the full app.

---

## Text Enhancement & Post-Processing

- [x] [FEAT] LLM post-processing pass — Add an optional pipeline step that sends the raw transcript through a local LLM (e.g. llama.cpp with a small 1B model) to fix grammar, remove fillers, and restructure run-on sentences. Toggle in settings.
- [x] [FEAT] Application-aware formatting — Detect the frontmost app via frontmost_app() and apply app-specific rules: e.g. in VS Code, auto-format code identifiers as camelCase; in Slack, trim trailing punctuation.
- [x] [FEAT] Custom substitutions / shortcuts — Let users define text expansions: "my address" to a full address. These would be stored in services/dictionary.rs and applied during the rules pass.
- [x] [FEAT] Per-language punctuation normalization — The NORMALISE_PUNCTUATION rule is language-agnostic. Apply locale-correct quote marks for French, German, etc. based on the detected language.
- [x] [FEAT] Spoken command expansion — Extend SPOKEN_COMMANDS beyond basic formatting to include insertion commands: "new line", "new paragraph", "open bracket", "close bracket", "delete last word".
- [x] [FEAT] Markdown mode — A toggle that reformats dictated text as Markdown: "heading level 2 best practices" becomes ## Best Practices, "bullet point foo" becomes - foo.
- [x] [FEAT] Email / message mode — Strip filler words and structure the output as a professional email draft with subject, greeting, body, and sign-off detection.
- [x] [FEAT] Named entity normalization — Detect proper nouns from the user's dictionary and apply their canonical capitalization (e.g. always correct "iphone" to "iPhone", "openai" to "OpenAI").
- [x] [FEAT] Correction learning — When the user edits a HushWrite-typed string immediately after paste detected via accessibility APIs, record the before/after pair and auto-add it to the corrections dictionary.
- [x] [UX] Inline correction UI — After pasting, show a 3-second floating undo button ("Undo dictation") that restores the pre-paste clipboard content and removes the typed text.
- [ ] [FEAT] Smart sentence-boundary capitalization — Detect sentence boundaries based on pause duration (VAD silence > 400ms) and capitalize the first word of the new sentence automatically, even mid-session.
- [x] [FEAT] Abbreviation expansion — "eg" to "e.g.", "ie" to "i.e.", "etc" to "etc.", "vs" to "vs.", with a per-language list. User-configurable opt-out per abbreviation.
- [x] [FEAT] Number normalization — "forty two" to "42", "third" to "3rd", "one thousand" to "1,000". Handle ordinals, cardinals, and currency ("twenty dollars" to "$20").
- [x] [FEAT] URL / path normalization — "https colon slash slash github dot com" to https://github.com. Detect and canonicalize spoken URLs, file paths, and email addresses.
- [x] [FEAT] Code identifier casing pipeline — In code mode, detect compound words and apply the active casing style: "user profile component" to UserProfileComponent (PascalCase) or user_profile_component (snake_case).
- [ ] [FEAT] Post-processing rule priority ordering — Let users drag-and-drop the order in which enhancement rules execute. Persist order in registry as an ordered list of rule IDs.
- [ ] [FEAT] Rule preview sandbox — A text area in settings where users can paste raw transcript text and see how each enabled rule transforms it in real time, rule-by-rule, with a diff view.
- [ ] [FEAT] Profanity filter (opt-in) — Optional bleep/asterisk replacement of profanity, configurable per app profile (e.g. enable in Slack, disable in personal notes).
- [ ] [PERF] Rules pipeline caching — Cache the compiled regex patterns for filler words, corrections, and punctuation rules across sessions so they are not recompiled on every chunk.
- [x] [BUG] LLM post-processing doubles certain punctuation — When both the Whisper model and the LLM post-processor add a period at the end of a sentence, the output has "word..". Fix by stripping trailing punctuation from the ASR output before feeding it to the LLM.

---

## Clipboard & Delivery

- [x] [BUG] Clipboard restore races with password managers — Some password managers (1Password, Bitwarden) monitor clipboard changes. When HushWrite sets the clipboard and then restores it, some managers capture the interim transcript. Add a delay or use SetClipboardData with GMEM_DDESHARE to suppress clipboard history capture.
- [x] [FEAT] Delivery method: direct keyboard simulation — Instead of clipboard-paste, use SendInput with KEYEVENTF_UNICODE to inject text character-by-character. Slower but works in apps that disable paste (some security tools, game launchers).
- [x] [FEAT] Delivery method: Windows Accessibility API — IUIAutomation SetValue on the focused element as a third delivery tier for apps that support neither paste nor SendInput unicode.
- [x] [FEAT] Delivery confirmation — After paste, verify the text landed by reading the focused element's value via UIA and comparing. Surface a "Delivery failed" notification if it does not match.
- [x] [FEAT] Queue mode — A setting where transcription results are queued and delivered only when the user presses a separate "flush" hotkey, allowing multi-sentence dictation without interrupting typing.
- [x] [FEAT] Draft mode — Instead of pasting immediately, accumulate multiple recording sessions into a draft buffer. Show a floating mini-window with the accumulated draft and a "Send" button.
- [x] [UX] Paste delay calibration wizard — Detect the current system responsiveness and auto-suggest an optimal paste_delay_ms. Some apps (terminal emulators, Electron apps) need higher delays.
- [ ] [FEAT] Smart paste delay — Measure how long the frontmost app takes to respond to Ctrl+V during the onboarding calibration wizard and record a per-app paste_delay_ms override in the app profiles table.
- [ ] [FEAT] Delivery method: OLE Drag-and-Drop — As a fourth-tier fallback, simulate an OLE drag from a synthetic source into the focused element, which some sandboxed apps allow even when clipboard and SendInput are blocked.
- [ ] [FEAT] Clipboard history suppression on Windows 11 — Prevent the transcript from appearing in the Windows 11 clipboard history panel (Win+V).
  - Gate behind a "Suppress clipboard history" advanced setting (default: on)
  - Show a UI note explaining that this only prevents Windows clipboard history, not third-party managers
- [ ] [FEAT] Paste confirmation sound — A short, pleasant chime when delivery succeeds, distinct from the recording start/stop sounds. Configurable volume and on/off toggle.
- [ ] [FEAT] Auto-retry on delivery failure — If the UIA delivery confirmation step fails, automatically retry once with a 200ms delay before surfacing the error toast.
- [ ] [BUG] Draft mode does not persist across app restarts — The draft buffer lives only in memory. If the app crashes or is restarted, the accumulated draft is lost. Persist draft content to a dedicated `drafts` table in SQLite.
- [ ] [PERF] Unicode SendInput batching — Current character-by-character SendInput fires one INPUT struct per character. Batch up to 32 characters per SendInput call to reduce syscall overhead.

---

## UI — Pill

- [x] [FEAT] Real-time word count in pill — Show the live word count ("~12 words so far") in the pill to give the user feedback while speaking.
- [x] [FEAT] Animated recording indicator — Replace the static icon with a pulsing waveform or animated mic icon that reacts to the CaptureEvent::Level values.
- [x] [FEAT] Cancel confirmation — When the user presses Escape (cancel-arm), show a brief countdown in the pill ("Cancelling in 3...") with a "Keep recording" button to prevent accidental cancellations.
- [x] [FEAT] Partial transcript preview in pill — Show the last few decoded words in the pill as they come in from interior chunk decodes so the user can confirm the model is understanding them.
- [x] [UX] Pill position memory — Remember the last position the user dragged the pill to and restore it on next session, per-display.
- [x] [UX] Pill opacity setting — Let users dial the pill background opacity from 30%-100% for use on dark or busy backgrounds.
- [x] [UX] Pill size / compact mode — Offer a compact (icon-only) pill mode for minimal visual interruption.
- [x] [UX] Multi-display awareness — Show the pill on the same display as the frontmost window, not always the primary display.
- [x] [UX] Accessibility: screen reader announcements — Post a live region update via UIA when recording starts/stops so screen reader users get audio feedback.
- [ ] [FEAT] Pill right-click context menu — Right-clicking the pill during or after recording should show: "Copy transcript", "Open history", "Settings", "Dismiss". Implement as a native HMENU on Windows.
- [ ] [FEAT] Pill transcript scroll — When partial transcript text overflows the pill width, show a ticker-style horizontally scrolling text rather than truncation with ellipsis.
- [ ] [FEAT] Pill language indicator — When the session detects a non-default language, show a two-letter language code badge (e.g. "ES", "FR") in the pill corner.
- [ ] [FEAT] Pill recording timer — Show elapsed recording time in the pill so users can gauge how long they've been speaking.
- [ ] [UX] Pill haptic feedback (Windows) — If the device has a haptic actuator (Surface, modern laptops), send a light tap via Windows.Devices.Haptics on recording start and stop.
- [ ] [UX] Pill edge snapping — When dragged to within 20px of a screen edge, snap the pill to the edge and lock it there. Persist the edge preference alongside the position.
- [ ] [UX] Pill keyboard navigation — The pill should be fully focusable and operable via keyboard: Tab to reach it, Space to toggle recording, Escape to cancel, Enter to confirm. Never trap focus.
- [ ] [PERF] Pill render batching — The pill reacts to every CaptureEvent::Level event (60+ per second). Debounce redraws to 30fps to reduce GPU load on integrated graphics.
- [x] [BUG] Pill disappears behind fullscreen apps — The pill's always_on_top flag does not work against DirectX exclusive-fullscreen windows. Investigate using SetWindowPos with HWND_TOPMOST inside a WM_ACTIVATE handler to re-assert top-most status when fullscreen apps steal exclusive mode.

---

## UI — Dashboard / Settings

- [x] [FEAT] History export — Export the full session history as CSV, JSON, or plaintext. Button in the History view.
- [x] [FEAT] History search — Full-text search across all recorded transcripts using SQLite FTS5. The search_sessions function stub exists in services/sessions.rs.
- [x] [FEAT] History bulk delete — Checkbox multi-select in History view with "Delete selected" and "Delete all" options.
- [x] [FEAT] Per-session playback — If audio recording is ever added (opt-in), allow playback of a session from the history view with word-level highlighting synchronized to timestamps.
- [x] [FEAT] Stats dashboard charts — Add line charts (words per day, sessions per week, average latency over time) using a lightweight charting library.
- [x] [FEAT] WPM baseline calibration wizard — Walk the user through reading a passage to measure their actual speaking rate and set BASELINE_WPM accurately.
- [x] [FEAT] App profile manager UI — The services/profiles.rs and ipc/commands/profiles.rs exist. Build a proper UI: list of app profiles, per-app overrides for language, mode, hotkey, and enhancement rules.
- [x] [FEAT] Settings import/export — Serialize all settings to a JSON file for backup or transfer to another machine.
- [x] [FEAT] Keyboard shortcut reference panel — A "Keyboard shortcuts" page in the dashboard listing all hotkeys and their functions.
- [x] [UX] Settings search — A search bar at the top of the Settings view that filters the setting list in real-time.
- [x] [UX] Dark / light / system theme — Add an explicit theme override in General settings.
- [x] [UX] Onboarding re-run — A "Run setup again" button in General settings to redo the microphone and hotkey test without reinstalling.
- [x] [UX] Fixed normal app window size (1000x660) — Enforce standard desktop dimensions on launch and refresh, prevent ballooning.
- [x] [UX] Tooltips on all advanced settings — Every advanced setting in the registry has a description; surface it as a hover tooltip next to the label.
- [ ] [FEAT] Session tagging — Let users tag sessions with labels ("meeting", "code review", "email") and filter history by tag. Tags stored as a many-to-many session_tags table in SQLite.
- [ ] [FEAT] Session favorites / pinning — Star a session to pin it at the top of the history view and exclude it from bulk delete and retention purge.
- [ ] [FEAT] History timeline view — An alternative calendar heatmap view of the history showing dictation activity by day. Click a day to see sessions from that day.
- [ ] [FEAT] Clipboard snapshot in history — When a session is delivered via clipboard, store a snapshot of the final delivered text separately from the raw transcript so the user can diff them.
- [ ] [FEAT] Quick re-dictate from history — A "Re-use" button on each history item that copies the final text back to the clipboard and pastes it into the current frontmost app.
- [ ] [FEAT] Session detail word timeline — Clicking into a session shows each word on a horizontal timeline with its timestamp offset from session start, color-coded by confidence.
- [ ] [FEAT] Keyboard-driven history navigation — Full arrow-key navigation in the history list, with Enter to expand a session and Delete/Backspace to delete the selected session, without mouse interaction.
- [ ] [UX] Onboarding progress sidebar — Show a persistent sidebar checklist during multi-step setup so users always know how many steps remain and can jump back to a completed step.
- [ ] [UX] Settings reset to defaults — A "Reset to defaults" button per section so users can undo a bad advanced settings change without wiping everything.
- [ ] [UX] In-app update notification badge — When a new version is available, show a badge on the dashboard header update icon rather than a blocking modal. The modal appears only when the user clicks the badge.
- [ ] [UX] Command palette (Cmd/Ctrl+K) — A fuzzy-searchable command palette accessible from anywhere in the dashboard for navigation, actions ("Export history", "Calibrate WPM", "Open model manager"), and settings jumps.
- [ ] [PERF] Virtual list for history — The history view renders all sessions in the DOM. Switch to a windowed virtual list to keep the DOM small for users with 10,000+ sessions.

---

## Hotkeys

- [x] [FEAT] Multiple hotkey bindings — Allow assigning two hotkeys (e.g. Alt+Space and a mouse button via raw input) so laptop and desktop workflows can each have a comfortable binding.
- [x] [FEAT] Per-app hotkey override — For apps that capture Alt+Space themselves (e.g. some games, terminals), allow a different hotkey to be used only when that app is frontmost.
- [x] [FEAT] Hotkey conflict detection — During registration, check if the requested hotkey is already registered by another app via RegisterHotKey return value on Windows and warn the user with alternatives.
- [x] [FEAT] Push-to-talk mouse button support — Let any mouse button (captured via raw input hook) act as the push-to-talk trigger.
- [x] [FEAT] Double-tap hotkey mode — Double-tapping the hotkey within 300 ms activates a "high-priority" session that skips the queue and pastes immediately.
- [x] [FEAT] Hotkey-to-command mapping — Allow additional hotkeys to trigger specific commands: e.g. Alt+Shift+Space = open dashboard, Alt+Escape = cancel and clear.
- [x] [BUG] [WIN] HOTKEY_HELD AtomicBool is process-global — If the app is ever extended to support multiple simultaneous recording modes (e.g. per-app sessions), a single global flag will not be correct. Refactor to a per-session or per-binding held-state tracker.
- [ ] [FEAT] Tap-to-toggle mode — An alternative to push-to-talk where a single tap starts recording and a second tap stops it. Configurable alongside push-to-talk in settings.
  - Show a visual toggle indicator in the tray icon and pill when in toggle mode vs PTT mode
  - Add a max session duration guard in toggle mode (default 5 minutes) to prevent runaway recordings
- [ ] [FEAT] Chord hotkeys — Support two-key chords (e.g. Ctrl+K, D for "dictate") for power users who want more ergonomic bindings that avoid system conflicts.
- [ ] [FEAT] Hotkey profile presets — Ship preset hotkey configurations: Minimal (Alt+Space only), Power User (four bindings), Gaming (mouse-only), Accessibility (single large key).
- [ ] [FEAT] Hotkey usage heatmap — Show a small keyboard graphic in the hotkey settings panel with usage counts per binding so users know which ones they actually use.
- [ ] [BUG] Hotkey stops working after fast user switch — Windows fast user switching can cause RegisterHotKey to fail silently when the session resumes. Detect resume via WM_WTSSESSION_CHANGE with WTS_SESSION_UNLOCK and re-register all hotkeys.
- [x] [BUG] Per-app hotkey override triggers for wrong window — The frontmost app detection for per-app overrides reads the active window at hotkey time. In some Alt+Tab scenarios, the HWND is still the previous window for ~50ms. Add a 30ms stabilization delay before reading the active window process name.

---

## Privacy & Security

- [x] [SEC] Transcript encryption at rest — Encrypt session raw_text and final_text columns in SQLite using SQLCipher or an application-level AES-256-GCM key stored in Windows Credential Manager.
- [x] [SEC] Auto-purge on lock screen — When Windows locks, automatically clear the in-memory transcript buffer and the clipboard if it contains a HushWrite-set value.
- [x] [FEAT] Configurable data retention — The RETENTION_DAYS key exists. Build a background job that runs purge_older_than() on launch and on a daily timer.
- [x] [FEAT] Audit log — Write an append-only log separate from the sessions table recording session timestamps, durations, and delivery outcomes but never the transcript text for enterprise compliance.
- [x] [FEAT] Remote wipe / data clear — A "Delete all data" option in settings that drops all sessions, dictionary entries, and resets all settings to defaults in one step.
- [x] [UX] Privacy policy in onboarding — Link to a local privacy.md during onboarding that explains exactly what data stays on device.
- [x] [SEC] In-app "Air-Gap / Hardware Isolation Mode" hard kill-switch that closes any sockets and disables all outbound networking in the binary.
  - Bind reqwest client to a no-proxy, local-only adapter when the mode is active
  - Block the GitHub release check and CDN model manifest fetch entirely
  - Show a persistent "Air-Gapped" badge in the dashboard header when the mode is active
  - Persist the setting so it survives app restarts
- [ ] [SEC] SQLite database encryption at rest using OS Keychain / Windows DPAPI master keys.
  - Generate a 256-bit AES key on first launch
  - Store the key in Windows Credential Manager (CredWrite with CRED_TYPE_GENERIC)
  - Open the SQLite database with SQLCipher using the retrieved key
  - If the key is missing or corrupted, delete and re-create the database (data loss warning shown to user)
- [ ] [SEC] Reproducible network demo video & third-party security verification badge on landing page.
- [ ] [SEC] Memory scrubbing for in-flight transcripts — After a session is delivered and the in-memory buffer is released, overwrite the allocation with zeros using the `zeroize` crate before drop to prevent transcript leakage via process memory dumps.
- [ ] [SEC] Code signing for all release binaries — Sign the Windows installer (.exe), the MSIX bundle, and the macOS DMG. Integrate `signtool.exe` and `codesign` into CI.
- [ ] [SEC] Dependency audit automation — Add `cargo audit` and `npm audit` to the CI pipeline and fail the build on any CRITICAL or HIGH severity vulnerability.
- [ ] [SEC] Clipboard data classification — Before setting the clipboard, classify the content with a local PII detector (names, phone numbers, SSNs, credit card patterns) and warn the user if the transcript appears to contain sensitive data.
- [ ] [SEC] Process isolation for model inference — Run the Whisper inference in a separate sandboxed process with restricted access to the file system and network so a compromised model file cannot exfiltrate data.
- [ ] [DX] Security threat model document — Write a `docs/SECURITY.md` that enumerates the trust boundaries, data flows, and mitigations (clipboard interception, memory dumping, UIPI bypass, network interception) so security researchers understand the attack surface.

---

## Privacy & Auditable Security

- [x] [SEC] Public plain-English Privacy Architecture page with data boundary flow, outbound network disclosures, and audit recipes.
- [x] [SEC] Explicit outbound network statement: only optional model downloads and GitHub release checks.
- [x] [SEC] Zero account architecture — fully operational out of the box with 0 accounts, 0 logins, and 0 tokens.
- [x] [SEC] Zero telemetry by default — no tracking SDKs, no beacons, no word counts or app analytics transmitted.
- [x] [SEC] Incognito mode & local retention policies (0-day auto-purge, instant full database wipe).
- [ ] [SEC] In-app "Air-Gap / Hardware Isolation Mode" hard kill-switch that closes any sockets and disables all outbound networking in the binary.
- [ ] [SEC] SQLite database encryption at rest using OS Keychain / Windows DPAPI master keys.
- [ ] [SEC] Reproducible network demo video & third-party security verification badge on landing page.

---

## Developer Beachhead & Code-Aware Dictation

- [x] [FEAT] Context-aware AI IDE file & folder tagging — Spoken file directives (`tag file <path>`, `tag folder <path>`, `at file <path>`, `context file <path>`) automatically formats `@src/components/Button.tsx`, `@package.json`, `@Cargo.toml` for Cursor, Windsurf, Claude Code, and Copilot.
- [x] [FEAT] Developer voice snippets & macro library — Voice shortcuts for `pr checklist`, `environment setup`, `internal api docs`, `naming conventions`, `onboarding instructions`, and `release notes`.
- [x] [FEAT] Code casing voice directives — Convert spoken voice cues into programming casing styles (`camelCase`, `PascalCase`, `snake_case`, `SCREAMING_SNAKE_CASE`, `kebab-case`, inline backticks).
- [x] [FEAT] GitHub Issue, PR & Markdown voice macros — Dictate markdown scaffolding (`issue title`, `steps to reproduce`, `expected behavior`, `acceptance criteria`, `pr description`, `todo item`, `code block <lang>`).
- [x] [FEAT] Developer technical vocabulary pack — Expanded named entity normalization with 80+ frameworks, databases, and languages (`Cursor`, `Windsurf`, `Claude Code`, `Ollama`, `LangChain`, `Supabase`, `Neon`, `vLLM`, `Next.js`, `TypeScript`, `PostgreSQL`, `FastAPI`, `PyTorch`, `Docker`, `Kubernetes`, `Tauri`, etc.).
- [x] [FEAT] 1-Click Codebase & Repository Symbol Importer — Parse `package.json`, `Cargo.toml`, and source code to batch-import project identifiers, functions, and types into local dictionary.
- [x] [FEAT] Developer domain packs — React/Web, Backend/Rust/Python, and Git/Cloud/DevOps 1-click domain dictionary presets in Settings.
- [x] [FEAT] Dedicated Developer Hub (`/developers`) — Interactive web landing page with live voice simulator, IDE integration specs, and on-device privacy comparison vs Wispr Flow.
- [ ] [FEAT] Git commit message voice dictation mode — A dedicated "git commit" mode that formats output as a conventional commit (`feat(scope): description`) with scope, type, and body spoken naturally.
  - Recognize type keywords: feat, fix, chore, docs, refactor, test, style, perf, ci, build
  - Auto-lowercase and trim the subject to 72 characters
  - Insert `\n\n` between subject and body when a second sentence is detected
- [ ] [FEAT] Terminal command dictation mode — A mode that formats output as a shell command: `git push origin main`, `docker compose up -d`, `cargo test --release`. Suppresses capitalization and punctuation.
  - Auto-detect common CLI patterns: `git ...`, `npm/bun/pnpm ...`, `cargo ...`, `docker ...`, `kubectl ...`
  - Strip trailing period that would break shell commands
  - Show command preview in pill before delivery with a 2s confirmation window
- [ ] [FEAT] Code comment voice mode — Recognize JSDoc, Rustdoc, and Python docstring conventions by spoken triggers.
- [ ] [FEAT] Variable name suggester — Speak "variable for user email address" and get three casing variants shown in the pill as clickable chips. Click one to insert.
- [ ] [FEAT] Test name generator — Speak "test that login fails with wrong password" and output `it("should fail login with wrong password", ...)` or the Rust `#[test] fn login_fails_with_wrong_password()` equivalent depending on the active app profile.
- [ ] [FEAT] Regex dictation mode — Speak "regex for email pattern" and insert a canonical regex. Maintain a curated library of 50 common regex patterns addressable by spoken name.
- [ ] [FEAT] IDE extension for VS Code — Show HushWrite recording status in the status bar, start/stop dictation from the command palette, and insert transcript at the active editor cursor position via `vscode.TextEditor.edit` without clipboard round-trip.
- [ ] [FEAT] Cursor / Windsurf AI composer integration — When dictating inside the Cursor AI composer input, detect the composer window via UIA and inject via `IValueProvider::SetValue` rather than clipboard for reliability.
- [ ] [DX] Developer SDK / local WebSocket API — Document the local WebSocket API with TypeScript types and a 10-line example showing a third-party app receiving real-time transcripts.

---

## Internationalization & Languages

- [ ] [FEAT] UI localization — Externalize all UI strings to a `locales/*.json` structure and ship with English, Spanish, French, German, Japanese, and Simplified Chinese to start.
  - Use `i18next` for the React frontend
  - Generate type-safe translation key types via `i18next-parser`
  - Auto-detect system locale on first launch and default to the closest supported language
  - Fall back to English for missing keys with a console warning in dev mode
- [ ] [FEAT] Right-to-left layout support — For Arabic and Hebrew transcription, flip the pill and history view layout to RTL.
  - Use CSS `direction: rtl` and `text-align: start` throughout
  - Mirror pill position to the right side of the screen by default for RTL locales
  - Test with Hebrew (he) and Arabic (ar) Whisper language codes
- [ ] [FEAT] Language auto-detection confidence display — Show the detected language and its confidence score in the History view per session.
- [ ] [FEAT] Multilingual session — Allow Whisper `language = None` (auto-detect) and pin the detected language from the first interior chunk to subsequent chunks via the existing `detected_language` pinning mechanism.
- [x] [FEAT] Language-specific filler word lists — The STRIP_FILLERS rule currently only handles English fillers ("um", "uh", "like"). Add curated lists for each supported language.
- [ ] [FEAT] Romanization mode — For CJK input, add an option to output pinyin/romaji alongside or instead of the native script.
- [ ] [FEAT] Regional dialect support — Allow sub-locale selection for languages with strong regional variants (e.g., Brazilian Portuguese vs. European Portuguese, Simplified vs. Traditional Chinese).
- [ ] [FEAT] Locale-aware number formatting — When number normalization is active, format numbers according to the user's locale (e.g., 1,000.50 in en-US vs. 1.000,50 in de-DE).
- [ ] [FEAT] Locale-aware date/time dictation — "Today at three PM" to ISO timestamp or natural format based on locale. Configurable format template.
- [ ] [DX] Translation contribution guide — A `docs/TRANSLATIONS.md` explaining how community contributors can add a new locale, test their strings, and submit a PR.

---

## Updates & Distribution

- [x] [FEAT] Delta updates — Binary diffing service (`bsdiff` / `bspatch` via `qbsdiff`) with SHA-256 verification and automated delta generator script (`scripts/generate_delta.py`) saving 90-95% download bandwidth on patch updates.
- [x] [FEAT] Update channel selection — Added `general.update_channel` ("stable" | "beta") setting in registry and updater service.
- [ ] [FEAT] Offline update bundle — Allow the user to manually point the updater at a local .msi/.exe file for air-gapped enterprise deployments.
  - File picker in General > Updates > "Install from file"
  - Validate signature before applying — reject unsigned bundles even in offline mode
  - Show installed version and the version from the bundle before confirming
- [ ] [INFRA] Signed Windows installer — The current build produces an unsigned NSIS installer. Obtain a code signing certificate and integrate `signtool.exe` into the CI build pipeline.
  - Use an EV code signing certificate (eliminates SmartScreen warning immediately)
  - Sign both the NSIS `.exe` and the MSIX bundle
  - Store the certificate in GitHub Actions secrets
- [ ] [INFRA] GitHub Actions Windows build — Add a `windows-latest` runner to the CI matrix that builds, signs, and uploads the Windows bundle as a release artifact.
  - Build both `x86_64-pc-windows-msvc` and `aarch64-pc-windows-msvc` targets
  - Run `cargo clippy` and `cargo test` in the matrix before packaging
  - Upload artifacts to the GitHub release as `.exe`, `.msi`, and `.msix`
- [x] [INFRA] Winget package — Official multi-YAML manifests (`snackforcode.HushWrite`) under `winget/manifests/` and automated generator script (`scripts/generate_winget_manifest.py`) for `winget install HushWrite`.
- [ ] [INFRA] Chocolatey package — Publish a Chocolatey package for enterprise environments.
  - Create `nuspec` manifest and install/uninstall PowerShell scripts
  - Submit to the Chocolatey Community Repository
  - Add Chocolatey badge to README
- [ ] [INFRA] Homebrew Cask (macOS) — Publish a Homebrew Cask formula so macOS users can `brew install --cask HushWrite`.
- [ ] [FEAT] In-app beta program enrollment — A one-click "Join Beta" option in General > Updates that switches the update channel to beta and shows a brief explanation of what beta means.
- [x] [FEAT] Release notes in-app — When an update is downloaded and ready to install, show a formatted "What's new" panel parsed from the GitHub release body.

---

## Architecture & Reliability

- [ ] [INFRA] Crash reporter — Integrate `sentry-rust` or a local crash dump writer using `MiniDumpWriteDump` to capture panics and unhandled errors with a stack trace. Gate behind a user opt-in during onboarding.
  - If sentry-rust: use a self-hosted Sentry instance (no data leaves user control unless they opt in explicitly)
  - If local dump: write to `%APPDATA%\HushWrite\crashes\` and offer to email/open the dump file from the next launch dialog
- [ ] [INFRA] Health-check endpoint — Expose a local HTTP endpoint (e.g. `localhost:PORT/health`) so OS-level monitoring scripts can verify HushWrite is alive without the GUI.
  - Returns JSON `{ "status": "ok", "version": "0.1.0", "uptime_seconds": 3600, "sessions_today": 12 }`
  - Bind only to `127.0.0.1` — never expose externally
  - Port is randomized at first launch and stored in registry to avoid collisions
- [ ] [INFRA] Structured logging with log rotation — The current `tracing-appender` setup writes to a single log file. Add rolling file appender with size-based rotation and keep only the last 5 files.
  - Max file size: 10MB before rotation
  - Files named `HushWrite.log`, `HushWrite.log.1`, ... `HushWrite.log.5`
  - On startup, delete any rotated files older than 14 days
- [ ] [INFRA] Metrics export — Emit session latency, word count, and decode time metrics to a local Prometheus-compatible endpoint for power users who run local monitoring stacks.
- [ ] [DX] Integration test harness for Windows — The e2e tests in `session/e2e_tests.rs` mock audio. Add a real-audio integration test that captures from a virtual audio device (VB-Audio Cable or similar) on CI.
- [ ] [DX] Benchmark suite — A `cargo bench` target that runs Whisper on a fixed audio fixture and reports decode time. Gate CI failures on a regression threshold (e.g. +-15% from baseline).
- [ ] [DX] Database migration framework — Currently SQLite schema changes require manual version bumps. Add a migration runner (e.g. `rusqlite_migration`) that applies numbered `.sql` files at startup.
  - Migrations live in `src-tauri/src/migrations/`
  - Each migration is a file named `0001_initial.sql`, `0002_add_tags.sql`, etc.
  - The runner checks `PRAGMA user_version` and applies all missing migrations in order
  - Rollback is not supported; a failed migration panics with a clear error message pointing to the failing file
- [ ] [DX] Settings schema version — Add a `schema_version` row to the settings table so old settings can be migrated or deprecated cleanly across app versions.
- [ ] [DX] IPC contract tests — Auto-generate TypeScript types from the specta bindings and add a test that the generated `bindings.ts` matches the Rust side on every build.
- [ ] [INFRA] Plugin architecture — Extract delivery methods (clipboard, accessibility, keyboard) and enhancement rules into a plugin trait so third-party developers can add delivery backends without forking the core.
  - Define a `DeliveryPlugin` trait with `fn can_deliver(&self, target: &AppTarget) -> bool` and `fn deliver(&self, text: &str, target: &AppTarget) -> Result<()>`
  - Ship three built-in plugins: `ClipboardDelivery`, `SendInputDelivery`, `UIAutomationDelivery`
  - Load plugins from `%APPDATA%\HushWrite\plugins\` at startup
- [ ] [INFRA] Graceful shutdown — On SIGTERM or window close, wait for any in-flight session to complete delivery before exiting. Current behavior drops the session if the user quits mid-dictation.
- [ ] [DX] Error code registry — Assign a unique error code to every `AppError` variant (e.g. `MRM-1001` for `AudioDeviceLost`) and document them in `docs/ERROR_CODES.md` so users can search for solutions.

---

## Latency & Performance Benchmarks

- [x] [PERF] Published dated, reproducible latency comparison matrix on website (speech end -> insertion tail latency).
- [ ] [PERF] Automated CI latency & WER benchmark harness — Cargo bench target measuring insertion latency, sustained WPM, and technical WER on a fixed 500-sample audio dataset.
  - Dataset: 500 samples from LibriSpeech `test-clean` at 16kHz mono
  - Metrics: mean/p50/p99 decode latency, real-time factor (RTF), WER vs. reference transcripts
  - Store baseline in `benchmarks/baseline.json`; fail CI if any metric regresses by >15%
- [ ] [PERF] Per-device resource profiling dashboard — Live telemetry in settings showing CPU/GPU VRAM footprint and Real-Time Factor (RTF) across M-series & DirectML.
  - Sample CPU % and memory MB every 500ms during a session using `sysinfo` crate
  - Show a live sparkline graph in the Performance section of Settings
  - Color-code: green (<30% CPU, <2GB RAM), yellow (<60% CPU, <4GB RAM), red (above thresholds)
- [ ] [PERF] Always-ready warm background worker — Maintain warm Whisper VRAM state with zero idle CPU burn for sub-5ms session wakeups.
- [ ] [PERF] Laptop battery efficiency mode — Dynamically downshift decode thread pool on battery power to preserve <1.2% / hour discharge rate.
  - Detect battery state via `windows::Devices::Power::Battery::AggregateReport`
  - On battery: cap decode threads to `max(1, physical_cores / 2)` and disable streaming decode
  - On AC power: restore full thread count automatically
- [ ] [PERF] Low-bandwidth / offline verification guide — Documented test suite confirming identical sub-200ms latency in air-gapped / airplane mode.
- [ ] [PERF] Memory usage regression gate — Add a `memory_usage_mb` assertion to the benchmark suite. Fail if peak resident memory during a 60-second session exceeds 800MB on the `small` model.
- [ ] [PERF] Cold start optimization — Profile and reduce time-to-ready (from app launch to first hotkey response). Target: under 3 seconds on a mid-range 2022 laptop SSD.
  - Measure with `tracing::span!` wrapping each bootstrap phase
  - Lazy-load non-critical bootstrap steps (update check, session recovery) after the hotkey is armed

---

## Power-User Customization & Vocabulary Ownership

- [x] [FEAT] Smart per-app context formatting engine (Slack, Cursor, Notion, Gmail).
- [x] [FEAT] Adaptive Tone & Style Engine ("Make HushWrite sound like you") — Interactive persona switcher for Formal, Casual, Very Casual, Concise, and Developer syntax styles.
- [x] [FEAT] Voice-triggered text-expander snippets & macros — Speak trigger words (e.g. "bug template", "status update", "pr template", "meeting notes") to instantly insert structured markdown schemas.
- [x] [FEAT] Creator & scriptwriting voice macros — YouTube video script outlines, 3-part viral hook frameworks, Substack newsletter drafts, social captions, podcast show notes, and 60s sponsor ad reads.
- [x] [FEAT] Dedicated Content Creators Hub (`/creators` & `/content-creators`) — Interactive creator voice playground, creator app workflow integration (Notion, Google Docs, Descript, Final Cut, Obsidian), and unreleased script IP privacy comparison vs Wispr Flow.
- [x] [FEAT] Dedicated LinkedIn and X (Twitter) features — Built-in spoken macros for X threads (`x thread template`), thread delimiters (`tweet break`, `next tweet`), LinkedIn posts (`linkedin post template`), carousel slide decks (`linkedin carousel template`), and hook frameworks. Added entity normalization (LinkedIn, Twitter, Typefully, Taplio, TweetDeck) and interactive playground demos on `/creators`.
- [ ] [FEAT] Portable dictionary export/import (`.json` / `.csv`) — "Your vocabulary is an asset you own—not a training signal for someone else's model."
  - Export: one entry per line, CSV format `trigger,replacement,type,enabled`
  - Import: validate schema, deduplicate against existing entries, show a preview diff before confirming
  - Support drag-and-drop import from file manager
- [ ] [FEAT] Project & workspace-scoped dictionaries — Auto-load `.HushWrite/dictionary.json` from the active git repository or workspace folder.
  - Watch for working directory changes via shell integration or file watcher
  - Merge project dictionary with global dictionary, with project entries taking priority
  - Show which dictionary is active in the pill via a small "Project" badge
- [ ] [FEAT] Local AI pipeline chaining — Dictate -> local lightweight LLM (llama.cpp) summarize/reformat -> paste to active cursor.
  - Support `llama.cpp` server mode on `localhost:8080` as the LLM backend
  - Allow user to paste any OpenAI-compatible endpoint (for Ollama or LM Studio)
  - Chain runs async: show "Enhancing..." in the pill while waiting for the LLM response
- [ ] [FEAT] Developer-first keyboard command palette — Fast shortcut-driven dictionary management and model switching without mouse interaction.
- [ ] [FEAT] Bring-Your-Own-Model (BYOM) loader — Allow power users to load custom fine-tuned GGUF / whisper.cpp model weights.
  - File picker accepting `.bin` files in whisper.cpp GGUF format
  - Validate the file header magic bytes before accepting
  - Show the model file size, parameter count (from header), and a "Custom" badge in the model picker
  - Warn that custom models are not covered by HushWrite support
- [x] [FEAT] Dictionary versioning & changelog — Track changes to the user dictionary over time (word added, modified, deleted) with timestamps, so users can undo accidental bulk imports.
- [ ] [FEAT] Shared team dictionary (Pro tier) — A team admin can publish a shared dictionary via a signed JSON URL that team members subscribe to. Dictionary entries are merged read-only (cannot be deleted by individual users).
- [ ] [FEAT] Voice macro conditional logic — A simple condition syntax in macros: "if app == Slack then use casual tone else use formal tone". Evaluated at inject time.
- [ ] [FEAT] Smart abbreviation learning — After 5 manual corrections of the same word, auto-suggest adding it to the substitutions dictionary with a one-click "Remember this" toast.

---

## High-Intent SEO & Trust-Earning Content

- [x] [SEO] Generated 10 high-intent programmatic comparison & use-case pages (`/wispr-flow-alternative`, `/private-dictation-app`, `/offline-voice-to-text-for-mac`, `/offline-voice-to-text-for-windows`, `/local-whisper-dictation`, `/voice-dictation-for-developers`, `/hipaa-friendly-local-dictation`, `/dictation-for-lawyers`, `/dictation-without-cloud-upload`, `/best-private-ai-dictation`).
- [x] [SEO] Added JSON-LD Schema markup (`SoftwareApplication` & `FAQPage`) and canonical meta tags across all comparison routes.
- [x] [CONTENT] Published 6 trust-earning technical articles addressing buyer anxieties, legal privilege risks, developer privacy, and hardware benchmarks.
- [x] [MARKETING] Record and publish short outcome-driven demonstration clips for X, LinkedIn, Reddit, and Product Hunt: "Dictating a full GitHub issue in Airplane Mode with 0 bytes sent."
- [x] [MARKETING] Dedicated LinkedIn and X (Twitter) outcome demonstration package & guide — Added `X_LINKEDIN_THREAD_DEMO` campaign storyboard in `marketingClips.ts` and published guide `/blog/how-to-dictate-linkedin-posts-x-threads-voice`.
- [x] [SEO] Add `/dictation-for-medical-professionals` and `/hipaa-voice-notes` landing pages targeting healthcare vertical.
  - Include a disclaimer (HushWrite is not a certified HIPAA Business Associate and makes no healthcare-specific compliance claims)
  - Emphasize local processing, no cloud upload, configurable retention policy
  - FAQ: "Does HushWrite store my patient notes?", "Does HushWrite sell data to healthcare analytics vendors?"
- [x] [SEO] Schema markup for `Review` and `AggregateRating` — Collect 10+ user reviews and add structured data to the homepage for rich snippet star ratings in Google search.
- [x] [CONTENT] "How I reduced meeting note time by 80% with local dictation" — a narrative technical blog post with a reproducible workflow using HushWrite + Notion.
- [x] [CONTENT] Benchmark article: "HushWrite vs. Wispr Flow vs. Superwhisper — 2026 latency & accuracy comparison" with reproducible test methodology published on GitHub.
- [x] [CONTENT] Privacy deep-dive: "Where does your voice data go in popular dictation apps?" — comparative analysis (Otter.ai, Dragon, Whisper via OpenAI API vs. HushWrite local).
- [x] [MARKETING] Product Hunt launch — Prepare PH listing assets: tagline, description (260 chars), 3 product screenshots, 1 demo GIF, Maker bio, first-comment talking points, and a 25% launch-day coupon code.
- [x] [MARKETING] Reddit AMA and community posts — Engage r/productivity, r/MachineLearning, r/selfhosted, r/rust with transparent posts about the local-first architecture and open-source model choice.

---

## Sustainable Commercialization & Product Virality

- [x] [BIZ] Hybrid pricing model: Free Starter + $49 Core Lifetime perpetual license + $8/mo / $49/yr Pro tier + $119 Privacy Professional tier.
- [x] [BIZ] Student and Open Source Developer 50% discount program ($29 Core Lifetime).
- [x] [BIZ] Switcher acquisition offer: 40% off first year / $20 off Lifetime for users migrating from Wispr Flow or Superwhisper.
- [x] [VIRALITY] Shareable custom vocabulary and voice-command packs (`.HushWrite/pack.json`) with community pack directory.
- [x] [VIRALITY] In-app post-activation referral trigger: prompt users with personal referral invite only after 50 successful dictations (never during onboarding).
- [x] [VIRALITY] "Made with local dictation" exportable badge templates for GitHub issues, PRs, and documentation.
- [ ] [SEC] Privacy Professional tamper-evident local audit logger & OS Keychain encrypted configuration export.
- [ ] [BIZ] Enterprise self-hosted license — A volume license key (offline-verifiable, no phone-home) that unlocks centralized IT policy enforcement, fleet-level dictionary sync via shared network path, and usage reporting exports for compliance.
- [ ] [BIZ] Reseller / MSP partner program — A partner portal where managed service providers can purchase seats in bulk at a 30% discount and manage their clients' licenses under a unified dashboard.
- [ ] [BIZ] Affiliate program — A referral link system with 30% recurring commission for content creators, YouTubers, and productivity bloggers who refer paying customers.
- [ ] [VIRALITY] Community voice pack directory — A curated, versioned registry at `packs.HushWrite.app` (or a GitHub repo) listing community-contributed domain packs (medical, legal, coding, creative writing) with one-click install.
- [ ] [VIRALITY] "HushWrite Power User" certification — A shareable badge awarded after 10,000 dictated words and a quiz on advanced features. Meant for community recognition and LinkedIn sharing.
- [ ] [BIZ] Annual subscription auto-renew reminder — Email users 30 and 7 days before their annual subscription renews with a "Lock in current pricing" offer for multi-year prepayment.
- [ ] [BIZ] Churned user win-back flow — If a Pro subscriber cancels, wait 30 days then send a single re-engagement email with 3 months free to try again.

---

## Analytics & Stats

- [ ] [FEAT] Daily/weekly summary notification — Optionally show a Windows toast at end-of-day: "You dictated 1,240 words today across 14 sessions, saving ~8 minutes of typing."
  - Calculate "time saved" as `word_count / BASELINE_WPM * 60` seconds
  - Show at 6 PM local time (configurable) only on days with at least 1 session
  - Respect system Do Not Disturb
- [ ] [FEAT] WPM vs typing speed comparison — Compare the user's dictation WPM against their `BASELINE_WPM` to show how much faster they speak than type.
  - Show as a ratio card: "You speak 3.2x faster than you type"
  - Update the ratio after each WPM calibration
- [ ] [FEAT] App breakdown stats — In the stats dashboard, show which apps received the most dictated words (already tracked via `app_bundle_id` on each session).
  - Bar chart sorted by word count descending
  - Group sessions by `app_bundle_id` and sum `word_count`
  - Show app icon alongside the app name using the Windows icon extraction API
- [ ] [FEAT] Error rate tracking — Track how often sessions end in `Failed`, `Orphaned`, or `Cancelled` states and surface them in the stats view as a reliability metric.
  - Error rate = (failed + orphaned) / total sessions, rolling 7-day window
  - Show a "Reliability" gauge: green (>95%), yellow (90-95%), red (<90%)
  - Link to the log file from the gauge for debugging
- [ ] [FEAT] Latency percentile dashboard — Show p50/p90/p99 of `TailDecode` and `TotalFinalize` latencies from the `services/metrics.rs` data in the stats view.
- [ ] [FEAT] Vocabulary growth chart — Track the number of unique words in the user's dictionary over time and show a growth trend line in the stats dashboard.
- [ ] [FEAT] Peak dictation hours heatmap — Show a 7-day x 24-hour heatmap of session count to help users understand when they dictate most.
- [ ] [FEAT] Correction frequency report — Show which words the user corrects most often (from the correction learning system) as a ranked list, with a "Add to substitutions" shortcut next to each.
- [ ] [FEAT] Language distribution pie chart — For multilingual users, show a breakdown of sessions by detected language.
- [ ] [FEAT] CSV/JSON stats export — Let users export all aggregated stats data (not raw transcripts) to a file for personal analysis in Excel or Python.

---

## Integrations

- [ ] [FEAT] Browser extension — A Chrome/Edge extension that lets the dictation pill appear inside browser text fields without the clipboard round-trip, using the extension's input event injection API.
  - Extension communicates with the HushWrite desktop app via the native messaging host API
  - The extension registers a background service worker that listens for transcript events from the native host
  - Inject text using `InputEvent` with `inputType: "insertText"` for maximum compatibility
  - Show a small HushWrite icon in focused text fields as a visual affordance
- [ ] [FEAT] VS Code extension — Trigger HushWrite from VS Code's command palette and have the transcript inserted at the cursor via the VS Code extension API (`editor.edit`).
  - Commands: `HushWrite.startDictation`, `HushWrite.stopDictation`, `HushWrite.cancelDictation`
  - Show a status bar item that pulses during recording
  - Subscribe to transcript events from the local WebSocket API
- [ ] [FEAT] REST / WebSocket API — Expose a local WebSocket server so third-party apps can subscribe to transcript events in real time (e.g. for streaming captions on OBS).
  - Endpoint: `ws://127.0.0.1:{port}/events`
  - Events: `session_started`, `partial_transcript`, `session_completed`, `session_cancelled`
  - Authentication: a session token stored in registry, required in the `Authorization: Bearer` header on upgrade
  - Document with an OpenAPI 3.1 spec and a 10-line JavaScript client example
- [ ] [FEAT] AutoHotkey / PowerShell trigger — Document and expose a named pipe or local socket that external scripts can write to in order to start/stop sessions programmatically.
  - Named pipe: `\\.\pipe\HushWriteControl`
  - Protocol: line-delimited JSON commands `{ "command": "start_session" }` / `{ "command": "stop_session" }`
  - Document in `docs/SCRIPTING.md` with 5 AutoHotkey v2 examples
- [ ] [FEAT] Whisper API compatibility layer — Expose a local HTTP endpoint that accepts audio files and returns transcripts in the OpenAI Whisper API format, so existing tools (Raycast, Obsidian plugins) can use HushWrite as a local Whisper backend.
  - Endpoint: `POST http://127.0.0.1:{port}/v1/audio/transcriptions`
  - Accept: `multipart/form-data` with `file` and optional `language`, `model`, `response_format` fields
  - Return: OpenAI-compatible JSON `{ "text": "..." }` or verbose JSON with word timestamps
  - Rate limit: 10 concurrent requests max to prevent VRAM exhaustion
- [ ] [FEAT] Obsidian plugin — A community Obsidian plugin that starts HushWrite dictation from a ribbon icon or command palette and inserts the final transcript at the active cursor in the current note.
- [ ] [FEAT] Notion integration (webhook-based) — After a session, optionally POST the transcript to a user-configured Notion page via the Notion API. Authentication via a user-provided Notion integration token stored in Windows Credential Manager.
- [ ] [FEAT] Raycast extension (macOS) — A Raycast extension that surfaces a "Dictate with HushWrite" command and shows the 5 most recent transcripts in a Raycast list view.
- [ ] [FEAT] OBS WebSocket caption overlay — When the local WebSocket API is active, provide a ready-to-import OBS source preset that displays the live partial transcript as a caption overlay during streams or recordings.

---

## Known Bugs & Tech Debt

- [x] [BUG] `modifier_tap.rs` uses `static mut` with mutable references — Refactored into safe `Mutex<SharedState>`, fully Rust 2024 compliant with zero `static_mut_refs` warnings.
- [x] [BUG] `PillMetrics.exit_ms` and `exit_travel` are dead code — Wired up animation accessor functions (`pill_exit_ms`, `pill_exit_travel`, `pill_width_compact`) in `tray.rs`.
- [x] [BUG] Updater endpoint 404 on dev builds — Added `TAURI_UPDATER_DISABLE=1` and debug mode checks in `bootstrap.rs` and `updates.rs` to prevent 404 endpoint errors on dev launches.
- [x] [BUG] Session orphan recovery runs before audio device is available — Added audio device readiness check before querying and recovering orphan sessions at startup in `bootstrap/recovery.rs`.
- [x] [TECH DEBT] `bootstrap.rs` is 2000+ lines — Modularized `bootstrap.rs` into clean submodules: `bootstrap/windows.rs`, `bootstrap/hotkeys.rs`, `bootstrap/engine.rs`, `bootstrap/recovery.rs`, `bootstrap/updates.rs`, and `bootstrap/mod.rs`.
- [x] [TECH DEBT] `registry/mod.rs` is 727 lines — Modularized capability and setting declarations into per-capability submodules under `registry/capabilities/`.
- [x] [TECH DEBT] `adapters/rules/text.rs` is 39 KB — Split the filler, correction, punctuation, whitespace, dictionary, and spoken command logic into dedicated modular files under `adapters/rules/` with a clean re-export and test facade in `text.rs`.
- [x] [TECH DEBT] No API versioning on IPC commands — Added API versioning contracts (`CURRENT_API_VERSION`, `MIN_COMPATIBLE_API_VERSION`, `ApiVersionInfo`) and registered `get_api_version` IPC command with Specta bindings to prevent frontend/backend drift.
- [x] [TECH DEBT] `tauri.conf.json` `resources: []` — Enhanced model bundling support with multi-directory fallback resolver checking Tauri resource directory and APPDATA models path so releases can bundle models cleanly.
- [x] [BUG] Tray tooltip shows stale WPM after a session with zero words — The `last_session_wpm` value in the tray tooltip is not reset when a session is cancelled or produces an empty transcript. Guard with `word_count > 0` before updating the WPM display.
- [x] [BUG] Settings page scroll position resets on every route navigation — The settings route unmounts and remounts on each tab switch, losing scroll position. Lift the scroll container outside the tab router or use a scroll restoration hook.
- [x] [BUG] History FTS search returns duplicate results when a session matches in both `raw_text` and `final_text` — The FTS5 virtual table joins against the sessions table without `DISTINCT`. Add `GROUP BY sessions.id` or use `SELECT DISTINCT` in `search_sessions`.
- [x] [TECH DEBT] IPC command handlers have inconsistent error logging — Some handlers log the error before returning it, some log after, some not at all. Standardize: the command factory should be the sole logger for all command-level errors.
- [x] [TECH DEBT] `services/sessions.rs` is approaching 500 lines — Pre-emptively split into `services/sessions/crud.rs`, `services/sessions/search.rs`, `services/sessions/stats.rs` before it hits the 400-line single-responsibility limit.
- [x] [TECH DEBT] No integration tests for the IPC command factory — The factory's validation, permission preflight, and reentrancy guard logic is only covered by unit tests on the factory itself. Add integration tests that call commands end-to-end through a test app handle.
- [x] [TECH DEBT] Hardcoded color values in `pill.html` — The pill HTML uses inline rgba color values that do not respect the app's design token system. Replace with CSS custom properties matching the design system tokens from `docs/04-DESIGN-SYSTEM.md`.
- [x] [DX] Pre-commit hook for SOT keyword checks — Add a `pre-commit` hook that runs `pnpm sot:validate` and fails if any Rust file over 50 lines is missing a `SOURCE OF TRUTH KEYWORDS` header.
- [x] [DX] `cargo-deny` for supply chain security — Add `deny.toml` with `licenses` and `bans` sections to block GPL-incompatible dependencies and known-bad crate versions from entering the build.

---

## Accessibility

> Goal: WCAG 2.1 AA compliance across all in-app UI. The pill must be operable with keyboard and screen reader only.

- [ ] [UX] Full keyboard navigation in the dashboard — Every interactive element (button, input, tab, list item) must be reachable and operable without a mouse. Tab order must be logical and visible with a clear focus ring.
- [ ] [UX] High-contrast mode support — Test the dashboard and pill in Windows High Contrast mode (Aquatic, Desert, Dusk, Night Sky) and fix any elements that become invisible or unreadable.
- [ ] [UX] Screen reader session announcements — When a session starts, announce "HushWrite recording started". When it ends, announce "Transcript delivered: [N] words". Use `aria-live="assertive"` for recording events and `aria-live="polite"` for delivery.
- [ ] [UX] Focus trap in modals — The settings modal, update dialog, and onboarding overlay must trap focus so Tab never escapes to the background content behind the overlay.
- [ ] [UX] Color-independent status indicators — All status indicators (mic level, delivery status, error states) must have a non-color cue (icon, text, or pattern) in addition to color so colorblind users get the same information.
- [ ] [UX] Minimum tap target size — All clickable elements in the pill and dashboard must be at least 44x44px to support motor-impaired users.
- [ ] [UX] Motion reduction support — Respect `prefers-reduced-motion` media query. When set, disable all CSS transitions and animations and replace with instant state changes.
- [ ] [UX] Zoom support — Ensure the dashboard layout does not break at 200% browser zoom or Windows display scaling up to 300%.
- [ ] [DX] Automated accessibility audit in CI — Add `axe-core` (via Playwright) to the CI pipeline to catch regressions in ARIA roles, focus management, and color contrast automatically on every PR.

---

## Testing & Quality Assurance

- [ ] [DX] End-to-end test suite with Playwright — Cover the critical user flows: onboarding, model download, first dictation, history search, settings export/import, and update installation.
  - Use Playwright's tauri driver or the local WebSocket API to drive dictation events from test scripts
  - Run on `windows-latest` and `macos-latest` GitHub Actions runners
- [ ] [DX] Property-based tests for text enhancement rules — Use `proptest` or `quickcheck` to fuzz the filler removal, punctuation normalization, and spoken command expansion rules with random inputs to catch edge cases.
- [ ] [DX] Golden file tests for the rules pipeline — Maintain a `tests/golden/` directory of input transcripts and expected outputs for each rule. These double as regression tests and documentation.
- [ ] [DX] Load test for the IPC command factory — Simulate 100 concurrent IPC calls to the transcription pipeline and verify that the reentrancy guard correctly serializes sessions and that memory does not grow unboundedly.
- [ ] [DX] Model download failure simulation — A test mode that injects HTTP errors (timeout, 404, partial download) into the model downloader to verify resume, retry, and error UI behavior.
- [ ] [DX] Audio fixture library — A curated set of WAV files (clear speech, noisy speech, silence, multi-speaker, non-English, code dictation) used as inputs across all audio pipeline tests.
- [ ] [DX] Snapshot tests for the dashboard UI — Use Storybook or Playwright screenshot tests to capture a pixel snapshot of each dashboard view and fail if the snapshot changes unexpectedly.
- [ ] [DX] Mutation testing — Run `cargo-mutants` on the session state machine and text enhancement rules to measure test effectiveness and identify untested branches.

---

## Documentation

- [ ] [DX] Architecture overview diagram — A Mermaid diagram in `docs/01-ARCHITECTURE.md` showing the full data flow from hotkey press to text injection, including all actors, ports, adapters, and services.
- [ ] [DX] `docs/00-START-HERE.md` — A new contributor guide explaining the layered architecture, SOT keyword system, how to find things with `pnpm sot`, and the 5-step workflow for adding a new feature (registry -> command -> service -> UI -> test).
- [ ] [DX] API reference for the WebSocket / REST API — An OpenAPI 3.1 spec in `docs/api/openapi.yaml` generated from the Rust types via a custom build step, with a rendered HTML version at `docs/api/index.html`.
- [ ] [DX] Contributing guide (`CONTRIBUTING.md`) — Setup instructions (Rust toolchain, Bun, system dependencies), code style rules (referencing CLAUDE.md), PR process, and how to run the test suite locally.
- [ ] [DX] Security policy (`SECURITY.md`) — How to responsibly disclose vulnerabilities, the PGP key for encrypted reports, the expected response timeline, and a summary of the threat model.
- [ ] [DX] `docs/04-DESIGN-SYSTEM.md` completeness audit — Verify every design token used in the codebase is documented in the design system file, and every documented token is actually used. Remove orphaned tokens.
- [ ] [DX] Changelog automation — A GitHub Actions workflow that drafts the `CHANGELOG.md` entry for each release by categorizing `git log` entries since the last tag into Added, Changed, Fixed, and Removed sections.
- [ ] [DX] In-app help docs — A searchable in-app help panel (accessible via `?`) that renders markdown from `docs/` at build time so users can look up features without opening a browser.

---

## Community & Ecosystem

- [x] [COMMUNITY] Discord server — A public Discord community blueprint and setup guide (`docs/DISCORD_SETUP.md`) for HushWrite users and contributors with channels for `#announcements`, `#feature-requests`, `#bug-reports`, `#showcase-and-packs`, and `#dev-general`.
- [x] [COMMUNITY] Community voice pack directory — A GitHub repository (`packs/`) where contributors can PR their domain-specific voice packs (medical, legal, coding, creative writing) following a schema (`packs/schema.json`) and review process (`packs/README.md`).
- [x] [COMMUNITY] Public feature roadmap — A public `ROADMAP.md` showing the current quarter's planned features, in-progress items, and the next quarter's backlog, updated quarterly with strict zero-cloud promises.
- [x] [COMMUNITY] User feedback widget — A subtle in-app thumbs-up/thumbs-down feedback button visible in session history and playback (`SessionFeedback.tsx`) that stores ratings locally and allows quick vocabulary additions without cloud telemetry.
- [x] [COMMUNITY] Open beta program — A public beta channel guide (`docs/OPEN_BETA.md`) where users can opt in to pre-release builds, with a dedicated `#beta-feedback` Discord channel and structured release cadence.
- [x] [COMMUNITY] Contributor recognition — A `CONTRIBUTORS.md` file automatically updated by CI after each merged PR, listing contributors alphabetically with their contributions. Linked from the README and the About page in the dashboard.
- [x] [DX] GitHub issue templates — Structured templates for Bug Report, Feature Request, and Security Vulnerability with required fields (reproduction steps, expected vs. actual behavior, system info, HushWrite version).
- [x] [DX] GitHub PR template — A PR checklist template requiring: description of change, testing done, screenshots (for UI changes), and confirmation that SOT headers are present in new files.

---

## Mobile & Cross-Platform

> Long-term aspirational items. Not targeted for 2026.

- [ ] [FEAT] macOS ARM64 (Apple Silicon) release — Official `aarch64-apple-darwin` build with Metal acceleration enabled by default. Requires CI runner with Apple Silicon (GitHub `macos-14` runner).
- [ ] [FEAT] Linux support (experimental) — An `x86_64-unknown-linux-gnu` AppImage build. Audio capture via PipeWire / ALSA. Text injection via `xdotool` or `ydotool` for Wayland.
- [ ] [FEAT] Android companion app (voice capture only) — A minimal Android app that captures audio and streams it to the desktop HushWrite app via local Wi-Fi for dictation while away from the keyboard.
- [ ] [FEAT] iOS companion app — Same as Android: audio capture over local network, no cloud.
- [ ] [FEAT] iPad split-screen optimization — When running the companion app in iPad split-screen, show the pill in the companion app's view rather than the desktop.

---

## AI & Machine Learning Roadmap

> Next-generation capabilities. Requires research and validation before specification.

- [x] [FEAT] [ASR] Parakeet ONNX Fast Tier — Integrate `nvidia/parakeet-tdt-0.6b-v2` via ONNX Runtime with DirectML acceleration for sub-50ms English streaming dictation.
  - Established automated NeMo (.nemo) to ONNX conversion pipeline (`scripts/convert_nemo_to_onnx.py`) with provenance and SHA-256 verification.
  - Implemented ultra-compact `nvidia/parakeet-tdt_ctc-110m` variant for instantaneous sub-25ms hotkey command responses.
  - Provided dual-engine architecture (`DualEngine`): Parakeet for English fast mode, Whisper for robust 99-language coverage.
- [x] [FEAT] [LLM] Local Smart Cleanup & Voice Transforms via llama-cpp-2 (GGUF) — Ship on-device LLM cleanup for Windows without Apple Foundation Models.
  - Integrated `Qwen/Qwen2.5-1.5B-Instruct-GGUF` (Q4_K_M on CPU / Q5_K_M on GPU) for sub-second filler removal and multilingual formatting.
  - Integrated `microsoft/Phi-3.5-mini-instruct-gguf` (Q4_K_M / Q6_K) for deep tone rewriting and complex voice transformations ("Hey HushWrite, make that formal").
  - Auto-selects Q4_K_M quantization for CPU-bound laptops to maintain sub-second latency and minimal memory footprint.
- [ ] [RESEARCH] On-device speaker identification — Explore a lightweight speaker embedding model (e.g. SpeakerNet, EcapaTDNN at <20MB) that can distinguish between 2-5 enrolled speakers without cloud processing.
- [ ] [RESEARCH] Continual learning from corrections — Investigate whether whisper.cpp supports fine-tuning from correction pairs, or whether a lightweight adapter (LoRA) layer can be trained incrementally on-device with <100 examples.
- [ ] [RESEARCH] Emotion-aware post-processing — Detect the emotional tone of the dictation (excited, tired, frustrated) from prosody features and adjust the enhancement style accordingly (e.g. add exclamation points for excited speech).
- [ ] [RESEARCH] Active noise cancellation pre-filter — Evaluate a real-time ANC model (e.g. RNNoise at 90KB) as a pre-filter before the VAD and Whisper encoder to improve WER in noisy environments by 10-20%.
- [x] [RESEARCH] Personalized vocabulary fine-tuning evaluation — Evaluated vocabulary-biased prompting vs. on-device LoRA adaptation on 500+ session histories.
  - **Verdict:** Adopt a 3-tier hybrid strategy: (1) Dynamic TF-IDF & recency prompt prefix biasing (15–40% rel WER reduction on keywords, 0MB footprint, 0 compute), (2) Local LLM post-processing glossary injection, and (3) Opt-in offline background LoRA ($r=8$ cross-attention) acoustic adaptation on AC power with anchor replay regularization.
- [ ] [FEAT] 3-Tier Adaptive Personalization Pipeline:
  - Implement dynamic frequency & recency budget packer (<=200 tokens) for `whisper_full_params.initial_prompt` based on user edit history.
  - Pass user dictionary terms to local LLM smart cleanup prompt context.
  - Implement opt-in background audio/text correction pair dataset logger with anchor regularization for acoustic LoRA fine-tuning.
- [ ] [FEAT] Multimodal context injection — Allow users to screenshot the current screen and pass it as context to the LLM post-processing pass, so the LLM can infer intent from the visual context (e.g. if a code file is visible, prefer code formatting).
- [ ] [FEAT] Voice cloning protection — Detect if the input audio is a synthetic voice clone (using a lightweight spoofing detection model) and refuse to transcribe it, protecting against replay attacks on voice-triggered systems.

---

## Air-Gap & Verifiable Offline Mode

> Goal: prove the mode, not just claim it. Visible state, blocked-egress tests, and a fail-closed default — otherwise a dependency or telemetry path can quietly reopen the boundary.

- [x] [SEC] In-app "Air-Gap / Hardware Isolation Mode" kill-switch — Closes reqwest sockets, blocks GitHub release check, and blocks CDN model manifest fetch. Persists across restarts. Shows a persistent "Air-Gapped" badge in the dashboard header.
- [ ] [SEC] Egress smoke-test harness — A `cargo test --features air_gap_smoke` target that boots the app in a mock network environment, confirms zero outbound socket connections are attempted, and fails if any `reqwest::Client` call escapes the local-only adapter.
  - Mock network via `mockito` or a custom `Tower` transport layer that rejects non-loopback addresses
  - Assert that update checks, model manifest fetches, and CDN downloads all return `AirGapBlocked` errors cleanly
  - Run in CI on every PR that touches `services/`, `bootstrap/`, or `registry/`
- [ ] [SEC] Reproducible network lockdown guide — A `docs/AIR_GAP_VERIFICATION.md` that walks users through:
  1. Enabling Air-Gap Mode in settings
  2. Configuring Windows Firewall to block all outbound traffic for `HushWrite.exe`
  3. Using Wireshark / `netstat` to confirm zero packets leave the machine during a 60-second dictation session
  4. A checkable "pass" criterion: zero established connections outside `127.0.0.1`
- [ ] [SEC] Fail-closed default for model downloads — When Air-Gap Mode is active and a user attempts to download a new model, show a clear error: "Air-Gap Mode is active. Download a model manually and import it via File > Import Model." Never silently disable air-gap to satisfy a download.
- [ ] [SEC] Process-level network sandbox option (Windows) — Optionally launch `HushWrite.exe` via a restricted Windows Job Object (`JOBOBJECT_BASIC_LIMIT_INFORMATION`) that denies outbound connections at the OS level, independently of the in-app toggle.
  - Document that this is a defense-in-depth option for high-security environments
  - Provide a PowerShell wrapper script: `Start-HushWriteAirGapped.ps1`
- [ ] [SEC] Air-Gap Mode tamper indicator — If any binary or registry change is detected that would re-enable networking while Air-Gap Mode is set, show a persistent warning on next launch: "Air-Gap setting may have been modified externally."
- [ ] [CONTENT] Third-party egress verification video — Record a screen capture showing Wireshark open beside HushWrite during a full dictation session with Air-Gap Mode on. Publish as a pinned post on Discord and a page on the website.
- [ ] [SEC] Dependency network audit — Run `cargo tree` and audit every `[dependencies]` crate for hidden telemetry or background HTTP clients. Document the audit result in `docs/DEPENDENCY_AUDIT.md`.
  - Flag: `reqwest`, `ureq`, `hyper`, `isahc`, and any crate that transitively pulls in an HTTP client
  - Confirm each HTTP-capable crate is gated behind a feature flag or is never called in production code paths

---

## Onboarding & Growth Experiments

> Goal: maximize the percentage of first-time installs that complete onboarding and dictate at least once within 10 minutes.

- [x] [UX] 5-minute "first wow" onboarding flow — Mic permissions → model weight download → first in-app dictation test.
- [x] [UX] Adaptive onboarding re-entry — Resume from last completed step rather than restarting if user exits mid-flow.
- [ ] [FEAT] A/B test: instant vs. guided onboarding — Test two onboarding variants: (A) immediate skip-to-dictation with a floating tip overlay vs. (B) the current guided 4-step flow. Measure completion rate and time-to-first-dictation. Store the variant flag in registry.
  - Variant selection: hash user UUID mod 2 for deterministic assignment
  - Log variant and outcome to the local analytics table (no cloud)
  - Evaluate after 500 completed installs
- [ ] [FEAT] Video onboarding mode — An optional 90-second embedded video (self-hosted, no YouTube embed) that demos the core flow. Show as an alternative to the interactive tutorial.
  - Video is bundled as a `.mp4` in the app resources (no network dependency)
  - Auto-play muted with captions; click to unmute
  - Skip button always visible
- [ ] [UX] Social proof on first launch — Show a rotating "HushWrite users have dictated X million words" stat (calculated locally from the community analytics page) on the welcome screen to establish trust at install time.
- [ ] [FEAT] Hardware compatibility check at install — Before downloading a model, run a quick CPU capability scan (SIMD support, core count, RAM) and pre-select the best-fit model quantization. Show estimated download time and decoding speed.
  - Use CPUID instruction via a small Rust binary
  - Map `AVX2 + 8 cores + 16GB RAM` → suggest `large-v3-turbo Q5_0`
  - Map `no AVX + 4 cores + 8GB RAM` → suggest `tiny Q4_0`
- [ ] [FEAT] Post-install follow-up email prompt — After 48 hours (detected by a local timer in registry), prompt the user once to optionally enter their email for the newsletter. Store locally only; never auto-submit.
- [ ] [UX] Personalization quiz at onboarding — Ask 3 questions: primary use case (writing, coding, meetings), typing speed estimate, and preferred verbosity level. Pre-configure enhancement rules and model selection based on answers.
- [ ] [GROWTH] Referral flow at first-success moment — Immediately after the user's first successful dictation delivery, show a non-intrusive "Share HushWrite" card with a pre-populated tweet and a personal referral link. Never show before that milestone.
- [ ] [DX] Onboarding analytics in local DB — Track funnel step completion (step 1 done, step 2 done, etc.) and drop-off points in a local `onboarding_events` SQLite table. Surface an onboarding conversion funnel in the dev diagnostics panel.

---

## macOS Feature Parity

> macOS parity items needed before a public macOS GA release.

- [ ] [FEAT] macOS notarization — Submit the `.dmg` to Apple's notarization service via `xcrun altool` or `notarytool` in CI. Unsigned DMGs trigger Gatekeeper quarantine warnings on first open.
  - Requires an Apple Developer ID Application certificate
  - Integrate into the GitHub Actions `macos-latest` build job
  - Add the notarization step before the `staple` step
- [ ] [FEAT] macOS Gatekeeper approval guide — Until full notarization is in place, provide a clear in-app first-launch dialog explaining the manual approval steps (System Settings → Privacy & Security → Open Anyway) with annotated screenshots.
- [ ] [FEAT] Metal GPU acceleration (macOS) — Verify `whisper-rs` with the `metal` feature compiles and runs correctly on Apple Silicon and Intel Macs. Publish benchmark results (RTF) for M1, M2, M3, M4, and Intel Core i7 in `docs/BENCHMARKS.md`.
- [ ] [FEAT] CoreML encoder acceleration — Re-enable the `coreml` feature gate for macOS builds and automate the `.mlmodelc` encoder compilation step via `coremltools` in the build pipeline. Document the first-run Neural Engine compile time (15-60s) in the onboarding UI.
- [ ] [WIN → macOS] Tray icon dark mode support — Mirror the Windows dark/light tray icon variants for macOS NSStatusItem using `NSAppearance` observation.
- [ ] [FEAT] macOS permission audit — Verify that `NSMicrophoneUsageDescription`, `NSAppleEventsUsageDescription`, and accessibility permissions are correctly requested and that the app exits gracefully if any critical permission is denied (instead of silently failing).
- [ ] [BUG] macOS Dock icon appears during recording — When the pill window is shown, macOS sometimes shows the HushWrite app in the Dock. Set `activation_policy = Accessory` to prevent this, while still allowing the settings window to activate the Dock item on demand.
- [ ] [FEAT] macOS Raycast integration — A Raycast extension that triggers dictation from the Raycast launcher and shows the 5 most recent transcripts in a Raycast list view.
- [ ] [FEAT] macOS Shortcuts app integration — Register `HushWrite.startDictation` and `HushWrite.stopDictation` as Shortcuts-compatible intents so users can chain dictation into multi-step Shortcuts automations.
- [ ] [UX] macOS native menu bar extra — Replace the generic Tauri tray icon with a proper `NSStatusItem` with a recording waveform animation that respects the macOS menu bar appearance on light, dark, and high-contrast modes.

---

## Enterprise & Compliance

> Goal: unblock procurement in regulated industries (healthcare, legal, finance, government).

- [ ] [SEC] HIPAA architectural alignment document — Publish a `docs/HIPAA_ALIGNMENT.md` that maps each HIPAA Security Rule safeguard (§164.312) to a HushWrite control. Emphasize: data never leaves the device, no BAA required, configurable retention, audit log.
  - Include explicit disclaimer: HushWrite is a general-purpose tool and does not certify HIPAA compliance. The document explains how the architecture supports compliance programs.
- [ ] [BIZ] Enterprise MSI deployment guide — A `docs/ENTERPRISE_DEPLOYMENT.md` covering silent install via `msiexec /q`, Group Policy registry key pre-provisioning, and how to pre-configure the default model and Air-Gap Mode via a deployment config file.
  - Silent install command: `msiexec /i HushWrite_1.2.1_x64_en-US.msi /qn /l*v install.log`
  - Registry keys that can be pre-set: `HKLM\Software\HushWrite\*`
  - Group Policy ADMX template: `HushWrite.admx` defining all IT-controllable settings
- [ ] [INFRA] Offline license validation — Ship a license key validator that works fully offline using RSA signature verification against a bundled public key. No phone-home required to activate Pro or Enterprise tiers.
  - License payload: JSON `{ "tier": "enterprise", "seats": 100, "expiry": "2027-09-01", "issued_to": "Acme Corp" }` signed with RSA-PSS SHA-256
  - Validation: verify signature against bundled `license_public_key.pem` at startup
  - Grace period: 30 days of offline operation after the license expiry date before features are locked
- [ ] [SEC] SOC 2 Type I readiness self-assessment — A `docs/SOC2_READINESS.md` mapping the five Trust Service Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy) to HushWrite's architecture controls.
- [ ] [BIZ] Volume purchase portal — A self-serve portal where IT admins can purchase 10-1000 seat enterprise licenses, download the latest MSI, and retrieve license keys. Payments via Stripe; portal hosted on `enterprise.hushwrite.app`.
- [ ] [FEAT] Fleet management registry export — Enterprise IT can export a JSON report of all HushWrite registry keys across managed machines via a PowerShell script: `Get-HushWriteFleetReport.ps1`.
- [ ] [FEAT] Centralized dictionary server (Enterprise) — Allow enterprise admins to host a read-only dictionary server on an internal URL. HushWrite clients poll it for updates on a configurable interval. All traffic stays within the corporate network.
  - Protocol: simple HTTPS GET returning `{ "version": 42, "entries": [...] }` JSON
  - Client polls every 6 hours when on a corporate network (detected via DNS suffix)
  - Updates merged read-only; local personal entries are preserved
- [ ] [COMPLIANCE] Data residency declaration — Publish a one-page `docs/DATA_RESIDENCY.md` confirming that all voice data, transcripts, and settings are stored exclusively on the end-user device and never replicated to any server, cloud storage, or CDN.
- [ ] [SEC] Penetration test (external) — Commission an external pen test of the local WebSocket API endpoint, the model download pipeline, and the IPC command factory. Publish a redacted summary of findings and remediations.

---

## Release Engineering & CI/CD

> Goal: make releasing a new version a one-command, fully automated, reproducible operation.

- [ ] [INFRA] Fully automated release pipeline — A GitHub Actions workflow triggered by pushing a `v*` tag that:
  1. Runs `cargo test` and `bun test` across all supported platforms
  2. Bumps the version in `package.json`, `Cargo.toml`, and `tauri.conf.json` via a script
  3. Builds `x86_64-pc-windows-msvc` NSIS + MSI bundles
  4. Builds `aarch64-apple-darwin` and `x86_64-apple-darwin` DMGs
  5. Signs Windows binaries via Azure Trusted Signing and macOS binaries via `codesign + notarytool`
  6. Uploads artifacts to the GitHub Release
  7. Updates `website/public/downloads/` and triggers a Vercel deployment
  8. Generates `SHA256SUMS.txt` and attaches it to the release
  9. Posts a release summary to the Discord `#announcements` channel
- [x] [INFRA] Version bump script — A single `scripts/bump_version.ps1` script that accepts a semver string and atomically updates `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `website/src/components/Hero.tsx`, `website/src/components/DownloadSection.tsx`, `website/src/components/Footer.tsx`, and `website/src/app/api/download/route.ts` in one pass.
- [ ] [INFRA] Windows ARM64 target — Add `aarch64-pc-windows-msvc` to the CI build matrix for Snapdragon X Elite / Surface Pro devices. Validate that `whisper.cpp` compiles with NEON SIMD on ARM64 Windows.
- [ ] [INFRA] Delta update pipeline automation — Automate `scripts/generate_delta.py` as part of the release workflow: compare against the previous release binary and generate `*.patch` files alongside the full installer. Upload patches to the GitHub Release assets.
- [ ] [DX] Release checklist template — A GitHub Issue template `RELEASE_CHECKLIST.md` opened automatically by the CI pipeline that tracks: sign-off on changelog, smoke test on Windows 10/11, smoke test on macOS, website preview verification, and Discord announcement.
- [ ] [INFRA] Nightly build artifacts — A scheduled CI job that produces unsigned nightly builds from `main` and uploads them to a `nightly` pre-release tag. Download links clearly marked as "Nightly — Unsupported." Used by beta testers and contributors.
- [ ] [DX] Build reproducibility — Configure the Rust build to use a fixed toolchain pinned in `rust-toolchain.toml` and validate that two independent builds from the same source produce bit-identical binaries (modulo timestamp fields). Document the verification steps.
- [ ] [INFRA] Winget manifest auto-update — After each GitHub Release, a CI job automatically opens a PR to the `winget-pkgs` repository with updated version, SHA-256, and installer URL in the HushWrite manifest YAML files.
- [ ] [DX] Pre-release staging environment — A `staging` branch that deploys the website to `staging.hushwrite.app` via a separate Vercel project. Used to validate download links and changelogs before merging to `main`.

---

## Website & Marketing Engineering

> Goal: make the website a high-converting, technically credible, and SEO-dominant presence.

- [x] [FEAT] Live download counter — Show a real-time (or near-real-time) download count on the hero section. Fetch from a lightweight Cloudflare Worker that reads from an R2 counter bucket. Falls back gracefully to a static number if the fetch fails.
- [ ] [FEAT] Latency benchmark interactive demo — An interactive chart on the `/developers` page where visitors can select their CPU tier (budget, mid-range, high-end) and model size (tiny, base, small, medium, large) and see projected RTF and WER numbers from the published benchmark matrix.
- [x] [SEO] Blog / technical articles infrastructure — Add a `/blog` route using MDX files stored in `website/content/blog/`. Each article gets its own `<head>` meta tags, OpenGraph image, and JSON-LD `Article` schema.
  - First 6 articles: latency comparison, privacy deep-dive, developer workflow guide, air-gap verification, HushWrite vs Wispr Flow, HushWrite for lawyers
  - Auto-generate sitemap entries for each blog post
- [x] [FEAT] Changelog page (`/changelog`) — A public, human-readable changelog page built from `CHANGELOG.md` entries, with each version as an anchor. Update on every release. Linked from the footer and in-app update notification.
- [ ] [FEAT] Interactive air-gap proof widget — An embedded component on the landing page showing a simulated Wireshark capture during a HushWrite dictation session (0 packets to external IPs). Animated and visually compelling. Links to the full verification guide.
- [x] [SEO] Programmatic comparison pages expansion — Generate 20 additional comparison pages: `/vs-otter-ai`, `/vs-dragon-anywhere`, `/vs-google-docs-voice`, `/vs-microsoft-dictate`, `/vs-whisperkit`, etc. Each page follows the same template with a structured feature comparison table.
- [ ] [FEAT] Security badge widget — A self-hosted badge at `https://hushwrite.app/badge/air-gapped.svg` that third parties can embed in their docs to indicate HushWrite-compatible integrations. Returns a dynamically generated SVG.
- [x] [PERF] Core Web Vitals optimization — Profile the website against Lighthouse and PageSpeed Insights. Targets: LCP < 1.5s, INP < 100ms, CLS < 0.05. Optimize by:
  - Converting hero images to AVIF/WebP with `next/image`
  - Deferring non-critical JS with `next/dynamic`
  - Preloading the primary CTA download link
- [x] [SEO] Structured data for SoftwareApplication — Ensure `SoftwareApplication` schema on the homepage includes `operatingSystem`, `applicationCategory`, `offers` (with price and priceCurrency), `aggregateRating`, and `downloadUrl`. Validate with Google's Rich Results Test after every deploy.
- [ ] [FEAT] Newsletter signup with double opt-in — A minimal email signup form that uses a self-hosted Listmonk instance (or Buttondown API) for double opt-in. No third-party tracking pixels. Privacy policy linked inline.
- [ ] [FEAT] Verified checksum download page — A dedicated `/verify` page where users can paste a SHA-256 hash and verify it matches the known-good checksum for any version of HushWrite. Useful for enterprise procurement teams.

---

## Observability & Diagnostics

> Goal: give users and developers enough local diagnostic data to self-serve on issues without cloud telemetry.

- [ ] [DX] In-app diagnostics panel — A `Settings > Diagnostics` page showing:
  - App version, Tauri version, OS version, architecture
  - Active model name, quantization, file size, and last-loaded timestamp
  - Average `TailDecodeMs` and `TotalFinalizeMs` from the last 50 sessions
  - Current SQLite database size and session count
  - Audio device name, sample rate, and channel count
  - A "Copy diagnostics" button that formats all fields as a Markdown code block for easy support ticket pasting
- [ ] [DX] Structured log viewer — A `Settings > Logs` tab that renders the last 500 log lines from the rolling log file in a virtual-scrolled list, with severity color coding (TRACE grey, DEBUG blue, INFO green, WARN amber, ERROR red). Filterable by severity and searchable by keyword.
- [ ] [PERF] Session timing breakdown — In the History detail view, show a timing breakdown for each session: `ArmMs`, `VADMs`, `ChunkDecodeMs`, `PostProcessMs`, `DeliveryMs`. Helps users understand where latency is coming from.
- [ ] [DX] One-click diagnostic report — A button in `Settings > Diagnostics` that bundles the last 3 log files, the diagnostic panel JSON, and the registry settings dump (with sensitive values redacted) into a `.zip` file that the user can attach to a support ticket.
- [ ] [PERF] Real-time performance overlay — An optional developer overlay (toggle in advanced settings) that shows a live HUD during recording: CPU%, RAM used by HushWrite, current audio level, VAD state, and the number of chunks pending decode.
- [ ] [INFRA] Local Prometheus metrics endpoint — Emit session metrics (`hushwrite_decode_duration_ms`, `hushwrite_session_word_count`, `hushwrite_delivery_method_total`) to a Prometheus-compatible `/metrics` endpoint on `127.0.0.1:{port}`. Documented for power users running local Grafana.
- [ ] [DX] Error telemetry opt-in (local-only) — An opt-in setting that writes a structured JSON error report to `%APPDATA%\HushWrite\errors\` on every panic or unhandled error. The user can review and delete these files. No network transmission ever.
- [ ] [INFRA] Health check command — A `HushWrite.exe --health` CLI flag that exits with code 0 if the app is running correctly (model loaded, audio device available, SQLite accessible) and code 1 with a JSON error body if any component is degraded.

---

## Monetization Experiments

> Goal: test which pricing and value-delivery levers actually drive conversion without harming trust.

- [ ] [BIZ] Usage-based "Pro features" trial — Allow all users to try Pro features (LLM post-processing, advanced analytics, team dictionary) for 14 days with no credit card required. Activate via a one-click button in settings. Measure conversion rate from trial to paid.
- [ ] [BIZ] Contextual upgrade prompt in-app — When a user hits a limit (e.g. tries to enable LLM cleanup which is Pro), show a contextual, non-blocking upgrade card explaining exactly what they'd get and how much it costs. Never a modal blocker.
- [ ] [BIZ] "Pay what you want" beta-backer tier — A limited-time offer (first 500 users) to get the Core Lifetime license for any amount ≥ $10. Generates goodwill and word-of-mouth without devaluing the standard pricing.
- [ ] [BIZ] Student verification flow — Partner with SheerID or Student Beans to verify student status and automatically apply the 50% discount. Remove the need for manual email verification.
- [ ] [BIZ] "HushWrite for Teams" waitlist — Add a Teams waitlist landing page at `/teams` even before the product exists. Collect emails from early-interest team leads. Use responses to validate feature priorities.
- [ ] [BIZ] Lifetime license gifting — Allow purchasing a Core Lifetime license as a gift. The buyer receives a redeemable code to share. Tracked via a `gift_licenses` table in the purchase database.
- [ ] [VIRALITY] Word count milestone shareable cards — When a user hits 10,000 / 100,000 / 1,000,000 words dictated, generate a shareable card (PNG) they can post to X or LinkedIn. Include their username, stat, and the HushWrite logo.
- [ ] [BIZ] LTD (Lifetime Deal) platform listing — Launch on AppSumo, StackSocial, or DealMirror for a limited 30-day window to acquire a burst of users and reviews. Set a redemption cap to prevent over-dilution.
- [ ] [VIRALITY] Refer-a-developer program — A separate referral code for developers that gives both the referrer and referee one month of Pro free. Tracked by a lightweight Cloudflare Worker. Zero user data leaves the device; only the referral code is exchanged.

---

_Last updated: September 2026._
