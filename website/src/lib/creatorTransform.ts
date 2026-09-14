/**
 * Live Creator Voice Transformation Engine
 * 100% on-device string transformations matching HushWrite Rust engine (src-tauri/src/adapters/rules/spoken.rs)
 */

export interface CreatorTransformResult {
  raw: string;
  transformed: string;
  matchedRules: string[];
  latencyUs: number;
}

const CREATOR_ENTITIES: [RegExp, string][] = [
  [/\byoutube\b/gi, "YouTube"],
  [/\btiktok\b/gi, "TikTok"],
  [/\binstagram\b/gi, "Instagram"],
  [/\blinkedin\b/gi, "LinkedIn"],
  [/\bsubstack\b/gi, "Substack"],
  [/\bbeehiiv\b/gi, "Beehiiv"],
  [/\bnotion\b/gi, "Notion"],
  [/\bdescript\b/gi, "Descript"],
  [/\bspotify\b/gi, "Spotify"],
  [/\bapple\s*notes\b/gi, "Apple Notes"],
  [/\bapple\s*podcasts?\b/gi, "Apple Podcasts"],
  [/\btypefully\b/gi, "Typefully"],
  [/\bchatgpt\b/gi, "ChatGPT"],
  [/\bclaude\b/gi, "Claude"],
  [/\bperplexity\b/gi, "Perplexity"],
  [/\bmidjourney\b/gi, "Midjourney"],
  [/\belevenlabs\b/gi, "ElevenLabs"],
  [/\bwhisper\s*cpp\b/gi, "whisper.cpp"],
  [/\bdirect\s*ml\b/gi, "DirectML"],
  [/\bhushwrite\b/gi, "HushWrite"],
];

export function transformCreatorText(rawInput: string): CreatorTransformResult {
  const startTime = performance.now();
  let text = rawInput.trim();
  const matchedRules: string[] = [];

  if (!text) {
    return {
      raw: rawInput,
      transformed: "",
      matchedRules: [],
      latencyUs: 3,
    };
  }

  // 1. YouTube Video Script Macro
  const ytMatch = text.match(
    /\b(?:youtube\s*script|video\s*script)(?:\s+template)?(?:\s+(?:title|on|about)\s+(.+))?$/i,
  );
  if (ytMatch || /\b(?:youtube\s*script|video\s*script)\b/i.test(text)) {
    matchedRules.push("YouTube Script Schema");
    const topic =
      ytMatch && ytMatch[1] ? ytMatch[1].trim() : "Why Offline AI is the Future of Productivity";
    text = `### 🎬 YouTube Video Script
**Title Idea:** ${topic}
**Hook (0:00 - 0:30):**

**Intro & Value Proposition:**

**Main Points:**
1. 
2. 
3. 

**Sponsor / Mid-roll CTA:**

**Conclusion & Next Video CTA:**`;
    return {
      raw: rawInput,
      transformed: text,
      matchedRules,
      latencyUs: Math.max(3, Math.round((performance.now() - startTime) * 1000)),
    };
  }

  // 2. 3-Part Content Hook Framework
  const hookMatch = text.match(
    /\b(?:content\s*hook|video\s*hook|viral\s*hook)(?:\s+template)?(?:\s+(?:on|about)\s+(.+))?$/i,
  );
  if (hookMatch || /\b(?:content\s*hook|video\s*hook|viral\s*hook)\b/i.test(text)) {
    matchedRules.push("3-Part Hook Framework");
    const topic = hookMatch && hookMatch[1] ? ` (${hookMatch[1].trim()})` : "";
    text = `### 🪝 Content Hook Framework${topic}
**1. Curiosity Gap / Pattern Interrupt:**

**2. Stakes & Problem Statement:**

**3. Promise & Payoff:**`;
    return {
      raw: rawInput,
      transformed: text,
      matchedRules,
      latencyUs: Math.max(3, Math.round((performance.now() - startTime) * 1000)),
    };
  }

  // 3. Substack / Newsletter Draft
  const substackMatch = text.match(
    /\b(?:substack|newsletter)(?:\s+(?:draft|template))?(?:\s+(?:on|about)\s+(.+))?$/i,
  );
  if (substackMatch || /\b(?:substack|newsletter\s*draft)\b/i.test(text)) {
    matchedRules.push("Long-Form Newsletter Schema");
    const topic = substackMatch && substackMatch[1] ? ` - ${substackMatch[1].trim()}` : "";
    text = `### 💌 Newsletter Draft${topic}
**Subject Line Options:**
1. 
2. 

**Preview Text:**

**Core Essay:**

**Key Takeaways:**
- 

**Recommended Links:**
- `;
    return {
      raw: rawInput,
      transformed: text,
      matchedRules,
      latencyUs: Math.max(3, Math.round((performance.now() - startTime) * 1000)),
    };
  }

  // 4. Social Caption & Hashtags
  const socialMatch = text.match(
    /\b(?:instagram|social|tiktok)\s+caption(?:\s+template)?(?:\s+(?:for|on|about)\s+(.+))?$/i,
  );
  if (socialMatch || /\b(?:social\s*caption|instagram\s*caption)\b/i.test(text)) {
    matchedRules.push("Social Caption & Hashtags");
    const topic = socialMatch && socialMatch[1] ? ` (${socialMatch[1].trim()})` : "";
    text = `### 📱 Social Caption${topic}
**Hook Line:**

**Body / Story:**

**Call to Action:**
👉 

**Hashtags:**
#ContentCreator #Productivity #Setup`;
    return {
      raw: rawInput,
      transformed: text,
      matchedRules,
      latencyUs: Math.max(3, Math.round((performance.now() - startTime) * 1000)),
    };
  }

  // 5. Podcast Episode Outline & Show Notes
  const podcastMatch = text.match(
    /\bpodcast\s+(?:show\s*notes|episode\s*outline|notes|outline)(?:\s+template)?(?:\s+(?:episode|with|on)\s+(.+))?$/i,
  );
  if (podcastMatch || /\bpodcast\s+(?:show\s*notes|episode\s*outline|notes)\b/i.test(text)) {
    matchedRules.push("Podcast Show Notes Schema");
    const extra = podcastMatch && podcastMatch[1] ? podcastMatch[1].trim() : "";
    let epNum = "";
    let guest = "alex";
    let theme = "local intelligence";

    if (extra) {
      const epMatch = extra.match(/(?:episode\s*)?(\d+)/i);
      if (epMatch) epNum = `Episode ${epMatch[1]}`;
      const guestMatch = extra.match(/guest\s+([a-zA-Z0-9_\s]+?)(?:\s+on|\s*$)/i);
      if (guestMatch) guest = guestMatch[1].trim();
      const onMatch = extra.match(/\bon\s+(.+)$/i);
      if (onMatch) theme = onMatch[1].trim();
    }

    text = `### 🎙️ Podcast Episode Outline
**Episode Title:** ${epNum ? epNum + ": " + (theme.charAt(0).toUpperCase() + theme.slice(1)) : ""}
**Guest:** ${guest}
**Core Theme:** ${theme}

**Discussion Questions:**
- 
- 
- 

**Key Timestamps:**
- 00:00 Intro
- 

**Links Mentioned:**
- `;
    return {
      raw: rawInput,
      transformed: text,
      matchedRules,
      latencyUs: Math.max(3, Math.round((performance.now() - startTime) * 1000)),
    };
  }

  // 6. 60s Sponsor Read
  const sponsorMatch = text.match(
    /\b(?:sponsor|ad)\s*read(?:\s+template)?(?:\s+(?:for|about)\s+(.+))?$/i,
  );
  if (sponsorMatch || /\b(?:sponsor\s*read|ad\s*read)\b/i.test(text)) {
    matchedRules.push("60s Sponsor Read Framework");
    const partner = sponsorMatch && sponsorMatch[1] ? ` (${sponsorMatch[1].trim()})` : "";
    text = `### 📢 Sponsor Read (60s)${partner}
**Organic Transition:**

**Product Problem & Solution:**

**Personal Experience:**

**Offer & Discount Code:**

**Call to Action URL:**`;
    return {
      raw: rawInput,
      transformed: text,
      matchedRules,
      latencyUs: Math.max(3, Math.round((performance.now() - startTime) * 1000)),
    };
  }

  // 7. LinkedIn Thought Leadership Post
  const linkedinMatch = text.match(
    /\blinkedin\s+(?:post|update|thought\s*leadership)(?:\s+template)?(?:\s+(?:on|about)\s+(.+))?$/i,
  );
  if (linkedinMatch || /\blinkedin\s*(?:post|update)\b/i.test(text)) {
    matchedRules.push("LinkedIn Thought Leadership Schema");
    const hook =
      linkedinMatch && linkedinMatch[1]
        ? linkedinMatch[1].trim()
        : "Why we stopped streaming microphone audio to cloud servers";
    text = `### 💼 LinkedIn Post
**Hook:** ${hook.charAt(0).toUpperCase() + hook.slice(1)}

**The Problem / Insight:**
Cloud voice AI tools require your data to leave your machine. When engineers and founders dictate proprietary codebase secrets, auth tokens, or unreleased strategy into remote cloud endpoints, privacy evaporates.

**Key Lessons / Framework:**
• Local inference with DirectML and Metal runs at sub-150ms latency
• Zero outbound bytes means zero compliance or NDA headaches
• Open-weights Whisper models match cloud accuracy on modern laptops

**Takeaway & Question:**
👉 Have you audited which third-party cloud servers receive your voice recordings during dictation?

#Tech #Productivity #Engineering #OpenSource #Privacy`;
    return {
      raw: rawInput,
      transformed: text,
      matchedRules,
      latencyUs: Math.max(3, Math.round((performance.now() - startTime) * 1000)),
    };
  }

  // 8. X (Twitter) Thread
  const xThreadMatch = text.match(
    /\b(?:x|twitter)\s+(?:thread|post)(?:\s+template)?(?:\s+(?:on|about|breakdown\s+of)\s+(.+))?$/i,
  );
  if (xThreadMatch || /\b(?:x\s*thread|twitter\s*thread)\b/i.test(text)) {
    matchedRules.push("X (Twitter) Thread Breakdown");
    const topic =
      xThreadMatch && xThreadMatch[1]
        ? xThreadMatch[1].trim()
        : "our local DirectML Whisper benchmarks";
    text = `### 🧵 X (Twitter) Thread
**1/ 🧵 [Hook & Big Promise]:**
We benchmarked local whisper.cpp against cloud speech APIs on ${topic}.
The results shocked us: on-device was 3.2x faster with 0 bytes sent.
Here is the full technical breakdown: 👇

**2/ [The Context & Pain]:**
Cloud dictation incurs WebSocket handshake delay + server queuing + roundtrip network overhead (~450ms tail latency).

**3/ [The Solution / Core Breakthrough]:**
By compiling Whisper with DirectML and FP16 weights, the GPU executes inference right in VRAM in <120ms.

**4/ [Detailed Breakdown]:**
• Realtime factor: 0.08x on mid-range laptops
• Memory consumption: <380 MB RAM
• Network egress: Absolute 0.00 KB verified by Wireshark

**5/ [Conclusion & Bookmark CTA]:**
If you build software or write online:
1. Follow for more local AI architectures
2. Repost the first post to share with other builders 🔄`;
    return {
      raw: rawInput,
      transformed: text,
      matchedRules,
      latencyUs: Math.max(3, Math.round((performance.now() - startTime) * 1000)),
    };
  }

  // 9. Spoken Commands for Threads & Bullets
  text = text
    .replace(/\b(?:tweet\s*break|next\s*tweet|thread\s*break)\b/gi, "\n\n🧵 ")
    .replace(/\b(?:bullet\s*point|next\s*bullet)\b/gi, "\n• ")
    .replace(/\bnew\s*paragraph\b/gi, "\n\n")
    .replace(/\bnew\s*line\b/gi, "\n");

  // 10. Entity normalization
  for (const [re, rep] of CREATOR_ENTITIES) {
    if (re.test(text)) {
      matchedRules.push("Creator Brand Entities");
      text = text.replace(re, rep);
    }
  }

  // Capitalize general sentence
  if (text.length > 0 && !text.startsWith("#") && !text.startsWith("•") && !text.startsWith("🧵")) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  const latencyUs = Math.max(3, Math.round((performance.now() - startTime) * 1000));

  return {
    raw: rawInput,
    transformed: text,
    matchedRules: matchedRules.length > 0 ? matchedRules : ["Real-time Direct Injection"],
    latencyUs,
  };
}
