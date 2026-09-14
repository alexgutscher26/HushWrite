/*!
 * SOURCE OF TRUTH KEYWORDS: pin_to_performance_cores, ScopedAffinityGuard,
 *   p_core_affinity_mask, SetThreadAffinityMask
 * WHAT:  Thread affinity management for Whisper encoder/decoder passes on Windows.
 * WHY:   Whisper inference is a compute-bound BLAS workload. On modern hybrid
 *        CPUs (e.g. Intel Alder/Raptor Lake or SMT architectures), thread migration
 *        across efficiency cores or hyperthreaded siblings introduces severe
 *        cache eviction and latency jitter. Pinning compute-heavy encoder passes
 *        and auto-tuning benchmarks to performance/physical cores ensures predictable
 *        p99 latency and maximizes throughput.
 * WHERE: Used by adapters/whisper/engine.rs and adapters/whisper/benchmark.rs.
 */

pub struct ScopedAffinityGuard {
    #[cfg(target_os = "windows")]
    previous_mask: Option<usize>,
}

impl ScopedAffinityGuard {
    #[must_use]
    pub fn new() -> Self {
        #[cfg(target_os = "windows")]
        {
            let mask = performance_core_mask();
            if mask != 0 {
                let prev = set_thread_affinity(mask);
                return Self {
                    previous_mask: prev,
                };
            }
            Self {
                previous_mask: None,
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            Self {}
        }
    }
}

impl Drop for ScopedAffinityGuard {
    fn drop(&mut self) {
        #[cfg(target_os = "windows")]
        {
            if let Some(prev) = self.previous_mask {
                set_thread_affinity(prev);
            }
        }
    }
}

/**
 * SOURCE OF TRUTH KEYWORDS: pin_to_performance_cores
 * WHAT:  Pins the calling thread to performance/physical cores for the duration
 *        of the returned guard.
 */
pub fn pin_to_performance_cores() -> ScopedAffinityGuard {
    ScopedAffinityGuard::new()
}

/**
 * Calculates a bitmask representing the performance/physical cores on the system.
 */
pub fn performance_core_mask() -> usize {
    let logical = std::thread::available_parallelism()
        .map(std::num::NonZeroUsize::get)
        .unwrap_or(4)
        .min(usize::BITS as usize);

    #[cfg(all(target_arch = "x86_64", target_os = "windows"))]
    {
        // On x86_64 Windows with SMT, even-numbered bits (0, 2, 4...) correspond
        // to primary physical execution cores, avoiding hyperthread sibling contention.
        let mut mask = 0usize;
        for i in (0..logical).step_by(2) {
            mask |= 1usize << i;
        }
        if mask == 0 {
            (1usize << logical.min(usize::BITS as usize - 1)) - 1
        } else {
            mask
        }
    }

    #[cfg(not(all(target_arch = "x86_64", target_os = "windows")))]
    {
        if logical >= usize::BITS as usize {
            usize::MAX
        } else {
            (1usize << logical) - 1
        }
    }
}

#[cfg(target_os = "windows")]
fn set_thread_affinity(mask: usize) -> Option<usize> {
    use windows::Win32::System::Threading::{GetCurrentThread, SetThreadAffinityMask};
    unsafe {
        let prev = SetThreadAffinityMask(GetCurrentThread(), mask);
        if prev != 0 {
            Some(prev)
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn performance_core_mask_is_nonzero() {
        let mask = performance_core_mask();
        assert!(mask > 0);
    }

    #[test]
    fn affinity_guard_can_be_instantiated_and_dropped() {
        let guard = pin_to_performance_cores();
        drop(guard);
    }
}
