# HushWrite Community Voice Pack Directory

Welcome to the **HushWrite Community Voice Pack Directory**. Voice packs provide domain-specific phonetic biasing, custom vocabulary terms, abbreviation expansions, and voice snippet macros for specialized professional workflows.

---

## Starter Domain Packs

| Pack                              | Category   | Terms     | Macros                               | File                                                                           |
| :-------------------------------- | :--------- | :-------- | :----------------------------------- | :----------------------------------------------------------------------------- |
| **TypeScript & Rust Engineering** | Developer  | 60+ terms | PR Checklist, Bug Report, Git Commit | [`engineering/typescript-rust-dev.json`](engineering/typescript-rust-dev.json) |
| **Litigation & Legal Privilege**  | Legal      | 45+ terms | Privileged Header, Discovery Demand  | [`legal/litigation-privilege.json`](legal/litigation-privilege.json)           |
| **Clinical SOAP Notes**           | Healthcare | 70+ terms | SOAP Layout, Vitals Header           | [`medical/clinical-soap-notes.json`](medical/clinical-soap-notes.json)         |
| **Creative Story Drafting**       | Creative   | 40+ terms | Scene Break, Character Arc           | [`creative/story-drafting.json`](creative/story-drafting.json)                 |

---

## How to Import a Voice Pack

1. Open HushWrite **Settings** (`Cmd/Ctrl+,`).
2. Navigate to **Vocabulary & Dictionary** or **General > Import Configuration**.
3. Select any `.json` file from the `packs/` directory to instantly merge the terms and macros into your local SQLite store.

---

## How to Contribute a Voice Pack

We welcome community-contributed voice packs for any industry, programming language, or academic field!

1. Fork this repository.
2. Create a new `.json` file in the appropriate domain subdirectory under `packs/` (e.g. `packs/engineering/python-data-science.json`).
3. Ensure your JSON adheres to [`schema.json`](schema.json).
4. Test your pack locally in HushWrite.
5. Open a Pull Request using our [PR Template](../.github/PULL_REQUEST_TEMPLATE.md).
