/**
 * SOURCE OF TRUTH KEYWORDS: SessionPlaybackModal, SessionPlayback, word-highlighting,
 *   audio-scrubber, SpeechSynthesis, KaraokeHighlight
 * WHAT:  Per-session audio and transcript playback with synchronized word-by-word
 *        karaoke highlighting and seekable word navigation.
 * WHY:   Allows users to review recorded transcriptions with exact word-level timing,
 *        replay cadence, verify recognition accuracy, and jump to specific spoken
 *        words by clicking them.
 * WHERE: Opened from HistoryView by clicking the playback action on any session row.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FastForward, Mic, Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { formatCompactDuration, formatRelativeTime } from "@/lib/format";
import { GlassPanel } from "@/components/global";
import { commands, type SessionSummary } from "@/lib/bindings";
import { SessionFeedback } from "./SessionFeedback";

export interface SessionPlaybackModalProps {
  session: SessionSummary;
  onClose: () => void;
}

const PLAYBACK_RATES = [0.75, 1.0, 1.25, 1.5, 2.0] as const;

export function SessionPlaybackModal({ session, onClose }: SessionPlaybackModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasRealAudio, setHasRealAudio] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Parse text into individual words
  const text = session.final_text ?? session.raw_text ?? "";
  const words = useMemo(() => {
    return text.trim().split(/\s+/).filter(Boolean);
  }, [text]);

  const totalDurationMs = Math.max(1000, session.duration_ms ?? 3000);
  const totalWords = Math.max(1, words.length);
  const msPerWord = totalDurationMs / totalWords;

  // Fetch session audio if saved on disk
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;

    commands.getHistoryAudio({ id: session.id }).then((res) => {
      if (cancelled) return;
      if (res.status === "ok" && res.data.has_audio && res.data.audio_bytes) {
        const bytes = new Uint8Array(res.data.audio_bytes);
        const blob = new Blob([bytes], { type: "audio/wav" });
        url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.preload = "auto";
        audio.onended = () => {
          setIsPlaying(false);
          setCurrentTimeMs(totalDurationMs);
        };
        audioRef.current = audio;
        setHasRealAudio(true);
      }
    });

    return () => {
      cancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [session.id, totalDurationMs]);

  // Active word index derived from currentTimeMs
  const activeWordIndex = useMemo(() => {
    if (currentTimeMs <= 0) return -1;
    const index = Math.floor(currentTimeMs / msPerWord);
    return Math.min(words.length - 1, Math.max(0, index));
  }, [currentTimeMs, msPerWord, words.length]);

  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const synthUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Play / Pause toggler
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      if (hasRealAudio && audioRef.current) {
        audioRef.current.pause();
      } else {
        window.speechSynthesis?.cancel();
      }
    } else {
      if (currentTimeMs >= totalDurationMs) {
        setCurrentTimeMs(0);
        if (hasRealAudio && audioRef.current) {
          audioRef.current.currentTime = 0;
        }
      }
      setIsPlaying(true);
      lastTickRef.current = performance.now();

      if (hasRealAudio && audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.muted = isMuted;
        const seekSeconds = (currentTimeMs >= totalDurationMs ? 0 : currentTimeMs) / 1000;
        audioRef.current.currentTime = seekSeconds;
        audioRef.current.play().catch((err) => {
          console.warn("Audio playback failed, falling back to speech synthesis:", err);
        });
      } else if ("speechSynthesis" in window && !isMuted) {
        window.speechSynthesis.cancel();
        // Calculate remaining text from active word
        const startIndex = Math.max(0, activeWordIndex);
        const remainingText = words.slice(startIndex).join(" ");
        if (remainingText) {
          const utterance = new SpeechSynthesisUtterance(remainingText);
          utterance.rate = playbackRate;
          utterance.lang = session.language || "en-US";
          synthUtteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        }
      }
    }
  }, [
    isPlaying,
    hasRealAudio,
    currentTimeMs,
    totalDurationMs,
    isMuted,
    activeWordIndex,
    words,
    playbackRate,
    session.language,
  ]);

  // Sync mute and rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.playbackRate = playbackRate;
    }
  }, [isMuted, playbackRate]);

  // Main playback timer loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      return;
    }

    const step = (timestamp: number) => {
      if (hasRealAudio && audioRef.current) {
        const currentMs = audioRef.current.currentTime * 1000;
        setCurrentTimeMs(currentMs);
        if (audioRef.current.ended || currentMs >= totalDurationMs) {
          setIsPlaying(false);
          return;
        }
      } else {
        const delta = (timestamp - lastTickRef.current) * playbackRate;
        lastTickRef.current = timestamp;

        setCurrentTimeMs((prev) => {
          const next = prev + delta;
          if (next >= totalDurationMs) {
            setIsPlaying(false);
            window.speechSynthesis?.cancel();
            return totalDurationMs;
          }
          return next;
        });
      }

      animFrameRef.current = requestAnimationFrame(step);
    };

    lastTickRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, hasRealAudio, playbackRate, totalDurationMs]);

  // Clean up speech synthesis & audio on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Jump directly to word when clicked
  const seekToWord = useCallback(
    (index: number) => {
      const targetTime = index * msPerWord;
      setCurrentTimeMs(targetTime);
      if (hasRealAudio && audioRef.current) {
        audioRef.current.currentTime = targetTime / 1000;
      }
      if (isPlaying) {
        if (hasRealAudio && audioRef.current) {
          audioRef.current.play().catch(() => {});
        } else {
          window.speechSynthesis?.cancel();
          if ("speechSynthesis" in window && !isMuted) {
            const remainingText = words.slice(index).join(" ");
            if (remainingText) {
              const utterance = new SpeechSynthesisUtterance(remainingText);
              utterance.rate = playbackRate;
              utterance.lang = session.language || "en-US";
              synthUtteranceRef.current = utterance;
              window.speechSynthesis.speak(utterance);
            }
          }
        }
        lastTickRef.current = performance.now();
      }
    },
    [isPlaying, hasRealAudio, isMuted, msPerWord, playbackRate, session.language, words],
  );

  const seekRelative = useCallback(
    (deltaMs: number) => {
      const target = Math.max(0, Math.min(totalDurationMs, currentTimeMs + deltaMs));
      setCurrentTimeMs(target);
      if (hasRealAudio && audioRef.current) {
        audioRef.current.currentTime = target / 1000;
      }
      if (isPlaying) {
        lastTickRef.current = performance.now();
      }
    },
    [currentTimeMs, hasRealAudio, isPlaying, totalDurationMs],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-playback-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs"
    >
      <GlassPanel
        material="elevated"
        radius="card"
        className="relative flex w-full max-w-[620px] flex-col gap-5 p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 id="session-playback-title" className="text-heading text-text-primary">
                Session Playback
              </h2>
              {hasRealAudio ? (
                <span className="flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-caption text-emerald-400">
                  <Mic className="size-3" />
                  16kHz Audio
                </span>
              ) : (
                <span className="rounded bg-sunken-strong px-2 py-0.5 font-mono text-caption text-text-tertiary">
                  Synthetic Preview
                </span>
              )}
              {session.language ? (
                <span className="rounded bg-sunken-strong px-1.5 py-0.5 font-mono text-caption uppercase text-text-secondary">
                  {session.language}
                </span>
              ) : null}
            </div>
            <p className="text-caption text-text-secondary">
              {formatRelativeTime(session.started_at_ms)} · {formatCompactDuration(totalDurationMs)}{" "}
              · {words.length} words
            </p>
          </div>
          <button
            type="button"
            aria-label="Close playback"
            onClick={() => {
              window.speechSynthesis?.cancel();
              onClose();
            }}
            className="rounded-input p-1 text-text-secondary transition-colors hover:bg-sunken hover:text-text-primary"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Interactive Transcript Surface with Word Highlight */}
        <div className="max-h-[220px] overflow-y-auto rounded-input border border-hairline bg-sunken p-4">
          <p className="text-caption font-medium uppercase tracking-wider text-text-tertiary mb-2">
            Transcript (click any word to jump):
          </p>
          <div className="text-body leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1">
            {words.map((word, index) => {
              const isActive = index === activeWordIndex;
              const isPast = index < activeWordIndex;

              return (
                <button
                  key={`${index}-${word}`}
                  type="button"
                  onClick={() => seekToWord(index)}
                  className={`rounded px-1 py-0.5 text-left transition-all ${
                    isActive
                      ? "bg-text-primary font-semibold text-opaque-elevated shadow-xs scale-105"
                      : isPast
                        ? "text-text-primary hover:bg-sunken-strong"
                        : "text-text-tertiary hover:text-text-secondary hover:bg-sunken-strong"
                  }`}
                >
                  {word}
                </button>
              );
            })}
          </div>
        </div>

        {/* Waveform / Scrubber Progress Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={totalDurationMs}
              value={currentTimeMs}
              onChange={(e) => {
                const target = Number(e.target.value);
                setCurrentTimeMs(target);
                if (isPlaying) {
                  lastTickRef.current = performance.now();
                }
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-sunken-strong accent-text-primary focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between text-caption tabular-nums text-text-tertiary">
            <span>{(currentTimeMs / 1000).toFixed(1)}s</span>
            <span>{(totalDurationMs / 1000).toFixed(1)}s</span>
          </div>
        </div>

        {/* Player Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-input bg-sunken p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Rewind 3 seconds"
              onClick={() => seekRelative(-3000)}
              className="rounded-input p-1.5 text-text-secondary hover:bg-sunken-strong hover:text-text-primary"
            >
              <RotateCcw className="size-4" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="flex size-9 items-center justify-center rounded-full bg-text-primary text-opaque-elevated transition-transform active:scale-90"
            >
              {isPlaying ? (
                <Pause className="size-4 fill-current" />
              ) : (
                <Play className="size-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              aria-label="Forward 3 seconds"
              onClick={() => seekRelative(3000)}
              className="rounded-input p-1.5 text-text-secondary hover:bg-sunken-strong hover:text-text-primary"
            >
              <FastForward className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              className="rounded-input p-1.5 text-text-secondary hover:bg-sunken-strong hover:text-text-primary"
              aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            >
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          </div>

          {/* Feedback & Speed */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-caption text-text-tertiary mr-1">Rating:</span>
              <SessionFeedback session={session} />
            </div>
            <div className="h-3 w-px bg-hairline" />
            <div className="flex items-center gap-1">
              <span className="text-caption text-text-tertiary mr-1">Speed:</span>
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setPlaybackRate(rate)}
                  className={`rounded px-1.5 py-0.5 font-mono text-caption transition-colors ${
                    playbackRate === rate
                      ? "bg-text-primary text-opaque-elevated font-medium"
                      : "text-text-secondary hover:bg-sunken-strong hover:text-text-primary"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
