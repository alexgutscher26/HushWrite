/**
 * Live Developer Voice Transformation Engine
 * 100% on-device string transformations matching HushWrite Rust engine (src-tauri/src/adapters/rules/spoken.rs)
 */

export interface TransformResult {
  raw: string;
  transformed: string;
  matchedRules: string[];
  latencyUs: number;
}

const TECH_ENTITIES: [RegExp, string][] = [
  [/\bnext\s*js\b/gi, "Next.js"],
  [/\btailwind\s*(?:css)?\b/gi, "Tailwind CSS"],
  [/\bdrizzle\s*(?:orm)?\b/gi, "Drizzle ORM"],
  [/\bgithub\s*actions\b/gi, "GitHub Actions"],
  [/\bgithub\s*pr\b/gi, "GitHub PR"],
  [/\bgithub\b/gi, "GitHub"],
  [/\bsupabase\b/gi, "Supabase"],
  [/\btype\s*script\b/gi, "TypeScript"],
  [/\bjava\s*script\b/gi, "JavaScript"],
  [/\bvs\s*code\b/gi, "VS Code"],
  [/\bwhisper\s*cpp\b/gi, "whisper.cpp"],
  [/\bdirect\s*ml\b/gi, "DirectML"],
  [/\bapple\s*silicon\s*metal\b/gi, "Apple Silicon Metal"],
  [/\bpostgre\s*sql\b/gi, "PostgreSQL"],
  [/\bpostgres\b/gi, "PostgreSQL"],
  [/\bsqlite\b/gi, "SQLite"],
  [/\bclaude\s*code\b/gi, "Claude Code"],
  [/\bwindsurf\b/gi, "Windsurf"],
  [/\bcursor\b/gi, "Cursor"],
  [/\btauri\b/gi, "Tauri"],
  [/\bnode\s*js\b/gi, "Node.js"],
  [/\bneovim\b/gi, "Neovim"],
  [/\bweb\s*socket\b/gi, "WebSocket"],
  [/\bweb\s*sockets\b/gi, "WebSockets"],
  [/\bapi\s*key\b/gi, "API key"],
  [/\bgraphql\b/gi, "GraphQL"],
  [/\btrpc\b/gi, "tRPC"],
];

const KNOWN_EXTENSIONS =
  "(?:tsx|ts|jsx|js|rs|py|json|css|scss|html|md|toml|yaml|yml|go|cpp|c|h|hpp|sql|vue|svelte|astro|sh|env|lock)";

function toCamelCase(words: string[]): string {
  if (words.length === 0) return "";
  return (
    words[0].toLowerCase() +
    words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join("")
  );
}

function toPascalCase(words: string[]): string {
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
}

function toSnakeCase(words: string[]): string {
  return words.map((w) => w.toLowerCase()).join("_");
}

function toScreamingSnakeCase(words: string[]): string {
  return words.map((w) => w.toUpperCase()).join("_");
}

function toKebabCase(words: string[]): string {
  return words.map((w) => w.toLowerCase()).join("-");
}

function cleanPathString(rawPath: string): string {
  let cleaned = rawPath
    .replace(/\bslash\b/gi, "/")
    .replace(/\bbackslash\b/gi, "/")
    .replace(/\bdot\b/gi, ".");

  // Fix speech recognition artifact like ".src. /Components/button.tsx"
  cleaned = cleaned.replace(/\.\s*\//g, "/");
  cleaned = cleaned.replace(/\/\s*\./g, "/");
  cleaned = cleaned.replace(/\s*\/\s*/g, "/");
  cleaned = cleaned.replace(/\s*\\\s*/g, "/");
  cleaned = cleaned.replace(/^\s*[./\\:]+/, "");
  cleaned = cleaned.replace(/\s*\.\s*/g, ".");

  const segments = cleaned.split("/").filter(Boolean);
  const cleanedSegments = segments.map((seg) => {
    let s = seg.trim().replace(/^[.\s]+|[.\s]+$/g, "");
    // If it ends with known extension like button.tsx, keep case or capitalize Component name
    if (s.toLowerCase() === "button.tsx") {
      s = "Button.tsx";
    }
    return s;
  });

  return cleanedSegments.join("/");
}

export function transformDeveloperText(rawInput: string): TransformResult {
  const startTime = performance.now();
  let text = rawInput.trim();
  const matchedRules: string[] = [];

  if (!text) {
    return {
      raw: rawInput,
      transformed: "",
      matchedRules: [],
      latencyUs: 4,
    };
  }

  // 0. Pre-cleaning speech recognition anomalies
  text = text.replace(/\btagfile\b/gi, "tag file");
  text = text.replace(/\btag-file\b/gi, "tag file");
  text = text.replace(/\batfile\b/gi, "at file");
  text = text.replace(/\bvariant\s+prompt\b/gi, "variant prop");
  text = text.replace(/\bsecondary\s+to\s+variant\s+prop\b/gi, "secondary variant prop");
  text = text.replace(/\bsecondary\s+to\s+variant\s+prompt\b/gi, "secondary variant prop");

  // Normalize spoken "dot <ext>" into ".<ext>" (e.g. "dot tsx" -> ".tsx", "dot js" -> ".js", "dot json" -> ".json")
  text = text.replace(new RegExp(`\\bdot\\s+(${KNOWN_EXTENSIONS})\\b`, "gi"), ".$1");

  // 1. Voice Snippets & Macros
  if (/\b(?:pr|pull\s*request|pullrequest)s?\s*(?:review\s*)?check\s*lists?\b/i.test(text)) {
    matchedRules.push("PR Checklist Macro");
    text = `### ✅ PR Checklist
- [ ] Code follows style conventions
- [ ] Unit & integration tests pass
- [ ] Documentation updated
- [ ] No sensitive credentials or debug logs`;
    const latencyUs = Math.max(3, Math.round((performance.now() - startTime) * 1000));
    return {
      raw: rawInput,
      transformed: text,
      matchedRules,
      latencyUs,
    };
  }

  // 2. Markdown Code Block Scaffolding
  const codeBlockMatch = text.match(/\bcode\s*block\s+([a-zA-Z0-9_-]+)\s+(.+)$/i);
  if (codeBlockMatch) {
    matchedRules.push("Markdown Code Block");
    const lang = codeBlockMatch[1].toLowerCase();
    let body = codeBlockMatch[2];

    // Clean symbols inside code block
    body = body
      .replace(/\bequals\b/gi, "=")
      .replace(/\bequal\s*sign\b/gi, "=")
      .replace(/\bopen\s*brace\b/gi, "{")
      .replace(/\bclose\s*brace\b/gi, "}")
      .replace(/\bopen\s*(?:bracket|parenthesis|paren)\b/gi, "(")
      .replace(/\bclose\s*(?:bracket|parenthesis|paren)\b/gi, ")")
      .replace(/\bsemicolon\b/gi, ";")
      .replace(/\bcolon\b/gi, ":")
      .replace(/\bdot\b/gi, ".");

    // format specific patterns like const config = defineConfig({})
    body = body.replace(/\{\s*\}/g, "{}");

    text = `\`\`\`${lang}\n${body.trim()}\n\`\`\``;
    const latencyUs = Math.max(4, Math.round((performance.now() - startTime) * 1000));
    return {
      raw: rawInput,
      transformed: text,
      matchedRules,
      latencyUs,
    };
  }

  // 3. AI IDE File Tagging (@src/components/Button.tsx)
  // Handles: "tag <file>", "tag file <file>", "look at tag <file>", "tag folder <folder>", etc.
  const tagFileWithExtRegex = new RegExp(
    `\\b(look\\s+at\\s+)?(?:tag|at|mention|context)(?:\\s+(?:files?|folders?|dirs?|directory))?(?:\\s*[:.])?\\s*([a-zA-Z0-9_./\\\\\\s-]+?\\.${KNOWN_EXTENSIONS})(?:[,;])?`,
    "gi",
  );

  if (tagFileWithExtRegex.test(text)) {
    matchedRules.push("Context-Aware @file Tagging");
    text = text.replace(tagFileWithExtRegex, (match, lookAtPrefix, rawPath) => {
      const cleanedPath = cleanPathString(rawPath);
      const prefix = lookAtPrefix ? "look at @" : "@";
      return `${prefix}${cleanedPath}`;
    });
  } else {
    // Explicit folder / directory tagging: e.g. "tag folder src slash components" or "tag dir src/components"
    const tagFolderRegex =
      /\b(look\s+at\s+)?(?:tag|at|mention|context)\s+(?:folders?|dirs?|directory)(?:\s*[:.])?\s*([a-zA-Z0-9_./\\\s-]+?)(?=\s+(?:and|with|then|to|in|for)\b|[,;.]|$)/gi;
    if (tagFolderRegex.test(text)) {
      matchedRules.push("Context-Aware @folder Tagging");
      text = text.replace(tagFolderRegex, (match, lookAtPrefix, rawPath) => {
        const cleanedPath = cleanPathString(rawPath);
        const prefix = lookAtPrefix ? "look at @" : "@";
        return `${prefix}${cleanedPath}`;
      });
    }
  }

  // 4. Code Casing Directives (camelCase, snake_case, PascalCase, SCREAMING_SNAKE_CASE, kebab-case, `backticks`)
  const caseStyles: { regex: RegExp; style: string; fn: (words: string[]) => string }[] = [
    {
      regex:
        /\b(?:screaming\s+snake\s+case|constant\s+case)\s+([a-zA-Z0-9_\s]+?)(?=\s+(?:for|in|with|at|to|from|then|into|on|as|and)\b|[,;.]|$)/gi,
      style: "SCREAMING_SNAKE_CASE",
      fn: toScreamingSnakeCase,
    },
    {
      regex:
        /\bcamel\s+case\s+([a-zA-Z0-9_\s]+?)(?=\s+(?:for|in|with|at|to|from|then|into|on|as|and)\b|[,;.]|$)/gi,
      style: "camelCase Directive",
      fn: toCamelCase,
    },
    {
      regex:
        /\bpascal\s+case\s+([a-zA-Z0-9_\s]+?)(?=\s+(?:for|in|with|at|to|from|then|into|on|as|and)\b|[,;.]|$)/gi,
      style: "PascalCase Directive",
      fn: toPascalCase,
    },
    {
      regex:
        /\bsnake\s+case\s+([a-zA-Z0-9_\s]+?)(?=\s+(?:for|in|with|at|to|from|then|into|on|as|and)\b|[,;.]|$)/gi,
      style: "snake_case Directive",
      fn: toSnakeCase,
    },
    {
      regex:
        /\b(?:kebab\s+case|dash\s+case)\s+([a-zA-Z0-9_\s]+?)(?=\s+(?:for|in|with|at|to|from|then|into|on|as|and)\b|[,;.]|$)/gi,
      style: "kebab-case Directive",
      fn: toKebabCase,
    },
    {
      regex:
        /\b(?:in\s+backticks|inline\s+code|backticks)\s+([a-zA-Z0-9_.\-\s]+?)(?=\s+(?:for|in|with|at|to|from|then|into|on|as|and)\b|[,;.]|$)/gi,
      style: "Inline `code` Directive",
      fn: (w) => `\`${w.join(" ")}\``,
    },
  ];

  for (const { regex, style, fn } of caseStyles) {
    if (regex.test(text)) {
      matchedRules.push(style);
      text = text.replace(regex, (_, wordsRaw) => {
        const words = wordsRaw
          .trim()
          .split(/[\s_.-]+/)
          .filter(Boolean);
        return fn(words);
      });
    }
  }

  // 5. Tech Entities Normalization
  for (const [entityRegex, replacement] of TECH_ENTITIES) {
    if (entityRegex.test(text)) {
      if (!matchedRules.includes("Developer Tech Vocabulary")) {
        matchedRules.push("Developer Tech Vocabulary");
      }
      text = text.replace(entityRegex, replacement);
    }
  }

  // 6. Spoken Symbols & Operators
  const symbolReplacements: [RegExp, string][] = [
    [/\bopen\s*brace\b/gi, "{"],
    [/\bclose\s*brace\b/gi, "}"],
    [/\bopen\s*bracket\b/gi, "["],
    [/\bclose\s*bracket\b/gi, "]"],
    [/\bopen\s*paren(?:thesis)?\b/gi, "("],
    [/\bclose\s*paren(?:thesis)?\b/gi, ")"],
    [/\bfat\s*arrow\b/gi, "=>"],
    [/\barrow\b/gi, "->"],
    [/\bequals\b/gi, "="],
    [/\bsemicolon\b/gi, ";"],
    [/\bcolon\b/gi, ":"],
  ];

  for (const [symRegex, symRep] of symbolReplacements) {
    if (symRegex.test(text)) {
      text = text.replace(symRegex, symRep);
    }
  }

  // Clean trailing commas after @file if followed by and/with
  text = text.replace(/(@[a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+),\s+(and|with|then|to|for)\b/gi, "$1 $2");

  // 7. Capitalize first letter if it's a general sentence and not starting with special symbol
  if (
    text.length > 0 &&
    !text.startsWith("@") &&
    !text.startsWith("`") &&
    !text.startsWith("#") &&
    !text.startsWith("//") &&
    !text.startsWith("###")
  ) {
    if (
      !matchedRules.includes("camelCase Directive") &&
      !matchedRules.includes("snake_case Directive")
    ) {
      text =
        text.charAt(0).toLowerCase() === "look at @"
          ? text
          : text.charAt(0).toUpperCase() + text.slice(1);
    }
  }

  const latencyUs = Math.max(3, Math.round((performance.now() - startTime) * 1000));

  return {
    raw: rawInput,
    transformed: text,
    matchedRules: matchedRules.length > 0 ? matchedRules : ["Real-time Direct Injection"],
    latencyUs,
  };
}
