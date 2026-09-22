/*!
 * SOURCE OF TRUTH KEYWORDS: play_feedback, play_paste_confirmation,
 *   FeedbackSound, PlaySoundW, paste_confirmation_volume
 * WHAT:  Short Windows feedback sounds, including a distinct volume-controlled
 *        chime played only after a paste succeeds.
 */

use std::collections::HashMap;
use std::f32::consts::TAU;
use std::sync::{Mutex, OnceLock};

use windows::core::{w, PCWSTR};
use windows::Win32::Foundation::HMODULE;
use windows::Win32::Media::Audio::{
    PlaySoundW, SND_ALIAS, SND_ASYNC, SND_MEMORY, SND_NODEFAULT,
};
use windows::Win32::UI::WindowsAndMessaging::{MB_ICONASTERISK, MB_ICONEXCLAMATION, MB_OK};

#[link(name = "user32")]
extern "system" {
    fn MessageBeep(uType: u32) -> i32;
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FeedbackSound {
    Start,
    Stop,
    Failed,
}

pub fn play_feedback(sound: FeedbackSound) {
    let alias: PCWSTR = match sound {
        FeedbackSound::Start => w!("SystemAsterisk"),
        FeedbackSound::Stop => w!("SystemDefault"),
        FeedbackSound::Failed => w!("SystemHand"),
    };

    unsafe {
        let played = PlaySoundW(alias, HMODULE::default(), SND_ASYNC | SND_ALIAS | SND_NODEFAULT);
        if !played.as_bool() {
            let sound_type = match sound {
                FeedbackSound::Start => MB_OK,
                FeedbackSound::Stop => MB_ICONASTERISK,
                FeedbackSound::Failed => MB_ICONEXCLAMATION,
            };
            let _ = MessageBeep(sound_type.0);
        }
    }
}

/// Plays a small two-note chime at the requested percentage of the app volume.
/// Sends a short tactile click when Windows exposes a haptic actuator.
/// Devices without a vibration endpoint simply ignore the request.
pub fn play_haptic_tap() {
    std::thread::Builder::new()
        .name("HushWrite-haptic-tap".to_string())
        .spawn(|| {
            use windows::Devices::Haptics::{KnownSimpleHapticsControllerWaveforms, VibrationDevice};

            let Ok(operation) = VibrationDevice::GetDefaultAsync() else {
                return;
            };
            let Ok(device) = operation.get() else {
                return;
            };
            let Ok(controller) = device.SimpleHapticsController() else {
                return;
            };
            let Ok(feedbacks) = controller.SupportedFeedback() else {
                return;
            };
            let Ok(click) = KnownSimpleHapticsControllerWaveforms::Click() else {
                return;
            };

            for index in 0..feedbacks.Size().unwrap_or(0) {
                let Ok(feedback) = feedbacks.GetAt(index) else {
                    continue;
                };
                if feedback.Waveform().ok() == Some(click) {
                    let _ = controller.SendHapticFeedbackWithIntensity(&feedback, 0.35);
                    break;
                }
            }
        })
        .ok();
}

pub fn play_paste_confirmation(volume_percent: f32) {
    let volume = volume_percent.clamp(0.0, 100.0).round() as u8;
    if volume == 0 {
        return;
    }

    static CHIMES: OnceLock<Mutex<HashMap<u8, &'static [u8]>>> = OnceLock::new();
    let cache = CHIMES.get_or_init(|| Mutex::new(HashMap::new()));
    let wav = {
        let mut cache = cache.lock().expect("chime cache lock");
        *cache.entry(volume).or_insert_with(|| Box::leak(Box::new(build_chime_wav(volume))))
    };

    unsafe {
        // SND_MEMORY expects a pointer to the in-memory RIFF/WAV bytes.
        let source = PCWSTR(wav.as_ptr() as *const u16);
        let _ = PlaySoundW(source, HMODULE::default(), SND_ASYNC | SND_MEMORY);
    }
}

fn build_chime_wav(volume_percent: u8) -> Vec<u8> {
    const RATE: u32 = 22_050;
    const SAMPLES: usize = (RATE as usize * 180) / 1000;
    let mut pcm = Vec::with_capacity(SAMPLES * 2);
    for index in 0..SAMPLES {
        let t = index as f32 / RATE as f32;
        let frequency = if t < 0.09 { 880.0 } else { 1174.66 };
        let envelope = (1.0 - t / 0.18).max(0.0).powf(0.7);
        let sample = (TAU * frequency * t).sin() * envelope * (volume_percent as f32 / 100.0);
        pcm.extend_from_slice(&((sample * i16::MAX as f32) as i16).to_le_bytes());
    }

    let data_len = pcm.len() as u32;
    let riff_len = 36 + data_len;
    let mut wav = Vec::with_capacity(44 + pcm.len());
    wav.extend_from_slice(b"RIFF");
    wav.extend_from_slice(&riff_len.to_le_bytes());
    wav.extend_from_slice(b"WAVEfmt ");
    wav.extend_from_slice(&16u32.to_le_bytes());
    wav.extend_from_slice(&1u16.to_le_bytes());
    wav.extend_from_slice(&1u16.to_le_bytes());
    wav.extend_from_slice(&RATE.to_le_bytes());
    wav.extend_from_slice(&(RATE * 2).to_le_bytes());
    wav.extend_from_slice(&2u16.to_le_bytes());
    wav.extend_from_slice(&16u16.to_le_bytes());
    wav.extend_from_slice(b"data");
    wav.extend_from_slice(&data_len.to_le_bytes());
    wav.extend_from_slice(&pcm);
    wav
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chime_volume_is_clamped_and_has_a_valid_wav_header() {
        let wav = build_chime_wav(100);
        assert_eq!(&wav[..4], b"RIFF");
        assert_eq!(&wav[8..12], b"WAVE");
        assert_eq!(build_chime_wav(0).len(), wav.len());
    }
}
