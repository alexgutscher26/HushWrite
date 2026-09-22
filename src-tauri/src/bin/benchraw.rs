/*!
 * SOURCE OF TRUTH KEYWORDS: benchraw, whisper_raw_bench, decode_bench, timing_harness
 * WHAT:  Minimal raw whisper-rs benchmark harness for testing isolated ggml decode timings.
 * WHY:   Isolates HushWrite's decode params from compiled ggml kernels to benchmark raw transcription speeds.
 * WHERE: Standalone binary in `src-tauri/src/bin/benchraw.rs`, invoked manually via cargo run --bin benchraw.
 */

use std::path::Path;
use std::time::Instant;

use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

fn read_wav_16k_mono(path: &Path) -> Result<Vec<f32>, String> {
    let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
    if bytes.len() < 44 || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Err("not a RIFF WAVE file".into());
    }
    let mut pos = 12usize;
    let mut data: Option<&[u8]> = None;
    while pos + 8 <= bytes.len() {
        let id = &bytes[pos..pos + 4];
        let size = u32::from_le_bytes(bytes[pos + 4..pos + 8].try_into().unwrap()) as usize;
        if id == b"data" {
            let end = (pos + 8 + size).min(bytes.len());
            data = Some(&bytes[pos + 8..end]);
        }
        pos += 8 + size + (size & 1);
    }
    let data = data.ok_or("no data chunk")?;
    Ok(data
        .chunks_exact(2)
        .map(|c| i16::from_le_bytes([c[0], c[1]]) as f32 / 32768.0)
        .collect())
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let model = args.get(1).expect("usage: benchraw <model> <wav>");
    let wav = args.get(2).expect("usage: benchraw <model> <wav>");

    let samples = read_wav_16k_mono(Path::new(wav)).expect("wav");
    println!("samples: {}", samples.len());

    let t0 = Instant::now();
    let ctx = WhisperContext::new_with_params(model, WhisperContextParameters::default())
        .expect("model load");
    println!("model load: {:.2} s", t0.elapsed().as_secs_f32());

    let mut state = ctx.create_state().expect("state");

    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some("en"));
    if let Ok(n) = std::env::var("N_THREADS") {
        params.set_n_threads(n.parse().expect("n_threads"));
    }
    params.set_print_progress(false);
    params.set_print_special(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);

    let t1 = Instant::now();
    state.full(params, &samples).expect("decode");
    println!("full(): {:.3} s", t1.elapsed().as_secs_f32());

    ctx.print_timings();
}
