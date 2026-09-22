/*!
 * SOURCE OF TRUTH KEYWORDS: DeliveryWorker, PendingDelivery, FinishedRecording,
 *   run_delivery_worker, ordered_delivery, background_delivery
 * WHAT:  Everything that happens to a recording AFTER the user has stopped
 *        talking: the trailing decode, enhancement, the paste, the History row.
 * WHY:   This module exists so that none of it happens while the user is
 *        waiting. Capture and delivery used to be one state machine, which
 *        meant the person was held at the machine's pace — the pill stayed on
 *        screen for as long as the model took, and the next recording was
 *        refused until the previous one had finished pasting. Splitting them at
 *        the stop boundary is what makes the app feel immediate: the FSM is
 *        back at Idle before the tail has even been submitted.
 *
 *        DELIVERIES ARE SEQUENTIAL, and that is the second reason this is a
 *        module rather than a detached task per recording. If two recordings
 *        are in flight, their text MUST arrive in the order it was spoken —
 *        dictate a sentence, dictate the next, and getting them back reversed
 *        is worse than waiting. A single consumer reading one channel gives
 *        that ordering by construction, with no locking and nothing to reason
 *        about. Spawning a task per delivery would have been simpler to write
 *        and would have raced two pastes into the same text field.
 *
 *        It also means a slow decode delays only the deliveries behind it,
 *        never the microphone.
 * WHERE: Fed by SessionActor when a recording finishes; runs as one task
 *        spawned alongside the actor.
 */

use std::sync::Arc;
use std::time::Instant;

use tokio::sync::mpsc;

use crate::error::AppError;
use crate::ipc::context::SessionContext;
use crate::pipeline::assembler::Assembler;
use crate::ports::enhancer::EnhanceContext;
use crate::ports::injector::InjectionRequest;
use crate::services;
use crate::session::machine::SessionEvent;
use crate::session::settings_view::SessionSettings;
use crate::telemetry::latency::{now_ms, LatencyRecorder};
use crate::types::{DeliveryKind, LanguageCode, LatencyStage, SessionId, SessionOutcome};

/**
 * SOURCE OF TRUTH KEYWORDS: PendingDelivery
 * WHAT:  A recording whose capture has ended but whose trailing fragment is
 *        still being decoded.
 * WHY:   Held by the actor, keyed by session id, because decode results arrive
 *        on one shared channel and have to be routed back to the recording they
 *        belong to. Before deliveries could overlap there was only ever one
 *        candidate and the actor's own fields were enough; now a result can
 *        arrive for a recording that ended two recordings ago.
 * WHERE: Created by SessionActor on HandOffToDelivery; becomes a
 *        FinishedRecording when its tail decodes.
 */
pub struct PendingDelivery {
    pub session_id: SessionId,
    pub assembler: Assembler,
    pub settings: SessionSettings,
    pub detected_language: Option<LanguageCode>,
    pub latency: Arc<LatencyRecorder>,
    /// Wall clock from the start of capture, for the History row's duration.
    pub started_at: Option<Instant>,
    /// From the stop keypress, for the "stop to pasted" metric.
    pub finalize_started: Option<Instant>,
    /**
     * True when the microphone produced pure digital silence for the whole
     * recording. Carried rather than recomputed because the chunker that
     * measured it has already been reset for the next recording.
     */
    pub heard_nothing_at_all: bool,
    pub peak_amplitude: f32,
    /// Number of chunk decode jobs still in flight for this session.
    pub in_flight: usize,
}

/// A recording with everything decoded, queued for its turn to be delivered.
pub struct FinishedRecording {
    pub pending: PendingDelivery,
}

/**
 * SOURCE OF TRUTH KEYWORDS: run_delivery_worker
 * WHAT:  The single sequential consumer. Reads finished recordings in the order
 *        they finished and delivers them one at a time.
 * WHY:   See the module WHY — ordering is the reason this is one task and not
 *        one task each. It awaits each delivery fully before taking the next,
 *        so two pastes can never interleave into the same field.
 * WHERE: Spawned once by bootstrap, alongside the session actor.
 */
pub async fn run_delivery_worker(ctx: SessionContext, mut rx: mpsc::Receiver<FinishedRecording>) {
    while let Some(job) = rx.recv().await {
        deliver(&ctx, job.pending).await;
    }
    tracing::info!("delivery worker stopped");
}

/**
 * SOURCE OF TRUTH KEYWORDS: deliver, background_failure
 * WHAT:  Turns one finished recording into pasted text and a History row.
 * WHY:   Failures here are reported very differently from capture failures,
 *        and the difference is the point of the split. This runs while the user
 *        may already be recording again, so it must never take the screen. It
 *        asks the FSM to show something only when nothing is in progress; the
 *        row and the log carry it otherwise.
 * WHERE: Called only by run_delivery_worker, one at a time.
 */
async fn deliver(ctx: &SessionContext, pending: PendingDelivery) {
    let PendingDelivery {
        session_id,
        mut assembler,
        settings,
        detected_language,
        latency,
        started_at,
        finalize_started,
        heard_nothing_at_all,
        peak_amplitude,
        in_flight: _,
    } = pending;

    let raw = {
        let _timer = latency.stage_timer(LatencyStage::Assemble);
        assembler.scrub_backtracks();
        assembler.finish()
    };

    let has_speech =
        !raw.trim().is_empty() && crate::adapters::whisper::hallucination::has_non_noise_words(&raw);

    if !has_speech {
        ctx.ports.events.update_session_wpm(None);
        // An empty transcript has two very different causes and they must not
        // be reported the same way. Pure digital silence means the capture path
        // is broken and the user has to be told; saying nothing means they said
        // nothing, which is not a complaint worth making.
        if heard_nothing_at_all {
            tracing::warn!(
                peak_amplitude,
                "the microphone delivered no signal for the whole session"
            );
            report_failure(ctx, AppError::microphone_silent()).await;
            persist(
                ctx,
                &session_id,
                &latency,
                Outcome::failed(AppError::microphone_silent()),
                started_at,
                None,
            );
            return;
        }

        if !raw.trim().is_empty() {
            tracing::info!(raw = %raw, "dropped silent / hallucination-only session before delivery");
        }

        persist(
            ctx,
            &session_id,
            &latency,
            Outcome::nothing_said(),
            started_at,
            None,
        );
        return;
    }

    let language = assembler
        .language()
        .map(|l| LanguageCode(l.to_string()))
        .or(detected_language);

    let dictionary = services::dictionary::enabled_entries(&ctx.db).unwrap_or_default();

    let context = EnhanceContext {
        language: language.clone(),
        dictionary,
        strip_fillers: settings.strip_fillers,
        expand_spoken_commands: settings.spoken_commands,
        normalise_punctuation: settings.normalise_punctuation,
        capitalise_sentences: settings.capitalise_sentences,
        apply_corrections: settings.apply_corrections,
        expand_abbreviations: settings.expand_abbreviations,
        disabled_abbreviations: settings.disabled_abbreviations,
        normalise_numbers: settings.normalise_numbers,
        normalise_urls_and_paths: settings.normalise_urls_and_paths,
        code_mode: settings.code_mode,
        code_casing_style: settings.code_casing_style,
        profanity_filter: settings.profanity_filter,
        profanity_style: settings.profanity_style.clone(),
        rule_order: settings.rule_order.clone(),
        // The session path never needs the trace — see EnhanceContext.trace_rules.
        trace_rules: false,
        llm_cleanup_enabled: settings.llm_cleanup_enabled,
        llm_model: settings.llm_model,
        llm_auto_quantization: settings.llm_auto_quantization,
        voice_transforms_enabled: settings.voice_transforms_enabled,
        custom_system_prompt: settings.custom_system_prompt,
        voice_transform_trigger: settings.voice_transform_trigger,
    };

    if settings.auto_escalate {
        let policy = crate::pipeline::adaptive::AdaptiveEscalationPolicy::new(
            settings.auto_escalate,
            settings.confidence_threshold,
            settings.app_aware_escalate,
            settings.escalate_model.clone(),
            true,
        );
        let decision = policy.evaluate(
            None,
            started_at.map(|t| t.elapsed().as_millis() as u64).unwrap_or(0),
            -30.0,
            peak_amplitude,
            None,
        );
        if decision.should_escalate {
            tracing::info!(
                reason = %decision.reason,
                target_model = %decision.target_model,
                "adaptive model auto-escalation evaluated for session"
            );
        }
    }

    let final_text = {
        let _timer = latency.stage_timer(LatencyStage::Enhance);
        ctx.ports
            .enhancer
            .enhance(&raw, &context)
            .unwrap_or_else(|err| {
                // Enhancement is polish. If it fails the words are still
                // correct, and shipping the raw transcript beats shipping
                // nothing.
                tracing::warn!(error = %err, "enhancement failed; delivering raw text");
                raw.clone()
            })
    };

    // The per-app `keys::PASTE_DELAY_MS` value is carried by this request.
    let outcome = {
        let _timer = latency.stage_timer(LatencyStage::Inject);
        ctx.ports.injector.deliver(&InjectionRequest {
            text: final_text.clone(),
            auto_paste: settings.auto_paste,
            restore_clipboard: settings.restore_clipboard,
            paste_delay_ms: settings.paste_delay_ms,
            clipboard_restore_delay_ms: settings.clipboard_restore_delay_ms,
            suppress_clipboard_history: settings.suppress_clipboard_history,
        })
    };

    let delivery = match outcome {
        Ok(outcome) => {
            if let Some(reason) = &outcome.reason {
                tracing::info!(reason, "delivery degraded to clipboard only");
            }
            latency.record(LatencyStage::ClipboardWrite, outcome.clipboard_write_ms);
            outcome.delivery
        }
        Err(err) => {
            tracing::warn!(error = %err, "delivery failed");
            report_failure(ctx, err).await;
            DeliveryKind::None
        }
    };

    // "Stop to pasted" — the headline number, and the only stage that spans
    // from a keypress to text on screen. Recorded here because this is the
    // moment it ends.
    if let Some(started) = finalize_started {
        latency.record(
            LatencyStage::TotalFinalize,
            started.elapsed().as_secs_f64() * 1000.0,
        );
    }

    let word_count = final_text.split_whitespace().count() as u32;
    ctx.ports
        .events
        .transcript_delivered_with_text(word_count, delivery, &final_text);

    if settings.audio_feedback
        && settings.paste_confirmation_sound
        && delivery == DeliveryKind::Pasted
    {
        crate::adapters::os::play_paste_confirmation(settings.paste_confirmation_volume);
    }

    if word_count > 0 {
        let duration_sec = match (started_at, finalize_started) {
            (Some(started), Some(finalized)) if finalized >= started => {
                finalized.duration_since(started).as_secs_f64()
            }
            (Some(started), _) => started.elapsed().as_secs_f64(),
            _ => 0.0,
        };
        let wpm = if duration_sec > 0.0 {
            ((word_count as f64) / (duration_sec / 60.0)).round()
        } else {
            0.0
        };
        if wpm > 0.0 {
            ctx.ports.events.update_session_wpm(Some(wpm));
        } else {
            ctx.ports.events.update_session_wpm(None);
        }
    } else {
        ctx.ports.events.update_session_wpm(None);
    }

    // The stop sound belongs to capture state transitions. The paste confirmation
    // is intentionally emitted below, only after a real paste succeeds.

    persist(
        ctx,
        &session_id,
        &latency,
        Outcome::delivered(delivery),
        started_at,
        Some((raw, final_text, language)),
    );
}

/**
 * SOURCE OF TRUTH KEYWORDS: report_failure, never_interrupt_a_recording
 * WHAT:  Surfaces a background failure on the pill, but only when the pill is
 *        free.
 * WHY:   The whole reason delivery moved to the background is that the user
 *        carries on. Taking the screen to report a recording they finished ten
 *        seconds ago — while they are speaking into the next one — would undo
 *        that. The FSM refuses the event unless it is Idle, so this is a hint
 *        rather than a command, and it is deliberately not retried.
 * WHERE: Called from deliver on the two failure paths.
 */
async fn report_failure(ctx: &SessionContext, err: AppError) {
    let _ = ctx.session.send(SessionEvent::DeliveryFailed(err)).await;
}

/**
 * SOURCE OF TRUTH KEYWORDS: persist_capture_failure
 * WHAT:  Writes the terminal row for a session that never reached delivery —
 *        the microphone was refused, the engine was not ready, the recording
 *        was abandoned before any audio was captured.
 * WHY:   These rows still belong in History. A failure that leaves no trace is
 *        a failure the user cannot report and we cannot diagnose, and "nothing
 *        appeared and nothing was written down" is the single worst outcome
 *        this app has.
 * WHERE: Called by the actor on the PersistOutcome effect, which now only
 *        fires for capture-side failures.
 */
pub fn persist_capture_failure(
    ctx: &SessionContext,
    session_id: &SessionId,
    latency: &LatencyRecorder,
    code: crate::error::ErrorCode,
    message: String,
    started_at: Option<Instant>,
) {
    persist(
        ctx,
        session_id,
        latency,
        Outcome {
            outcome: SessionOutcome::Failed,
            delivery: DeliveryKind::None,
            error_code: Some(format!("{code:?}")),
            error_message: Some(message),
        },
        started_at,
        None,
    );
}

/// The three shapes a finished recording can take in History.
struct Outcome {
    outcome: SessionOutcome,
    delivery: DeliveryKind,
    error_code: Option<String>,
    error_message: Option<String>,
}

impl Outcome {
    fn delivered(delivery: DeliveryKind) -> Self {
        Self {
            outcome: SessionOutcome::Delivered,
            delivery,
            error_code: None,
            error_message: None,
        }
    }

    fn nothing_said() -> Self {
        Self {
            outcome: SessionOutcome::Delivered,
            delivery: DeliveryKind::None,
            error_code: None,
            error_message: None,
        }
    }

    fn failed(err: AppError) -> Self {
        Self {
            outcome: SessionOutcome::Failed,
            delivery: DeliveryKind::None,
            error_code: Some(format!("{:?}", err.code)),
            error_message: Some(err.message),
        }
    }
}

/**
 * WHAT:  Writes the terminal row and the session's latency samples.
 * WHY:   Every exit from `deliver` goes through here, including the ones that
 *        deliver nothing. A recording that produced no text is still a
 *        recording that happened, and History that quietly omits it is History
 *        the user cannot trust.
 */
fn persist(
    ctx: &SessionContext,
    session_id: &SessionId,
    latency: &LatencyRecorder,
    outcome: Outcome,
    started_at: Option<Instant>,
    text: Option<(String, String, Option<LanguageCode>)>,
) {
    let duration_ms = started_at
        .map(|start| start.elapsed().as_millis() as i64)
        .unwrap_or_default();

    let (raw_text, final_text, language) = match text {
        Some((raw, final_text, language)) => (
            Some(raw),
            Some(final_text),
            language.map(|l| l.as_str().to_string()),
        ),
        None => (None, None, None),
    };

    let word_count = final_text
        .as_ref()
        .map(|text| text.split_whitespace().count() as i64);

    let result = services::sessions::SessionResult {
        ended_at: now_ms(),
        outcome: outcome.outcome,
        duration_ms,
        language,
        raw_text,
        final_text,
        word_count,
        delivery: outcome.delivery,
        error_code: outcome.error_code,
        error_message: outcome.error_message,
    };

    if let Err(err) = services::sessions::finalize_session(&ctx.db, session_id, &result) {
        tracing::error!(error = %err, "could not persist the session outcome");
    }

    // Append to the audit log — metadata only, never the transcript text.
    let audit_kind = match result.outcome {
        SessionOutcome::Delivered => services::audit::AuditKind::SessionDelivered,
        SessionOutcome::Failed => services::audit::AuditKind::SessionFailed,
        SessionOutcome::Orphaned => services::audit::AuditKind::SessionOrphaned,
    };
    services::audit::append(
        &ctx.db,
        services::audit::AuditEntry {
            kind: audit_kind,
            duration_ms: Some(result.duration_ms),
            outcome: Some(result.outcome.as_str().to_string()),
            delivery: Some(result.delivery.as_str().to_string()),
        },
    );

    let samples = latency.take_samples();
    if !samples.is_empty() {
        if let Err(err) = services::metrics::record_metrics(&ctx.db, session_id, &samples, now_ms())
        {
            tracing::warn!(error = %err, "could not record session metrics");
        }
    }
}
