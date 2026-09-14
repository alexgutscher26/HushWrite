# Product Hunt Launch Kit: HushWrite

This document is the operational package and submission asset kit for the official **Product Hunt** launch of **HushWrite**.

---

## 1. Submission Listing Metadata

| Field                   | Content                                                                                                                                                                                                                                     | Constraints / Notes                               |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------ |
| **Product Name**        | `HushWrite`                                                                                                                                                                                                                                 | Brand name                                        |
| **Tagline**             | `Fast, private on-device voice dictation for macOS & Windows`                                                                                                                                                                               | **59 characters** (Limit: 60 chars)               |
| **Short Description**   | `HushWrite turns speech into clean, formatted text in any desktop app—running 100% locally on your GPU via whisper.cpp. No cloud audio uploads, no accounts, and sub-180ms latency. Dictate code, notes, and emails with complete privacy.` | **230 characters** (Strict Limit: 260 chars)      |
| **Categories / Topics** | `Productivity`, `Open Source`, `Artificial Intelligence`, `Developer Tools`, `Privacy`                                                                                                                                                      | Primary tags on Product Hunt                      |
| **Website URL**         | `https://HushWrite.app`                                                                                                                                                                                                                     | Canonical landing page                            |
| **GitHub Repo**         | `https://github.com/alexgutscher26/HushWrite`                                                                                                                                                                                               | Open Source (MIT)                                 |
| **Pricing Type**        | `Free + Paid Options`                                                                                                                                                                                                                       | Free core tier + perpetual lifetime & pro options |
| **Platforms Supported** | `macOS (Apple Silicon & Intel)`, `Windows 10/11`                                                                                                                                                                                            | Cross-platform desktop apps                       |

---

## 2. Launch Day Promotional Offer

- **Launch Coupon Code:** `HUNTER25` (Alias: `LAUNCH25`)
- **Discount:** **25% OFF**
- **Eligible Plans:**
  - **Core Lifetime License:** Regular $49 &rarr; **$36.75** (One-time payment, perpetual updates)
  - **Pro Annual Subscription:** Regular $49/year &rarr; **$36.75/year**
- **Validity:** Active for 72 hours from launch day at midnight PST.
- **Redemption:** Applied directly in app settings or on `https://HushWrite.app/pricing` via Stripe checkout.

---

## 3. Visual Assets & Media Specifications

### Screenshot 1: Universal Floating Pill & Real-Time Waveform

- **Filename:** `HushWrite-ph-01-floating-pill.png`
- **Resolution:** `1270 × 760 px` (Standard Product Hunt gallery format, 16:10)
- **Visual Composition:**
  - Background: Split-screen showing VS Code (Rust codebase) on the left and Notion (Meeting notes document) on the right.
  - Center Foreground: HushWrite's floating island pill displaying real-time green audio waveform bars.
  - Callout Badge 1: _"Hold ⌥ Space / Alt+Space anywhere & speak naturally"_
  - Callout Badge 2: _"Sub-180ms end-to-end insertion latency"_
  - Callout Badge 3: _"Zero clipboard pollution or typing lag"_

### Screenshot 2: Hardware Acceleration & Air-Gap Kill-Switch

- **Filename:** `HushWrite-ph-02-hardware-airgap.png`
- **Resolution:** `1270 × 760 px`
- **Visual Composition:**
  - Background: HushWrite Settings Window on dark glassmorphic UI.
  - Active Section: Whisper Model selector showing **Base Q5_0 (142MB)** and **Small Q5_0 (466MB)** stored permanently on local disk.
  - Hardware Acceleration Pill: _"DirectML / Apple Metal GPU Active — 0.16x RTF"_
  - Prominent Switch: **Air-Gap Mode (ENABLED)** with badge: _"0 bytes outbound network egress"_.
  - Callout: _"Audited with Little Snitch & Wireshark: Zero telemetry sockets."_

### Screenshot 3: App-Aware Context Engine & Custom Vocabulary

- **Filename:** `HushWrite-ph-03-context-vocabulary.png`
- **Resolution:** `1270 × 760 px`
- **Visual Composition:**
  - Background: Split view of Terminal / Git commit prompt and an email compose window.
  - Features Highlighted:
    - **Code Mode:** Automatic backtick formatting for inline code, `camelCase` and `snake_case` conversion.
    - **Phonetic Custom Dictionary:** Table showing terms like `kubectl`, `PostgreSQL`, `serde_json`, and `Tauri` mapped to phonetic triggers.
    - **Filler Word Purge:** Demonstration showing raw speech _"Um, so basically we should like, merge this PR"_ converted to _"Merge this PR."_

### Demo GIF: 14-Second Air-Gap Proof Loop

- **Filename:** `HushWrite-ph-demo-airgap.gif`
- **Resolution:** `1280 × 720 px` (60 fps, optimized palette < 4.8MB)
- **Storyboard:**
  1. _Seconds 0–3:_ Cursor clicks Wi-Fi icon in OS menu bar and toggles it **OFF**. A terminal running `sudo tcpdump -i en0` or Windows `pktmon` is visible in the corner showing **0 packets**.
  2. _Seconds 3–8:_ User presses and holds the global shortcut over an empty GitHub Issue textarea. Live voice dictation waveform activates.
  3. _Seconds 8–11:_ Shortcut is released. Formatted markdown with code blocks and bullet points immediately populates the textarea.
  4. _Seconds 11–14:_ Terminal packet monitor zooms in, confirming **0.00 KB** emitted and zero dropped frames.

---

## 4. Maker Bio & Socials

- **Maker Name:** Alex Gutscher
- **Maker Title:** Founder & Systems Engineer at HushWrite
- **Twitter / X:** `@snackforcode`
- **GitHub:** `https://github.com/alexgutscher26/HushWrite`
- **Bio (Profile Text):**
  > _"Systems engineer obsessed with local-first software, latency optimization, and data sovereignty. Built HushWrite to prove that local AI on modern GPUs is faster, cheaper, and fundamentally more private than cloud streaming."_

---

## 5. First-Comment Talking Points (Maker Script)

```markdown
Hey Product Hunt! 👋 I'm Alex, creator of HushWrite.

Over the past year, AI voice dictation experienced a massive renaissance. Being able to articulate thoughts at 160 WPM completely transformed how we review code, write technical documentation, draft emails, and capture meeting notes.

However, when we looked under the hood of popular dictation apps, we were shocked: almost every single tool streams raw microphone audio over WebSockets to remote multi-tenant cloud GPU clusters.

For engineers working on proprietary codebases, lawyers drafting privileged briefs, and clinicians writing patient notes, that architecture is a complete non-starter. Furthermore, round-tripping voice audio across the internet adds 400–1,200ms of latency, breaks on airplanes or spotty Wi-Fi, and ends with a $15/month subscription.

So we set out to build what dictation should have been from day one:
**HushWrite** — a fast, polished voice dictation app that runs 100% locally on your computer.

### What Makes HushWrite Different:

⚡ **Instant Sub-180ms Latency:** Audio is decoded directly on your GPU via `whisper.cpp` (Apple Silicon Metal & Windows DirectML). It is actually faster than cloud round-trips because there is zero network handshake.
🔒 **Air-Gapped Privacy:** Audio stays in RAM and is purged the instant text is typed at your cursor. Zero telemetry, zero analytics SDKs, and zero cloud accounts required.
🎯 **App-Aware Formatting:** HushWrite recognizes whether you are in VS Code, Notion, Slack, or an email client and applies appropriate casing and punctuation automatically.
📖 **Custom Phonetic Dictionary:** Add your proprietary microservice names, team jargon, or code terms (`kubectl`, `async/await`, `serde_json`) so Whisper never mishears them.
💻 **Native Performance:** Built in Rust and Tauri 2 with an idle memory footprint of less than 45MB.

### Our Launch Gift to the Community:

HushWrite is **free and open source (MIT)**. You can download it today and use it with unlimited words forever.

For power users who want advanced model switching (Whisper Medium/Large) and custom workflow profiles, we are offering **25% off** our Core Lifetime perpetual license and Pro tier with coupon code **HUNTER25** for the next 72 hours!

Grab the build at https://HushWrite.app or inspect our code at https://github.com/alexgutscher26/HushWrite.

Turn off your Wi-Fi, hold ⌥ Space (or Alt+Space), and let us know your feedback below! I'll be in the comments all day answering questions about whisper.cpp FFI, DirectML compute shaders, and latency benchmarking. 🚀
```

---

## 6. Launch Day Operational Timetable (PST)

- **12:01 AM PST:** Product listing published on Product Hunt. Verify links, screenshots, and GIF playback.
- **12:05 AM PST:** Post Maker First-Comment with coupon code `HUNTER25`.
- **12:15 AM PST:** Tweet launch thread on X from `@snackforcode` with video clip demo.
- **1:00 AM – 8:00 AM PST:** Engage European & Asian community questions in PH comments.
- **8:00 AM PST:** Share community posts on Reddit (`r/rust`, `r/selfhosted`, `r/MachineLearning`, `r/productivity`).
- **12:00 PM PST:** Midday progress update: share benchmark numbers and reply to technical architecture queries.
- **8:00 PM – 11:59 PM PST:** Final push before leaderboard closes; thank all hunters and contributors.
