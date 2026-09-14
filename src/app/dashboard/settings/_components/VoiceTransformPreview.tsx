/**
 * SOURCE OF TRUTH KEYWORDS: VoiceTransformPreview, testVoiceTransform,
 *   Smart Cleanup Playground
 * WHAT:  Interactive voice transformation tester and on-device LLM hardware benchmark.
 * WHY:   Gives users immediate visual feedback on how natural spoken commands
 *        ("Hey HushWrite, make that formal", "bullet points", "make that concise")
 *        are rewritten and formatted by the on-device GGUF LLM.
 * WHERE: Settings > Output & Typing > Smart Cleanup & Voice Transforms.
 */

import { useState, useEffect } from "react";
import { Sparkles, Play, Cpu, CheckCircle2 } from "lucide-react";
import { commands, type HardwareProfile } from "@/lib/bindings";
import { unwrapCommand } from "@/lib/ipc";
import { cn } from "@/lib/utils";

const SAMPLE_TRANSFORMS = [
  {
    label: "Formal Executive",
    input:
      "We gotta ship the release by Friday or the client is gonna be mad hey HushWrite make that formal",
  },
  {
    label: "Bulleted List",
    input: "Review PRs. Run integration test suite. Merge to main branch make that a bulleted list",
  },
  {
    label: "Concise Summary",
    input:
      "In order to ensure that we are ready at this point in time, we should sync make this concise",
  },
  {
    label: "Filler Removal",
    input: "Um so like I was thinking you know we could maybe deploy today",
  },
];

export function VoiceTransformPreview() {
  const [testInput, setTestInput] = useState(SAMPLE_TRANSFORMS[0].input);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hardware, setHardware] = useState<HardwareProfile | null>(null);

  useEffect(() => {
    void unwrapCommand(() => commands.getHardwareProfile()).then((res) => {
      if (res.status === "ok") {
        setHardware(res.data);
      }
    });
  }, []);

  const runTransform = async (text: string) => {
    setIsRunning(true);
    try {
      const res = await unwrapCommand(() =>
        commands.testVoiceTransform({
          text,
          instruction: null,
        }),
      );
      if (res.status === "ok") {
        setTestOutput(res.data);
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-transparent to-purple-500/10 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-900 dark:text-white">
              Local Smart Cleanup & Voice Transforms Playground
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Powered by on-device GGUF models (Qwen 2.5 1.5B & Phi-3.5 Mini) via llama-cpp-2.
            </p>
          </div>
        </div>

        {hardware && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-stone-200/80 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-stone-700 dark:border-stone-800 dark:bg-stone-900/80 dark:text-stone-300 shadow-2xs">
            <Cpu className="size-3.5 text-purple-500" />
            <span>
              {hardware.has_dedicated_gpu ? "GPU Tier: " : "CPU Laptop Tier: "}
              <strong className="text-purple-600 dark:text-purple-400">
                {hardware.recommended_quantization}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Preset Quick Test Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500 mr-1">
          Try preset:
        </span>
        {SAMPLE_TRANSFORMS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setTestInput(preset.input);
              void runTransform(preset.input);
            }}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all cursor-pointer",
              testInput === preset.input
                ? "border-purple-500/40 bg-purple-500/15 text-purple-700 dark:text-purple-300 font-semibold"
                : "border-stone-200/70 bg-white/70 text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-400",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Input / Output Interactive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
            Dictated Input (with spoken transform)
          </label>
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            rows={3}
            placeholder="Type or dictate text with 'Hey HushWrite, make that formal'..."
            className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-stone-800 dark:bg-stone-900 dark:text-white"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            Transformed Output (Pasted to Cursor)
          </label>
          <div className="min-h-[74px] rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 text-xs font-mono text-stone-900 dark:text-stone-100 whitespace-pre-wrap flex items-center">
            {isRunning ? (
              <span className="text-stone-400 italic">Processing on-device LLM pass...</span>
            ) : testOutput ? (
              testOutput
            ) : (
              <span className="text-stone-400 italic">Click Run Transform to preview...</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void runTransform(testInput)}
          disabled={isRunning || !testInput.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
        >
          <Play className="size-3 fill-current" />
          <span>{isRunning ? "Transforming..." : "Run Transform Preview"}</span>
        </button>
      </div>
    </div>
  );
}
