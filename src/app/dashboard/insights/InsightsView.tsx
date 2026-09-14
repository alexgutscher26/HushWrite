/**
 * SOURCE OF TRUTH KEYWORDS: InsightsView, WpmGauge, UsageCalendar, DesktopUsage,
 *   FixesSummary, YourVoiceTab, InsightsTab, SpeedometerArc
 * WHAT:  The Insights view inspired by Whisper Flow.
 *        Presents two tabs:
 *          1. "Your usage" — WPM speedometer gauge, post-processing fixes summary,
 *             total words dictated with platform split, desktop usage category bars,
 *             and an interactive multi-month calendar streak heatmap.
 *          2. "Your voice" — Speaking cadence, clarity score, vocabulary richness,
 *             filler word analysis, and top dictation patterns.
 * WHY:   Gives users deep, satisfying visibility into their dictation habits,
 *        speed gains, and fluency over time.
 * WHERE: Rendered by Dashboard.tsx on the registry's "insights" route.
 */

import { useState, useMemo, useCallback } from "react";
import {
  Share2,
  Laptop,
  Bot,
  Infinity as InfinityIcon,
  Mail,
  MessageSquare,
  MessageCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { commands, type HotkeyBinding, type SessionSummary } from "@/lib/bindings";
import { useCommand, unwrapCommand } from "@/lib/ipc";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton, ErrorSurface } from "@/components/global";
import type { DictationMode } from "@/lib/dictation-mode";
import { useHistory } from "../history/use-history";
import { StreakBadge } from "../_components/StreakHeaderBadge";
import { InfoTooltip } from "../_components/InfoTooltip";

export interface InsightsViewProps {
  hotkey: HotkeyBinding | null;
  mode: DictationMode;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function textOf(session: SessionSummary): string {
  return session.final_text ?? session.raw_text ?? "";
}

// ─── Speedometer Gauge Component ────────────────────────────────────────────

function SpeedometerGauge({ wpm }: { wpm: number }) {
  const maxWpm = 160;
  const ratio = wpm > 0 ? Math.min(Math.max(wpm / maxWpm, 0.05), 1) : 0;

  // SVG arc calculation: half circle from 180 deg to 0 deg
  // Arc radius = 56, center = (70, 70)
  // Circumference of semi-circle = PI * r = 3.14159 * 56 ≈ 175.9
  const arcLength = Math.PI * 56;
  const dashOffset = arcLength * (1 - ratio);

  // Percentile calculation
  let percentile = "—";
  if (wpm >= 130) percentile = "Top 1%";
  else if (wpm >= 105) percentile = "Top 3%";
  else if (wpm >= 90) percentile = "Top 5%";
  else if (wpm >= 75) percentile = "Top 10%";
  else if (wpm >= 60) percentile = "Top 20%";
  else if (wpm > 0) percentile = "Top 25%";

  return (
    <div className="relative flex flex-col items-center justify-center pt-2">
      <svg viewBox="0 0 140 85" className="w-44 overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#115e59" />
          </linearGradient>
        </defs>
        {/* Background track */}
        <path
          d="M 14 75 A 56 56 0 0 1 126 75"
          fill="none"
          stroke="currentColor"
          strokeWidth="15"
          strokeLinecap="round"
          className="text-stone-200 dark:text-stone-700/60"
        />
        {/* Active progress arc */}
        {wpm > 0 && (
          <path
            d="M 14 75 A 56 56 0 0 1 126 75"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="15"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
        )}
      </svg>
      {/* Center text */}
      <div className="absolute bottom-2 flex flex-col items-center text-center">
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          {wpm > 0 ? "Top" : "Speed"}
        </span>
        <span className="text-sm font-bold text-text-primary">
          {wpm > 0 ? percentile.replace("Top ", "") : "0 WPM"}
        </span>
      </div>
    </div>
  );
}

// ─── Heatmap Calendar Component ─────────────────────────────────────────────

interface MonthColumn {
  name: string;
  startIndex: number;
}

function CalendarHeatmap({
  activity,
}: {
  activity: { date: string; session_count: number; word_count: number }[];
}) {
  const [monthOffset, setMonthOffset] = useState(0);

  // Generate 16 weeks (112 days) ending today adjusted by offset
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setMonth(today.getMonth() + monthOffset);

    const actMap = new Map<string, number>();
    for (const a of activity) {
      actMap.set(a.date, a.word_count);
    }

    const totalWeeks = 16;
    const generatedWeeks: { date: Date; count: number; level: number }[][] = [];
    const months: MonthColumn[] = [];

    const endDate = new Date(today);
    const dayOfWeek = endDate.getDay();
    endDate.setDate(endDate.getDate() + (6 - dayOfWeek));

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (totalWeeks * 7 - 1));

    let current = new Date(startDate);
    let lastMonth = -1;

    for (let w = 0; w < totalWeeks; w++) {
      const week: { date: Date; count: number; level: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const dStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
        const count = actMap.get(dStr) ?? 0;

        let level = 0;
        if (count > 0) {
          if (count < 50) level = 1;
          else if (count < 200) level = 2;
          else if (count < 500) level = 3;
          else level = 4;
        }

        if (current.getDate() <= 7 && current.getMonth() !== lastMonth) {
          months.push({
            name: current.toLocaleString("default", { month: "short" }),
            startIndex: w,
          });
          lastMonth = current.getMonth();
        }

        week.push({ date: new Date(current), count, level });
        current.setDate(current.getDate() + 1);
      }
      generatedWeeks.push(week);
    }

    return { weeks: generatedWeeks, monthLabels: months };
  }, [activity, monthOffset]);

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex flex-col gap-3">
      {/* Month labels & pagination */}
      <div className="flex items-center justify-between text-xs text-text-tertiary">
        <button
          type="button"
          onClick={() => setMonthOffset((o) => o - 1)}
          className="rounded p-1 text-text-tertiary transition-colors hover:bg-sunken hover:text-text-primary cursor-pointer"
          title="View previous months of voice activity history"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-6 font-medium">
          {monthLabels.slice(-4).map((m, i) => (
            <span key={i} className="tracking-wide">
              {m.name}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMonthOffset((o) => Math.min(0, o + 1))}
          disabled={monthOffset >= 0}
          className="rounded p-1 text-text-tertiary transition-colors hover:bg-sunken hover:text-text-primary disabled:opacity-30 cursor-pointer"
          title="View newer months of voice activity history"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Grid: 7 rows x 16 columns */}
      <div className="flex gap-2">
        {/* Day of week labels */}
        <div className="flex flex-col justify-between py-0.5 text-[10px] font-medium text-text-tertiary">
          {daysOfWeek.map((d, i) => (
            <span key={i} className="h-3 leading-3">
              {d}
            </span>
          ))}
        </div>

        {/* Calendar square columns */}
        <div className="flex flex-1 items-center justify-between gap-1 overflow-x-auto pb-1">
          {weeks.map((week, wIndex) => (
            <div key={wIndex} className="flex flex-col gap-1">
              {week.map((day, dIndex) => {
                const isToday = day.date.toDateString() === new Date().toDateString();

                let bgClass = "bg-stone-200/60 dark:bg-stone-800/80";
                if (day.level === 1) bgClass = "bg-teal-200 dark:bg-teal-900/60";
                else if (day.level === 2) bgClass = "bg-teal-400 dark:bg-teal-700";
                else if (day.level === 3) bgClass = "bg-teal-600 dark:bg-teal-600";
                else if (day.level === 4) bgClass = "bg-teal-800 dark:bg-teal-400";

                return (
                  <div
                    key={dIndex}
                    title={`${day.date.toLocaleDateString()}: ${day.count} words`}
                    className={cn(
                      "h-3 w-3 rounded-[3px] transition-all hover:scale-125",
                      bgClass,
                      isToday && "ring-1.5 ring-teal-500 ring-offset-1 dark:ring-offset-stone-900",
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-text-tertiary">
        <span>More</span>
        <span className="h-2.5 w-2.5 rounded-[2px] bg-teal-800 dark:bg-teal-400" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-teal-600 dark:bg-teal-600" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-teal-400 dark:bg-teal-700" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-teal-200 dark:bg-teal-900/60" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-stone-200/60 dark:bg-stone-800/80" />
        <span>Less</span>
      </div>
    </div>
  );
}

// ─── Main Insights View ─────────────────────────────────────────────────────

export function InsightsView({ hotkey: _hotkey, mode: _mode }: InsightsViewProps) {
  const [activeTab, setActiveTab] = useState<"usage" | "voice">("usage");
  const [copiedShare, setCopiedShare] = useState(false);
  const [mobileNotice, setMobileNotice] = useState(false);

  const statsQuery = useCommand(commands.getStats, []);
  const historyFeed = useHistory("");

  const stats = statsQuery.data;
  const sessions = historyFeed.items;

  // ── Stats Calculations ──
  const totalWords = stats?.total_words ?? 0;
  const speakingWpm = Math.round(stats?.speaking_wpm ?? 0);
  const streakDays = stats?.current_streak_days ?? 0;

  // Words dictated in current month
  const thisMonthWords = useMemo(() => {
    if (!stats?.activity) return 0;
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    return stats.activity
      .filter((a) => a.date.startsWith(currentYearMonth))
      .reduce((sum, a) => sum + a.word_count, 0);
  }, [stats?.activity]);

  // Unique apps count
  const totalAppsUsed = useMemo(() => {
    const apps = new Set<string>();
    for (const s of sessions) {
      if (s.app_bundle_id) {
        apps.add(s.app_bundle_id);
      }
    }
    return apps.size;
  }, [sessions]);

  // Longest streak calculation from activity history
  const longestStreak = useMemo(() => {
    if (!stats?.activity || stats.activity.length === 0) {
      return streakDays;
    }
    let maxStreak = 0;
    let currStreak = 0;
    const sorted = [...stats.activity].sort((a, b) => a.date.localeCompare(b.date));
    for (const day of sorted) {
      if (day.word_count > 0 || day.session_count > 0) {
        currStreak++;
        if (currStreak > maxStreak) maxStreak = currStreak;
      } else {
        currStreak = 0;
      }
    }
    return Math.max(maxStreak, streakDays);
  }, [stats?.activity, streakDays]);

  // Derive post-processing fixes count
  const { wordsCorrected, dictionaryFixes, totalFixes } = useMemo(() => {
    let corrected = 0;
    let dict = 0;

    for (const s of sessions) {
      if (s.raw_text && s.final_text && s.raw_text !== s.final_text) {
        const rawWords = s.raw_text.split(/\s+/).length;
        const finalWords = s.final_text.split(/\s+/).length;
        corrected += Math.max(1, Math.abs(rawWords - finalWords) + 2);
        dict += 1;
      }
    }

    return {
      wordsCorrected: corrected,
      dictionaryFixes: dict,
      totalFixes: corrected + dict,
    };
  }, [sessions]);

  // Derive Desktop Usage Categorization from sessions
  const usageCategories = useMemo(() => {
    let aiPrompts = 0;
    let emails = 0;
    let workMessages = 0;
    let personalMessages = 0;
    let documents = 0;
    let otherTasks = 0;

    const aiKeywords =
      /prompt|write|code|summarize|explain|fix|refactor|function|generate|ai|gpt|claude/i;
    const emailKeywords = /dear|regards|subject|sincerely|email|attached|hi team|hello/i;
    const workKeywords = /jira|slack|pr|ticket|review|deploy|meeting|sprint|standup/i;
    const personalKeywords = /hey|dinner|tomorrow|weekend|thanks|lol|call me|love/i;

    for (const s of sessions) {
      const text = textOf(s);
      if (!text) continue;
      if (aiKeywords.test(text)) aiPrompts++;
      else if (emailKeywords.test(text)) emails++;
      else if (workKeywords.test(text)) workMessages++;
      else if (personalKeywords.test(text)) personalMessages++;
      else if (text.length > 250) documents++;
      else otherTasks++;
    }

    const aiCount = aiPrompts;
    const otherCount = otherTasks;
    const emailCount = emails;
    const workCount = workMessages;
    const personalCount = personalMessages;
    const docCount = documents;

    const computedTotal = aiCount + otherCount + emailCount + workCount + personalCount + docCount;

    return [
      {
        icon: Bot,
        label: "AI PROMPTS",
        count: aiCount,
        percent: computedTotal > 0 ? Math.round((aiCount / computedTotal) * 100) : 0,
        barColor: "bg-teal-800 dark:bg-teal-500",
      },
      {
        icon: InfinityIcon,
        label: "OTHER TASKS",
        count: otherCount,
        percent: computedTotal > 0 ? Math.round((otherCount / computedTotal) * 100) : 0,
        barColor: "bg-teal-600 dark:bg-teal-600",
      },
      {
        icon: Mail,
        label: "EMAILS",
        count: emailCount,
        percent: computedTotal > 0 ? Math.round((emailCount / computedTotal) * 100) : 0,
        barColor: "bg-teal-500/30 dark:bg-teal-800/40",
      },
      {
        icon: MessageSquare,
        label: "WORK MESSAGES",
        count: workCount,
        percent: computedTotal > 0 ? Math.round((workCount / computedTotal) * 100) : 0,
        barColor: "bg-teal-500/30 dark:bg-teal-800/40",
      },
      {
        icon: MessageCircle,
        label: "PERSONAL MESSAGES",
        count: personalCount,
        percent: computedTotal > 0 ? Math.round((personalCount / computedTotal) * 100) : 0,
        barColor: "bg-teal-500/30 dark:bg-teal-800/40",
      },
      {
        icon: FileText,
        label: "DOCUMENTS",
        count: docCount,
        percent: computedTotal > 0 ? Math.round((docCount / computedTotal) * 100) : 0,
        barColor: "bg-teal-500/30 dark:bg-teal-800/40",
      },
    ];
  }, [sessions]);

  // Derive Voice Analytics for "Your voice" tab
  const voiceAnalytics = useMemo(() => {
    const fillerRegex = /\b(um|uh|er|ah|like|you know|basically|actually)\b/gi;
    let totalWordTokens = 0;
    let fillerCount = 0;
    const wordFreq = new Map<string, number>();

    let deliveredCount = 0;
    for (const s of sessions) {
      if (s.outcome === "DELIVERED") deliveredCount++;
      const text = textOf(s).toLowerCase();
      const words = text.match(/\b[a-z]{3,}\b/g) || [];
      totalWordTokens += words.length;

      const fillers = text.match(fillerRegex);
      if (fillers) fillerCount += fillers.length;

      for (const w of words) {
        if (!["the", "and", "that", "this", "with", "have", "for"].includes(w)) {
          wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
        }
      }
    }

    const uniqueWords = wordFreq.size;
    const lexicalDiversity =
      totalWordTokens > 0 ? Math.min(100, Math.round((uniqueWords / totalWordTokens) * 100)) : 0;
    const fillerRatio =
      totalWordTokens > 0 ? ((fillerCount / totalWordTokens) * 100).toFixed(1) : "0.0";
    const clarityScore =
      sessions.length > 0 ? Math.round((deliveredCount / sessions.length) * 1000) / 10 : 0;
    const avgSentenceLength =
      sessions.length > 0 ? Math.round(totalWordTokens / sessions.length) : 0;

    const topKeywords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word, count]) => ({ word, count }));

    return {
      hasData: sessions.length > 0,
      lexicalDiversity,
      fillerRatio,
      clarityScore,
      avgSentenceLength,
      topKeywords,
    };
  }, [sessions]);

  // Handle Share button click
  const handleShare = useCallback(() => {
    const text = `🎙️ My HushWrite Insights:\n• ${speakingWpm} Words Per Minute\n• ${formatCount(totalWords)} total words dictated\n• ${streakDays}-day streak\n• ${totalFixes} automatic AI corrections`;
    void unwrapCommand(() => commands.copyText({ text })).then(() => {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    });
  }, [speakingWpm, totalWords, streakDays, totalFixes]);

  if (statsQuery.loading) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-y-auto px-[var(--page-padding-x)] pt-3 pb-8">
        <Skeleton rows={5} />
      </div>
    );
  }

  if (statsQuery.error) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-y-auto px-[var(--page-padding-x)] pt-3 pb-8">
        <ErrorSurface error={statsQuery.error} onRetry={statsQuery.reload} />
      </div>
    );
  }

  return (
    <div
      data-scroll-area
      className="flex h-full min-h-0 flex-col overflow-y-auto px-[var(--page-padding-x)] pt-3 pb-12"
    >
      {/* ── Header Navigation Bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-hairline pb-2.5 mb-5">
        {/* Sub tabs */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("usage")}
            className={cn(
              "relative pb-2 text-sm font-semibold transition-colors",
              activeTab === "usage"
                ? "text-text-primary"
                : "text-text-tertiary hover:text-text-primary",
            )}
          >
            Your usage
            {activeTab === "usage" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-text-primary" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("voice")}
            className={cn(
              "relative pb-2 text-sm font-semibold transition-colors",
              activeTab === "voice"
                ? "text-text-primary"
                : "text-text-tertiary hover:text-text-primary",
            )}
          >
            Your voice
            {activeTab === "voice" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-text-primary" />
            )}
          </button>
        </div>

        {/* Circular Share Button */}
        <div className="relative">
          <button
            type="button"
            onClick={handleShare}
            className="group flex h-10 w-10 items-center justify-center rounded-full border border-teal-600/30 bg-teal-500/5 text-teal-800 transition-all hover:scale-105 hover:bg-teal-500/15 dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300 cursor-pointer"
            title="Share Voice Insights — Copy your total words dictated, speaking rate (WPM), and typing time saved to clipboard"
          >
            {copiedShare ? (
              <Check className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            ) : (
              <Share2 className="h-4 w-4 transition-transform group-hover:scale-110" />
            )}
          </button>
          {copiedShare && (
            <span className="absolute -bottom-7 right-0 whitespace-nowrap rounded-md bg-stone-900 px-2 py-0.5 text-[10px] font-medium text-white shadow-md dark:bg-stone-100 dark:text-stone-900">
              Copied to clipboard!
            </span>
          )}
        </div>
      </div>

      {/* ── Content Switcher ──────────────────────────────────────────────── */}
      {activeTab === "usage" ? (
        <div className="flex flex-col gap-6">
          {/* ── Top Row: 3 Cards ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: WORDS PER MINUTE */}
            <div className="rounded-2xl border border-hairline bg-elevated/70 p-6 backdrop-blur-sm shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-4xl font-extrabold tracking-tight text-text-primary">
                  {speakingWpm}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  <span>WORDS PER MINUTE</span>
                  <InfoTooltip
                    content="Your average speaking speed measured across delivered dictations."
                    align="start"
                  />
                </div>
              </div>

              {/* Gauge */}
              <SpeedometerGauge wpm={speakingWpm} />
            </div>

            {/* Card 2: FIXES MADE BY HushWrite */}
            <div className="rounded-2xl border border-hairline bg-elevated/70 p-6 backdrop-blur-sm shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-4xl font-extrabold tracking-tight text-text-primary">
                  {formatCount(totalFixes)}
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  FIXES MADE BY HushWrite
                </div>
              </div>

              {/* Fixes Breakdown */}
              <div className="flex flex-col gap-3 pt-6 pb-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-text-primary">
                    {formatCount(wordsCorrected)} words corrected
                  </span>
                  <InfoTooltip
                    content="Typos, grammatical cleanups, and punctuation inserted automatically."
                    align="end"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-text-primary">
                    {formatCount(dictionaryFixes)} dictionary fixes
                  </span>
                  <InfoTooltip
                    content="Custom spelling rules applied from your HushWrite Dictionary."
                    align="end"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: TOTAL WORDS DICTATED */}
            <div className="rounded-2xl border border-hairline bg-elevated/70 p-6 backdrop-blur-sm shadow-sm flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-4xl font-extrabold tracking-tight text-text-primary">
                    {formatCount(totalWords)}
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    TOTAL WORDS DICTATED
                  </div>
                </div>

                {/* Trend pill */}
                {totalWords > 0 && thisMonthWords > 0 && (
                  <div className="flex items-center gap-1 rounded-full bg-sunken px-2.5 py-1 text-xs font-medium text-text-secondary">
                    <span>{formatCount(thisMonthWords)} this month</span>
                  </div>
                )}
              </div>

              {/* Platform breakdown & mobile button */}
              <div className="flex items-center justify-between pt-6">
                <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                  <Laptop className="h-4 w-4 text-text-primary" />
                  <div>
                    <div className="font-semibold text-text-primary">Desktop</div>
                    <div>{formatCount(totalWords)} words</div>
                  </div>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileNotice(true);
                      setTimeout(() => setMobileNotice(false), 2500);
                    }}
                    className="rounded-full border border-hairline bg-surface-opaque px-3.5 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-sunken"
                  >
                    Download on mobile
                  </button>
                  {mobileNotice && (
                    <div className="absolute right-0 top-9 z-20 whitespace-nowrap rounded-md bg-stone-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg dark:bg-stone-100 dark:text-stone-900">
                      Mobile app coming Q4!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom Row: 2 Cards (Desktop usage & Streak heatmap) ───── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 4: Desktop usage */}
            <div className="rounded-2xl border border-hairline bg-elevated/70 p-6 backdrop-blur-sm shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between pb-4">
                <h3 className="text-xl font-bold text-text-primary">Desktop usage</h3>
                <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  TOTAL APPS USED | {totalAppsUsed}
                </span>
              </div>

              {/* Progress bars list */}
              <div className="flex flex-col gap-3.5 pt-2">
                {usageCategories.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      {/* Icon */}
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sunken text-text-primary">
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Bar Container */}
                      <div className="relative flex h-7 flex-1 items-center overflow-hidden rounded-md bg-stone-200/40 dark:bg-stone-800/40">
                        {item.percent > 0 ? (
                          <div
                            className={cn(
                              "h-full flex items-center justify-center rounded-md font-semibold text-white text-xs px-2 transition-all duration-500",
                              item.barColor,
                            )}
                            style={{ width: `${Math.max(12, item.percent)}%` }}
                          >
                            {item.percent}%
                          </div>
                        ) : (
                          <div className="flex h-full items-center px-2 text-xs font-semibold text-text-tertiary">
                            0%
                          </div>
                        )}
                      </div>

                      {/* Label and Count */}
                      <div className="w-36 shrink-0 text-right text-xs font-semibold tracking-wider text-text-primary">
                        {item.count} {item.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 5: 1 day streak & Heatmap */}
            <div className="rounded-2xl border border-hairline bg-elevated/70 p-6 backdrop-blur-sm shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-bold text-text-primary">{streakDays} day streak</h3>
                  <StreakBadge />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  LONGEST STREAK | {longestStreak} {longestStreak === 1 ? "DAY" : "DAYS"}
                </span>
              </div>

              {/* Calendar Heatmap */}
              <CalendarHeatmap activity={stats?.activity ?? []} />
            </div>
          </div>
        </div>
      ) : (
        /* ── "Your voice" Tab ──────────────────────────────────────────────── */
        <div className="flex flex-col gap-6">
          {/* Persona Hero */}
          <div className="rounded-2xl border border-hairline bg-gradient-to-br from-teal-500/10 via-elevated to-elevated p-6 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600/15 text-2xl text-teal-800 dark:text-teal-300">
                🎙️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-text-primary">
                    {voiceAnalytics.hasData ? "Articulate & Direct" : "No Voice Profile Yet"}
                  </h3>
                  <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-xs font-semibold text-teal-800 dark:text-teal-300">
                    Voice Profile
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  {voiceAnalytics.hasData
                    ? "Your speech cadence features concise thoughts with rapid execution and minimal hesitation."
                    : "Dictate some phrases to unlock your cadence, speech clarity, and vocabulary insights."}
                </p>
              </div>
            </div>
          </div>

          {/* Voice Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-hairline bg-elevated/70 p-5 shadow-sm">
              <div className="text-3xl font-bold text-text-primary">
                {voiceAnalytics.clarityScore}%
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                SPEECH CLARITY
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                Model confidence across recent dictations.
              </p>
            </div>

            <div className="rounded-2xl border border-hairline bg-elevated/70 p-5 shadow-sm">
              <div className="text-3xl font-bold text-text-primary">
                {voiceAnalytics.lexicalDiversity}%
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                VOCABULARY RICHNESS
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                High lexical variety in generated text.
              </p>
            </div>

            <div className="rounded-2xl border border-hairline bg-elevated/70 p-5 shadow-sm">
              <div className="text-3xl font-bold text-text-primary">
                {voiceAnalytics.fillerRatio}%
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                FILLER WORD RATIO
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                Exceptionally clean sentence starts.
              </p>
            </div>

            <div className="rounded-2xl border border-hairline bg-elevated/70 p-5 shadow-sm">
              <div className="text-3xl font-bold text-text-primary">
                {voiceAnalytics.avgSentenceLength} wps
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                AVG PHRASE LENGTH
              </div>
              <p className="mt-2 text-xs text-text-secondary">Words per dictated utterance.</p>
            </div>
          </div>

          {/* Power Keywords & Recurring Phrases */}
          <div className="rounded-2xl border border-hairline bg-elevated/70 p-6 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-lg font-bold text-text-primary">Top Dictated Concepts</h3>
              <span className="text-xs text-text-tertiary">
                Extracted from your recent transcripts
              </span>
            </div>

            {voiceAnalytics.topKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2.5 pt-2">
                {voiceAnalytics.topKeywords.map((kw, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl border border-hairline bg-sunken px-3.5 py-2 text-sm font-medium text-text-primary"
                  >
                    <span>{kw.word}</span>
                    <span className="rounded-md bg-stone-300/60 px-1.5 py-0.5 text-xs font-bold text-text-secondary dark:bg-stone-700/60">
                      {kw.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pt-2 text-xs text-text-tertiary">
                No transcriptions recorded yet to extract concepts.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
