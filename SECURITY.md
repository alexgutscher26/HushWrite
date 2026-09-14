# Security Policy

## Overview

HushWrite is designed from the ground up as a zero-cloud, local-first application. Because processing occurs entirely on the local machine and no audio or transcripts are transmitted across the network, the security boundary is fundamentally centered around the local host environment, local inter-process communication (IPC), memory hygiene, and binary integrity.

---

## Supported Versions

Security updates and patches are actively maintained for the following versions:

| Version | Supported | Status          |
| :------ | :-------- | :-------------- |
| 0.1.x   | Yes       | Current Release |
| < 0.1.0 | No        | Unsupported     |

Users are encouraged to run the latest released version to ensure they receive all security and stability updates.

---

## Threat Model and Security Architecture

HushWrite implements defense-in-depth principles across every layer of the application:

### 1. Zero Network Egress

- **Audio and Text Isolation**: Microphone streams and generated transcripts never leave volatile system memory (RAM) and are never transmitted over the network.
- **Controlled Egress**: The application initiates outbound network requests exclusively for:
  1. One-time model weight downloads from verified upstream sources (Hugging Face / GitHub).
  2. Optional, read-only release checks against the GitHub Releases API (which can be disabled in Settings).
- **Air-Gap Capability**: HushWrite operates with 100% feature parity on air-gapped systems or when blocked by host firewalls.

### 2. Memory Hygiene and Audio Lifecycles

- Audio samples are buffered in volatile single-producer single-consumer (SPSC) ring buffers during recording.
- Audio buffers are cleared immediately upon completion or cancellation of transcription.
- Audio data is never written to disk or swap files under standard operating conditions.

### 3. IPC Boundary and Command Safety

- All communication between the webview frontend and the native Rust backend routes through a centralized Command Factory (`src-tauri/src/ipc/factory.rs`).
- Strict schema validation (Specta type generation, Zod schemas) is enforced at the IPC boundary.
- Permissions, reentrancy guards, and error sanitization occur before any backend handler executes.
- Direct invocation of unvalidated commands is structurally prevented.

### 4. Binary and Updater Integrity

- Release binaries and update manifests (`latest.json`) are cryptographically signed using Minisign.
- The corresponding public key is baked into `tauri.conf.json`. The Tauri updater will reject any payload that does not verify against this key.
- Build dependencies are audited against security advisories via automated CI checks (`cargo-deny`, `pnpm audit`).

---

## Reporting a Vulnerability

We take the security of HushWrite and its users seriously. If you discover a vulnerability, please report it responsibly.

### How to Report

Please do **not** file public GitHub issues for security vulnerabilities. Instead, submit your report through one of the following channels:

1. **Email**: Send vulnerability details to [security@hushwrite.app](mailto:security@hushwrite.app).
2. **GitHub Security Advisory**: Submit a private advisory via [GitHub Security Advisories](https://github.com/alexgutscher26/HushWrite/security/advisories/new).

### What to Include

To help us evaluate and address the issue promptly, please include:

- A clear description of the vulnerability and its potential impact.
- Step-by-step instructions or proof-of-concept (PoC) code to reproduce the issue.
- Affected platforms, operating systems, and HushWrite versions.
- Any proposed mitigations or remediation strategies, if known.

---

## Response and Disclosure Process

When a vulnerability is reported:

1. **Acknowledgment**: We will acknowledge receipt of your report within **48 hours**.
2. **Triage and Assessment**: We will assess and reproduce the issue within **5 business days**, providing an initial severity rating and timeline estimate.
3. **Remediation**: We will develop, test, and release a patch in a timely manner according to severity.
4. **Coordinated Disclosure**: We adhere to coordinated vulnerability disclosure. We ask that reporters refrain from publicly disclosing details until an official update is released and users have had reasonable opportunity to update.

---

## Security Best Practices for Users

- Only download HushWrite installers and binaries from official sources: the [HushWrite Website](https://hushwrite.app), official [GitHub Releases](https://github.com/alexgutscher26/HushWrite/tags), or the Microsoft Store.
- Verify downloaded installer hashes against the published `SHA256SUMS.txt` list.
- Keep your operating system updated to maintain platform-level sandboxing, accessibility security, and driver protections.
