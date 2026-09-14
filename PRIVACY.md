# Privacy Architecture and Data Boundary

HushWrite is engineered with a strict local-first, zero-cloud architecture. Audio processing, speech recognition, and text delivery execute entirely on local hardware. No user accounts, cloud servers, telemetry trackers, or external analytics endpoints are involved in dictation.

---

## 1. Local Data Boundary Ledger

The following ledger details how every class of data is processed, stored, and retained:

| Data Category                      | Storage Location                           | Network Transmission      | Retention and Lifecycle                                                                             |
| :--------------------------------- | :----------------------------------------- | :------------------------ | :-------------------------------------------------------------------------------------------------- |
| **Microphone Audio**               | Ephemeral System RAM                       | Zero bytes transmitted    | Cleared from volatile RAM immediately upon transcription completion or cancellation                 |
| **Transcripts and Generated Text** | Local SQLite (`sessions.db`) or RAM-only   | Zero bytes transmitted    | Configurable retention (disabled/incognito, 7 days, 30 days, or manual deletion)                    |
| **Custom Vocabulary & Dictionary** | Local SQLite (`dictionary` table)          | Zero bytes transmitted    | Fully editable and erasable on demand by the user                                                   |
| **Window Context (App Title/ID)**  | Ephemeral memory buffer                    | Zero bytes transmitted    | Evaluated in-memory for per-app formatting rules and immediately discarded                          |
| **User Identity & Account Data**   | None                                       | Zero bytes transmitted    | No accounts, logins, emails, or identity registration required                                      |
| **Telemetry & Crash Analytics**    | None                                       | Zero bytes transmitted    | No analytics beacons, trackers, or crash reporting SDKs exist in the binary                         |
| **AI Model Weights**               | Local disk storage (`~/.HushWrite/models`) | One-time initial download | Downloaded once from verified upstream mirrors (Hugging Face / GitHub); operated offline thereafter |
| **Software Update Verification**   | None                                       | Read-only HTTPS query     | Optional read-only check against GitHub Releases API; can be disabled entirely in Settings          |

---

## 2. Audio and Inference Lifecycle Architecture

```text
+-------------------------+
| Microphone Audio Stream |
+-------------------------+
             |
             v (Volatile RAM ringbuffer - zero disk writes)
+-------------------------+
| Local whisper.cpp Core  | (Metal / DirectML / CUDA / AVX2 hardware acceleration)
+-------------------------+
             |
             v (Decoded tokens in-memory)
+-------------------------+
| Local Context Engine    | (Vocabulary biasing, phonetic corrections, punctuation rules)
+-------------------------+
             |
             v (Formatted text string)
+-------------------------+
| OS Cursor Injection     | (Synthetic paste directly into active application window)
+-------------------------+
             |
             +---> Audio ringbuffer immediately cleared from volatile memory
             +---> Optional: Persist transcript text to local SQLite database (disabled in Incognito)
```

---

## 3. Explicit Network Request Disclosure

HushWrite initiates outbound network communication only in two specific scenarios:

1. **Model Weight Download**: When selecting or downloading a new speech model (e.g., `whisper-small-q5_1.bin`), HushWrite retrieves the model file directly from official Hugging Face or GitHub release repositories. Once written to local storage, no further connection is made.
2. **Version Update Checks**: When enabled in user preferences, HushWrite performs a read-only `GET` query against `api.github.com/repos/alexgutscher26/HushWrite/releases/latest` to check if a new version has been published.

Blocking HushWrite in a firewall or running it on an air-gapped system does not disable or degrade any core dictation, formatting, or history functionality.

---

## 4. Regulatory and Compliance Alignment

Because HushWrite does not collect, process, or transmit personal data to external servers, it provides structural compliance for sensitive enterprise workflows:

- **GDPR (General Data Protection Regulation)**: Compliant with Article 25 (Data protection by design and by default). Since personal data is neither processed by a third party nor transmitted off-device, no international data transfer agreements or cloud processor agreements are required.
- **HIPAA (Health Insurance Portability and Accountability Act)**: Protected Health Information (PHI) spoken during clinical documentation remains entirely within the local machine's memory and local disk. No Business Associate Agreement (BAA) with a cloud vendor is necessary.
- **Legal Privilege and Confidential Drafts**: Attorneys, researchers, and developers can dictate privileged or proprietary materials without risk of third-party model retraining, cloud data interception, or subpoena vulnerability.

---

## 5. Independent Verification Procedures

HushWrite's privacy boundary can be audited independently using standard packet capture and network monitoring tools:

### macOS Network Verification (Little Snitch / LuLu)

1. Launch an application firewall (such as LuLu or Little Snitch).
2. Open HushWrite and perform continuous dictation sessions across multiple target applications.
3. Observe process activity: zero network connection attempts are initiated during audio capture, inference, or text injection.

### Windows Network Verification (Packet Monitor / Wireshark)

1. Open PowerShell with Administrator privileges and start a packet trace:
   ```powershell
   pktmon filter add -n HushWrite
   pktmon start --etw
   ```
2. Dictate paragraphs into various desktop editors.
3. Stop the capture and inspect the generated trace:
   ```powershell
   pktmon stop
   pktmon pcapng pktmon.etl -o HushWrite_audit.pcapng
   ```
4. Verify in Wireshark that no outbound TCP/UDP packets were dispatched by the `HushWrite.exe` process.

### Linux Network Verification (NetHogs / tcpdump)

1. Run `sudo nethogs` and filter by the application process ID.
2. Verify that network transmission metrics remain at `0.000 KB/s SENT` and `0.000 KB/s RECV` throughout active transcription.
