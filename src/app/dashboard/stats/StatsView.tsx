/**
 * SOURCE OF TRUTH KEYWORDS: StatsView, DictationView, WhisperFlowLayout,
 *   HeroBanner, HistoryFeed, VoiceProfileCard, StatsSummary
 * WHAT:  The Dictation & Stats view meticulously redesigned to match Whisper Flow:
 *        - "Welcome back, Alex" header
 *        - Left column:
 *          - High-end dark ambient hero banner ("Make Flow sound like you" with warm lifestyle photo)
 *          - Date-grouped chronological feed ("YESTERDAY", "AUGUST 31, 2026") with search toggle
 *          - Card-based session rows with time, text preview, and quick actions (Play, Copy, Flag, More)
 *        - Right column:
 *          - Hero metrics: 4,543 total words, 78 wpm, 1 day streak
 *          - Voice Profile card with "API Advocate" and colorful sticker mascot illustration
 *        - Collapsible secondary metrics for deep-dive stats
 * WHERE: Rendered by Dashboard.tsx on the "dictation" and "stats" routes.
 */

import { useState, useMemo, useCallback, useRef } from "react";
import { Check, Copy, Play, Trash2, ChevronDown, Search, Flag, MoreVertical } from "lucide-react";
import { commands, type HotkeyBinding, type MetricDef, type SessionSummary } from "@/lib/bindings";
import { useCommand, unwrapCommand } from "@/lib/ipc";
import { formatCompactDuration, formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton, ErrorSurface } from "@/components/global";
import type { DictationMode } from "@/lib/dictation-mode";
import { WpmCalibrationWizard } from "../_components/WpmCalibrationWizard";
import { ActivityChart } from "./_components/ActivityChart";
import { LatencyPanel } from "./_components/LatencyPanel";
import { LanguageBreakdown } from "./_components/LanguageBreakdown";
import { useHistory } from "../history/use-history";
import { NoTranscriptionsYet } from "../_components/NoTranscriptionsYet";

export interface StatsViewProps {
  metrics: readonly MetricDef[];
  hotkey: HotkeyBinding | null;
  mode: DictationMode;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function textOf(session: SessionSummary): string {
  return session.final_text ?? session.raw_text ?? "";
}

function firstLine(session: SessionSummary): string | null {
  const text = session.final_text ?? session.raw_text;
  if (!text) return null;
  const line = text.trim().split("\n", 1)[0];
  return line.length > 0 ? line : null;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatGroupLabel(ms: number): string {
  const now = new Date();
  const d = new Date(ms);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86_400_000;
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (dayStart === today) return "TODAY";
  if (dayStart === yesterday) return "YESTERDAY";
  return d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

interface SessionGroup {
  label: string;
  key: string;
  sessions: SessionSummary[];
}

function groupByDay(sessions: readonly SessionSummary[]): SessionGroup[] {
  const groups: SessionGroup[] = [];
  const seen = new Map<string, SessionGroup>();
  for (const s of sessions) {
    const k = dayKey(s.started_at_ms);
    if (!seen.has(k)) {
      const g: SessionGroup = {
        label: formatGroupLabel(s.started_at_ms),
        key: k,
        sessions: [],
      };
      groups.push(g);
      seen.set(k, g);
    }
    seen.get(k)!.sessions.push(s);
  }
  return groups;
}

// ─── Persona helper ──────────────────────────────────────────────────────────

function personaFrom(totalWords: number): {
  title: string;
  subtitle: string;
} {
  if (totalWords >= 100_000) return { title: "Voice Architect", subtitle: "Top 1% of dictators" };
  if (totalWords >= 25_000) return { title: "Power Dictator", subtitle: "Prolific speaker" };
  if (totalWords >= 5_000) return { title: "API Advocate", subtitle: "Fast, accurate speaker" };
  if (totalWords >= 1_000) return { title: "Daily Driver", subtitle: "Consistent habit" };
  return { title: "API Advocate", subtitle: "Getting started" };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StatsView({ metrics, hotkey, mode }: StatsViewProps) {
  const stats = useCommand(commands.getStats, []);
  const feed = useHistory("");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMoreStats, setShowMoreStats] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback((session: SessionSummary) => {
    const text = textOf(session);
    if (!text) return;
    void unwrapCommand(() => commands.copyText({ text })).then((result) => {
      if (result.status === "ok") {
        setCopiedId(session.id);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopiedId(null), 1500);
      }
    });
  }, []);

  const play = useCallback(
    (session: SessionSummary) => {
      const text = textOf(session);
      if (!text) return;
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      } else {
        copy(session);
      }
    },
    [copy],
  );

  const toggleFlag = useCallback((id: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const remove = useCallback(
    (session: SessionSummary) => {
      void unwrapCommand(() => commands.deleteHistoryEntry({ id: session.id })).then((result) => {
        if (result.status === "ok") {
          feed.forget(session.id);
          stats.reload();
        }
      });
    },
    [feed, stats],
  );

  // Filtered feed groups
  const groups = useMemo(() => {
    const activeItems = feed.items;
    const filtered = searchQuery.trim()
      ? activeItems.filter((s) => textOf(s).toLowerCase().includes(searchQuery.toLowerCase()))
      : activeItems;
    return groupByDay(filtered);
  }, [feed.items, searchQuery]);

  if (stats.error) {
    return (
      <div className="p-8">
        <ErrorSurface error={stats.error} onRetry={stats.reload} />
      </div>
    );
  }

  if (stats.loading && !stats.data) {
    return (
      <div className="flex h-full gap-6 p-8">
        <div className="flex-1">
          <Skeleton rows={8} />
        </div>
        <div className="w-64 shrink-0">
          <Skeleton rows={5} />
        </div>
      </div>
    );
  }

  const data = stats.data;
  const totalWords = data?.total_words ?? 0;
  const speakingWpm = Math.round(data?.speaking_wpm ?? 0);
  const streakDays = data?.current_streak_days ?? 0;
  const persona = personaFrom(totalWords);

  return (
    <>
      {showCalibration && data && (
        <WpmCalibrationWizard
          currentBaselineWpm={data.baseline_typing_wpm ?? 40}
          onClose={() => setShowCalibration(false)}
          onSaved={() => stats.reload()}
        />
      )}

      <div data-scroll-area className="flex h-full min-h-0 flex-col overflow-y-auto px-8 py-6">

        {/* ── Two Column Grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
          {/* ── Left Column: Banner + Feed ─────────────────────────────────── */}
          <div className="flex flex-col min-w-0">
            {/* Hero Banner */}
            <div className="relative mb-8 overflow-hidden rounded-2xl bg-[#0d0c0b] text-white shadow-sm border border-stone-800/80 min-h-[150px] flex items-center justify-between">
              {/* Left Content */}
              <div className="relative z-10 p-6 max-w-md">
                <h2 className="text-[17px] font-medium tracking-tight text-white mb-1">
                  Make HushWrite sound like{" "}
                  <span className="font-serif italic font-normal text-amber-100 text-xl">you</span>
                </h2>
                <p className="text-xs text-stone-400 font-normal mb-4">
                  Set up different writing styles for different apps.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = "settings";
                  }}
                  className="rounded-lg bg-white text-stone-900 font-semibold px-4 py-1.5 text-xs hover:bg-stone-100 transition-all shadow-sm"
                >
                  Start now
                </button>
              </div>

              {/* Right Image with smooth gradient fade */}
              <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden pointer-events-none">
                <img
                  src="/flow_banner_people.jpg"
                  alt="Warm atmosphere"
                  className="h-full w-full object-cover object-center scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0d0c0b] via-[#0d0c0b]/70 to-transparent" />
              </div>
            </div>

            {/* ── Chronological History Feed ───────────────────────────────── */}
            <div className="flex flex-col gap-6">
              {groups.length === 0 ? (
                <div className="rounded-2xl border border-stone-200/70 dark:border-stone-800/80 bg-[#fdfcfb] dark:bg-stone-900/40 p-12 text-center shadow-xs">
                  {searchQuery.trim() ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="h-6 w-6 text-stone-400" />
                      <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                        No transcriptions found matching "{searchQuery}"
                      </p>
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline mt-1 cursor-pointer"
                      >
                        Clear search
                      </button>
                    </div>
                  ) : (
                    <NoTranscriptionsYet hotkey={hotkey} mode={mode} />
                  )}
                </div>
              ) : (
                groups.map((group, groupIdx) => (
                  <section key={group.key} className="flex flex-col">
                    {/* Date Header + Search Button */}
                    <div className="flex items-center justify-between pb-2 px-1">
                      <span className="text-[11px] font-bold tracking-wider text-stone-400 uppercase">
                        {group.label}
                      </span>
                      {groupIdx === 0 && (
                        <div className="flex items-center gap-2">
                          {searchOpen ? (
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Filter text…"
                              autoFocus
                              onBlur={() => !searchQuery && setSearchOpen(false)}
                              className="h-6 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-900 shadow-xs focus:outline-hidden dark:border-stone-800 dark:bg-stone-900 dark:text-white"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSearchOpen(true)}
                              className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                              title="Search Transcripts — Instant keyword filter across all recorded speech"
                            >
                              <Search className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Container for Rows */}
                    <div className="rounded-2xl border border-stone-200/70 dark:border-stone-800/80 bg-[#fdfcfb] dark:bg-stone-900/40 divide-y divide-stone-100 dark:divide-stone-800/60 overflow-hidden shadow-xs">
                      {group.sessions.map((session) => {
                        const line = firstLine(session);
                        const isFlagged = flaggedIds.has(session.id);
                        const isMenuOpen = menuOpenId === session.id;

                        return (
                          <div
                            key={session.id}
                            className="group relative flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-stone-50/70 dark:hover:bg-stone-800/40 min-h-[46px]"
                          >
                            {/* Time Column */}
                            <span className="w-18 shrink-0 text-xs tabular-nums text-stone-400 dark:text-stone-500 font-normal">
                              {formatTime(session.started_at_ms)}
                            </span>

                            {/* Transcript text */}
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-xs font-normal",
                                line
                                  ? "text-stone-800 dark:text-stone-200"
                                  : "text-stone-300 dark:text-stone-600 italic",
                              )}
                            >
                              {line || "No text"}
                            </span>

                            {/* Quick action buttons (revealed on hover) */}
                            <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Play Audio */}
                              <button
                                type="button"
                                onClick={() => play(session)}
                                title="Replay Audio Recording — Listen to the original captured microphone audio"
                                className="rounded p-1 text-stone-400 hover:bg-stone-200/50 hover:text-stone-800 dark:hover:bg-stone-800 dark:hover:text-white transition-colors cursor-pointer"
                              >
                                <Play className="h-3.5 w-3.5" />
                              </button>

                              {/* Copy Text */}
                              <button
                                type="button"
                                onClick={() => copy(session)}
                                title="Copy Transcript (⏎) — Copy formatted text directly to clipboard"
                                className="rounded p-1 text-stone-400 hover:bg-stone-200/50 hover:text-stone-800 dark:hover:bg-stone-800 dark:hover:text-white transition-colors cursor-pointer"
                              >
                                {copiedId === session.id ? (
                                  <Check className="h-3.5 w-3.5 text-teal-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>

                              {/* Flag */}
                              <button
                                type="button"
                                onClick={() => toggleFlag(session.id)}
                                title={
                                  isFlagged
                                    ? "Remove Flag — Unmark this transcription"
                                    : "Flag Transcription — Bookmark for later review"
                                }
                                className={cn(
                                  "rounded p-1 transition-colors cursor-pointer",
                                  isFlagged
                                    ? "text-amber-600 bg-amber-50 dark:bg-amber-950/40"
                                    : "text-stone-400 hover:bg-stone-200/50 hover:text-stone-800 dark:hover:bg-stone-800 dark:hover:text-white",
                                )}
                              >
                                <Flag className="h-3.5 w-3.5" />
                              </button>

                              {/* More Options Menu */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setMenuOpenId(isMenuOpen ? null : session.id)}
                                  title="More Actions — Additional copy and deletion options"
                                  className="rounded p-1 text-stone-400 hover:bg-stone-200/50 hover:text-stone-800 dark:hover:bg-stone-800 dark:hover:text-white transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>

                                {isMenuOpen && (
                                  <div
                                    onMouseLeave={() => setMenuOpenId(null)}
                                    className="absolute right-0 top-7 z-30 w-36 rounded-xl border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-700 dark:bg-[#1c1917]"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        copy(session);
                                        setMenuOpenId(null);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-800"
                                    >
                                      <Copy className="h-3 w-3" />
                                      <span>Copy raw</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        remove(session);
                                        setMenuOpenId(null);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}

              {/* Load More sentinel */}
              {!feed.exhausted && feed.loaded && groups.length > 0 && (
                <button
                  type="button"
                  onClick={feed.loadMore}
                  className="rounded-xl py-2 text-xs font-medium text-stone-400 hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-stone-800 transition-colors"
                >
                  {feed.loading ? "Loading…" : "Load more"}
                </button>
              )}

              {/* ── Collapsible "More stats" ───────────────────────────────── */}
              {data && (
                <div className="mt-4 border-t border-stone-200/60 dark:border-stone-800/60 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowMoreStats((v) => !v)}
                    className="flex w-full items-center justify-between text-xs font-medium text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
                  >
                    <span>Advanced telemetry & latency</span>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", showMoreStats && "rotate-180")}
                    />
                  </button>

                  {showMoreStats && (
                    <div className="mt-4 flex flex-col gap-6">
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          {
                            label: "Total Sessions",
                            value: formatCount(data.total_sessions),
                          },
                          {
                            label: "Time Spoken",
                            value: formatCompactDuration(data.total_speaking_ms),
                          },
                          {
                            label: "This Week",
                            value: `${formatCount(data.sessions_this_week)} sessions`,
                          },
                          {
                            label: "Words This Week",
                            value: formatCount(data.words_this_week),
                          },
                          {
                            label: "Time Saved",
                            value: formatCompactDuration(data.time_saved_ms),
                          },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                              {label}
                            </span>
                            <span className="text-base font-semibold text-stone-900 dark:text-white">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>

                      {data.activity && data.activity.length > 0 && (
                        <ActivityChart days={data.activity} />
                      )}
                      {data.latency && data.latency.length > 0 && (
                        <LatencyPanel metrics={metrics} latency={data.latency} />
                      )}
                      {data.languages && data.languages.length > 0 && (
                        <LanguageBreakdown languages={data.languages} />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Column: Stats & Voice Profile ─────────────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Stats Card */}
            <div className="rounded-2xl bg-[#faf8f5] dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800/60 p-6 flex flex-col gap-4 shadow-xs">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
                  {formatCount(totalWords)}
                </span>
                <span className="text-xs font-medium text-stone-500">total words</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
                  {speakingWpm}
                </span>
                <span className="text-xs font-medium text-stone-500">wpm</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
                  {streakDays}
                </span>
                <span className="text-xs font-medium text-stone-500">day streak</span>
              </div>
            </div>

            {/* Voice Profile Card */}
            <div className="rounded-2xl bg-[#faf8f5] dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800/60 p-5 flex items-center justify-between shadow-xs">
              <div>
                <div className="text-sm font-bold text-stone-900 dark:text-white">
                  Voice Profile
                </div>
                <div className="text-xs text-stone-500 mt-0.5">{persona.title}</div>
              </div>

              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white dark:bg-stone-800 p-0.5 border border-stone-200/40 shadow-xs">
                <img
                  src="/voice_profile_mascot.jpg"
                  alt="Voice profile mascot"
                  className="h-full w-full object-cover rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
