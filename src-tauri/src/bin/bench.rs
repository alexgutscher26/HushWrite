/*!
 * SOURCE OF TRUTH KEYWORDS: HushWrite_bench, model_benchmarking_cli, calculate_wer,
 *   read_wav_file, run_benchmark, WerResult
 * WHAT:  CLI benchmark utility for validating Whisper models against audio files.
 * WHY:   Allows contributors and developers to measure decode time, Real-Time Factor (RTF),
 *        and Word Error Rate (WER) against reference transcripts from a WAV file without
 *        running the full Tauri application.
 * WHERE: Run via `cargo run --bin HushWrite-bench -- --wav <file> [--reference <ref>]`.
 */

use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;

use hush_write_lib::adapters::whisper::hallucination::strip_noise_tags;
use hush_write_lib::adapters::whisper::pin_to_performance_cores;
use hush_write_lib::adapters::whisper::WhisperEngine;
use hush_write_lib::config::AppPaths;
use hush_write_lib::ports::{TranscribeRequest, TranscriptionEngine};
use hush_write_lib::types::{AudioChunk, ChunkKind, LanguageCode, LanguageHint, TARGET_SAMPLE_RATE};

#[derive(Debug, Clone, PartialEq)]
pub struct WerResult {
    pub wer: f32,
    pub substitutions: usize,
    pub deletions: usize,
    pub insertions: usize,
    pub reference_words: usize,
    pub hypothesis_words: usize,
}

/// Normalizes text for WER computation: lowercases, strips noise tags, removes punctuation,
/// and splits into words.
pub fn tokenize_for_wer(text: &str) -> Vec<String> {
    let stripped = strip_noise_tags(&text.to_lowercase());
    stripped
        .split_whitespace()
        .map(|word| {
            word.chars()
                .filter(|c| c.is_alphanumeric())
                .collect::<String>()
        })
        .filter(|word| !word.is_empty())
        .collect()
}

/// Computes Word Error Rate (WER) using Levenshtein distance on tokenized word sequences.
pub fn calculate_wer(reference: &str, hypothesis: &str) -> WerResult {
    let ref_words = tokenize_for_wer(reference);
    let hyp_words = tokenize_for_wer(hypothesis);

    let n = ref_words.len();
    let m = hyp_words.len();

    if n == 0 {
        if m == 0 {
            return WerResult {
                wer: 0.0,
                substitutions: 0,
                deletions: 0,
                insertions: 0,
                reference_words: 0,
                hypothesis_words: 0,
            };
        } else {
            return WerResult {
                wer: 1.0,
                substitutions: 0,
                deletions: 0,
                insertions: m,
                reference_words: 0,
                hypothesis_words: m,
            };
        }
    }

    // DP table storing (cost, substitutions, deletions, insertions)
    #[derive(Clone, Copy, Default)]
    struct Cell {
        cost: usize,
        sub: usize,
        del: usize,
        ins: usize,
    }

    let mut dp = vec![vec![Cell::default(); m + 1]; n + 1];

    for i in 1..=n {
        dp[i][0] = Cell {
            cost: i,
            sub: 0,
            del: i,
            ins: 0,
        };
    }

    for j in 1..=m {
        dp[0][j] = Cell {
            cost: j,
            sub: 0,
            del: 0,
            ins: j,
        };
    }

    for i in 1..=n {
        for j in 1..=m {
            if ref_words[i - 1] == hyp_words[j - 1] {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                let sub = Cell {
                    cost: dp[i - 1][j - 1].cost + 1,
                    sub: dp[i - 1][j - 1].sub + 1,
                    del: dp[i - 1][j - 1].del,
                    ins: dp[i - 1][j - 1].ins,
                };
                let del = Cell {
                    cost: dp[i - 1][j].cost + 1,
                    sub: dp[i - 1][j].sub,
                    del: dp[i - 1][j].del + 1,
                    ins: dp[i - 1][j].ins,
                };
                let ins = Cell {
                    cost: dp[i][j - 1].cost + 1,
                    sub: dp[i][j - 1].sub,
                    del: dp[i][j - 1].del,
                    ins: dp[i][j - 1].ins + 1,
                };

                let mut best = sub;
                if del.cost < best.cost {
                    best = del;
                }
                if ins.cost < best.cost {
                    best = ins;
                }
                dp[i][j] = best;
            }
        }
    }

    let final_cell = dp[n][m];
    let wer = (final_cell.cost as f32) / (n as f32);

    WerResult {
        wer,
        substitutions: final_cell.sub,
        deletions: final_cell.del,
        insertions: final_cell.ins,
        reference_words: n,
        hypothesis_words: m,
    }
}

/// Reads a WAV file, supporting 16-bit PCM integer and 32-bit float mono or stereo,
/// converting samples to 16kHz mono `f32`.
pub fn read_wav_file(path: &Path) -> Result<Vec<f32>, String> {
    let bytes = fs::read(path).map_err(|e| format!("Failed to read file {}: {}", path.display(), e))?;

    if bytes.len() < 44 || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Err("File is not a valid RIFF WAVE audio file.".to_string());
    }

    let mut pos = 12usize;
    let mut audio_format = 1u16;
    let mut num_channels = 1u16;
    let mut sample_rate = 16000u32;
    let mut bits_per_sample = 16u16;
    let mut data_slice: Option<&[u8]> = None;

    while pos + 8 <= bytes.len() {
        let chunk_id = &bytes[pos..pos + 4];
        let chunk_size = u32::from_le_bytes(
            bytes[pos + 4..pos + 8]
                .try_into()
                .map_err(|_| "Malformed chunk size".to_string())?,
        ) as usize;
        let body = pos + 8;

        if chunk_id == b"fmt " && chunk_size >= 16 {
            audio_format = u16::from_le_bytes(bytes[body..body + 2].try_into().unwrap());
            num_channels = u16::from_le_bytes(bytes[body + 2..body + 4].try_into().unwrap());
            sample_rate = u32::from_le_bytes(bytes[body + 4..body + 8].try_into().unwrap());
            bits_per_sample = u16::from_le_bytes(bytes[body + 14..body + 16].try_into().unwrap());
        } else if chunk_id == b"data" {
            let end = body.saturating_add(chunk_size).min(bytes.len());
            data_slice = Some(&bytes[body..end]);
        }

        pos = body.saturating_add(chunk_size) + (chunk_size & 1);
    }

    let data = data_slice.ok_or_else(|| "Missing 'data' chunk in WAV file.".to_string())?;

    let mut samples = Vec::new();
    let channels = num_channels as usize;
    if channels == 0 {
        return Err("WAV has 0 channels".to_string());
    }

    match (audio_format, bits_per_sample) {
        (1, 16) => {
            // 16-bit signed PCM
            let step = 2 * channels;
            for chunk in data.chunks_exact(step) {
                let mut sum = 0.0f32;
                for ch in 0..channels {
                    let s = i16::from_le_bytes(chunk[ch * 2..ch * 2 + 2].try_into().unwrap());
                    sum += (s as f32) / 32768.0;
                }
                samples.push(sum / (channels as f32));
            }
        }
        (1, 24) => {
            // 24-bit signed PCM
            let step = 3 * channels;
            for chunk in data.chunks_exact(step) {
                let mut sum = 0.0f32;
                for ch in 0..channels {
                    let b = &chunk[ch * 3..ch * 3 + 3];
                    let s = i32::from_le_bytes([0, b[0], b[1], b[2]]) >> 8;
                    sum += (s as f32) / 8388608.0;
                }
                samples.push(sum / (channels as f32));
            }
        }
        (3, 32) | (1, 32) => {
            // 32-bit IEEE float or 32-bit PCM
            let step = 4 * channels;
            for chunk in data.chunks_exact(step) {
                let mut sum = 0.0f32;
                for ch in 0..channels {
                    let s = f32::from_le_bytes(chunk[ch * 4..ch * 4 + 4].try_into().unwrap());
                    sum += s;
                }
                samples.push(sum / (channels as f32));
            }
        }
        _ => {
            return Err(format!(
                "Unsupported WAV format: audio_format={}, bits_per_sample={}",
                audio_format, bits_per_sample
            ));
        }
    }

    // Resample to 16kHz if necessary
    if sample_rate != TARGET_SAMPLE_RATE {
        samples = resample_linear(&samples, sample_rate, TARGET_SAMPLE_RATE);
    }

    Ok(samples)
}

fn resample_linear(input: &[f32], from_rate: u32, to_rate: u32) -> Vec<f32> {
    if input.is_empty() || from_rate == to_rate {
        return input.to_vec();
    }
    let ratio = (from_rate as f64) / (to_rate as f64);
    let target_len = ((input.len() as f64) / ratio).round() as usize;
    let mut output = Vec::with_capacity(target_len);

    for i in 0..target_len {
        let src_idx = (i as f64) * ratio;
        let idx0 = src_idx.floor() as usize;
        let frac = (src_idx - (idx0 as f64)) as f32;

        if idx0 + 1 < input.len() {
            output.push(input[idx0] * (1.0 - frac) + input[idx0 + 1] * frac);
        } else if idx0 < input.len() {
            output.push(input[idx0]);
        }
    }
    output
}

#[derive(Default)]
struct CliArgs {
    wav_path: Option<PathBuf>,
    model_path: Option<PathBuf>,
    reference: Option<String>,
    prompt: Option<String>,
    language: Option<String>,
    threads: Option<usize>,
    help: bool,
}

fn parse_args(args: &[String]) -> CliArgs {
    let mut cli = CliArgs::default();
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "-w" | "--wav" => {
                if i + 1 < args.len() {
                    cli.wav_path = Some(PathBuf::from(&args[i + 1]));
                    i += 1;
                }
            }
            "-m" | "--model" => {
                if i + 1 < args.len() {
                    cli.model_path = Some(PathBuf::from(&args[i + 1]));
                    i += 1;
                }
            }
            "-r" | "--reference" | "--ref" => {
                if i + 1 < args.len() {
                    cli.reference = Some(args[i + 1].clone());
                    i += 1;
                }
            }
            "-p" | "--prompt" => {
                if i + 1 < args.len() {
                    cli.prompt = Some(args[i + 1].clone());
                    i += 1;
                }
            }
            "-l" | "--language" | "--lang" => {
                if i + 1 < args.len() {
                    cli.language = Some(args[i + 1].clone());
                    i += 1;
                }
            }
            "-t" | "--threads" => {
                if i + 1 < args.len() {
                    cli.threads = args[i + 1].parse().ok();
                    i += 1;
                }
            }
            "-h" | "--help" => {
                cli.help = true;
            }
            other => {
                if !other.starts_with('-') && cli.wav_path.is_none() {
                    cli.wav_path = Some(PathBuf::from(other));
                }
            }
        }
        i += 1;
    }
    cli
}

fn find_default_model() -> Option<PathBuf> {
    if let Ok(paths) = AppPaths::resolve() {
        if let Ok(entries) = fs::read_dir(&paths.models_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_file() {
                    if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                        if ext == "bin" || ext == "ggml" || ext == "gguf" {
                            return Some(p);
                        }
                    }
                }
            }
        }
    }
    None
}

fn print_help() {
    println!(
        r#"HushWrite-bench — Model Benchmarking CLI

USAGE:
    HushWrite-bench [OPTIONS] <WAV_FILE>

OPTIONS:
    -w, --wav <PATH>           Path to the input WAV file to benchmark
    -m, --model <PATH>         Path to the Whisper model file (.bin / .ggml)
    -r, --reference <TEXT/FILE> Reference transcript or path to .txt reference
    -p, --prompt <TEXT>        Initial vocabulary / hotwords prompt
    -l, --language <CODE>      Target language code (e.g. "en", "auto")
    -t, --threads <N>          Number of threads to run inference on
    -h, --help                 Print this help information
"#
    );
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let cli = parse_args(&args);

    if cli.help || cli.wav_path.is_none() {
        print_help();
        return;
    }

    let wav_path = cli.wav_path.unwrap();
    if !wav_path.is_file() {
        eprintln!("Error: WAV file not found at: {}", wav_path.display());
        std::process::exit(1);
    }

    let model_path = match cli.model_path.or_else(find_default_model) {
        Some(p) => p,
        None => {
            eprintln!("Error: No model path provided and no installed model found in HushWrite model cache. Use --model <path>");
            std::process::exit(1);
        }
    };

    if !model_path.is_file() {
        eprintln!("Error: Model file not found at: {}", model_path.display());
        std::process::exit(1);
    }

    println!("============================================================");
    println!("              HushWrite Model Benchmark                     ");
    println!("============================================================");
    println!("Audio File:      {}", wav_path.display());
    println!("Model Path:      {}", model_path.display());

    // 1. Load Audio
    let samples = match read_wav_file(&wav_path) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Error reading WAV file: {}", e);
            std::process::exit(1);
        }
    };

    let audio_duration_sec = (samples.len() as f32) / (TARGET_SAMPLE_RATE as f32);
    println!(
        "Audio Duration:  {:.2} s ({} samples @ 16kHz mono)",
        audio_duration_sec,
        samples.len()
    );

    // 2. Initialize Whisper Engine
    let _affinity = pin_to_performance_cores();
    let engine = WhisperEngine::new(model_path.clone());

    let load_start = Instant::now();
    if let Err(e) = engine.prepare() {
        eprintln!("Error preparing Whisper model: {}", e);
        std::process::exit(1);
    }
    let model_load_ms = load_start.elapsed().as_secs_f64() * 1000.0;
    println!("Model Load Time: {:.2} ms", model_load_ms);

    // 3. Run Benchmark Transcription
    let chunk = AudioChunk {
        samples,
        start_ms: 0,
        end_ms: (audio_duration_sec * 1000.0) as u64,
        kind: ChunkKind::Tail,
    };

    let language_hint = match cli.language {
        Some(lang) if !lang.is_empty() && lang != "auto" => LanguageHint::Pinned {
            language: LanguageCode(lang),
        },
        _ => LanguageHint::Auto,
    };

    let req = TranscribeRequest {
        language: language_hint,
        prompt: cli.prompt,
    };

    println!("\nDecoding audio...");
    let decode_start = Instant::now();
    let segments = match engine.transcribe(&chunk, &req) {
        Ok(segs) => segs,
        Err(e) => {
            eprintln!("Error transcribing audio: {}", e);
            std::process::exit(1);
        }
    };
    let decode_elapsed = decode_start.elapsed();
    let decode_ms = decode_elapsed.as_secs_f64() * 1000.0;
    let decode_sec = decode_elapsed.as_secs_f32();
    let rtf = if audio_duration_sec > 0.0 {
        decode_sec / audio_duration_sec
    } else {
        0.0
    };
    let speedup = if rtf > 0.0 { 1.0 / rtf } else { 0.0 };

    let hypothesis: String = segments
        .iter()
        .map(|s| s.text.trim())
        .filter(|t| !t.is_empty())
        .collect::<Vec<_>>()
        .join(" ");

    println!("\n--- Timing & Performance ---");
    println!("Decode Time:      {:.2} ms ({:.3} s)", decode_ms, decode_sec);
    println!(
        "Real-Time Factor: {:.3}x ({:.2}x faster than realtime)",
        rtf, speedup
    );

    println!("\n--- Transcription Output ---");
    println!("Hypothesis:\n  \"{}\"", hypothesis);

    // 4. Reference & WER if provided
    if let Some(ref_input) = cli.reference {
        let reference_text = if Path::new(&ref_input).is_file() {
            fs::read_to_string(&ref_input).unwrap_or(ref_input)
        } else {
            ref_input
        };

        let wer_res = calculate_wer(&reference_text, &hypothesis);
        println!("\n--- Accuracy (WER) ---");
        println!("Reference:\n  \"{}\"", reference_text.trim());
        println!(
            "Word Error Rate:  {:.2}% ({} errors / {} ref words)",
            wer_res.wer * 100.0,
            wer_res.substitutions + wer_res.deletions + wer_res.insertions,
            wer_res.reference_words
        );
        println!(
            "  - Substitutions: {}\n  - Deletions:     {}\n  - Insertions:    {}",
            wer_res.substitutions, wer_res.deletions, wer_res.insertions
        );
    }

    println!("============================================================");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wer_exact_match() {
        let res = calculate_wer(
            "The quick brown fox jumps over the lazy dog.",
            "the quick brown fox jumps over the lazy dog",
        );
        assert_eq!(res.wer, 0.0);
        assert_eq!(res.substitutions, 0);
        assert_eq!(res.deletions, 0);
        assert_eq!(res.insertions, 0);
        assert_eq!(res.reference_words, 9);
    }

    #[test]
    fn test_wer_substitutions_and_insertions() {
        let res = calculate_wer(
            "the quick brown fox",
            "the fast brown fox today",
        );
        // "quick" -> "fast" (1 sub), "today" (1 ins). 2 errors / 4 ref words = 0.50
        assert_eq!(res.substitutions, 1);
        assert_eq!(res.insertions, 1);
        assert_eq!(res.deletions, 0);
        assert_eq!(res.reference_words, 4);
        assert_eq!(res.wer, 0.5);
    }

    #[test]
    fn test_wer_deletions() {
        let res = calculate_wer(
            "one two three four",
            "one four",
        );
        // "two", "three" deleted (2 del). 2 errors / 4 ref words = 0.50
        assert_eq!(res.deletions, 2);
        assert_eq!(res.substitutions, 0);
        assert_eq!(res.insertions, 0);
        assert_eq!(res.wer, 0.5);
    }

    #[test]
    fn test_wav_resample_linear() {
        let orig = vec![0.0, 0.5, 1.0, 0.5, 0.0];
        let resampled = resample_linear(&orig, 16000, 16000);
        assert_eq!(resampled, orig);

        let doubled = resample_linear(&orig, 16000, 32000);
        assert_eq!(doubled.len(), 10);
    }
}
