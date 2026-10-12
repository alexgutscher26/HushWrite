#include "ggml.h"
#include "ime_kernels.h"

#include <algorithm>
#include <cmath>

// clang-format off
#if defined(__GNUC__)
#pragma GCC diagnostic ignored "-Woverlength-strings"
#pragma GCC diagnostic ignored "-Wcast-qual"
#pragma GCC diagnostic ignored "-Wunused-parameter"
#endif
// clang-format on
namespace sqnbitgemm_spacemit_ime {

#define QUANTIZEM4ROW_KERNEL                           \
    "vmv.s.x            v16, zero                \\n\\t" \
    "vfabs.v            v8, v0                   \\n\\t" \
    "vfredmax.vs        v16, v8, v16             \\n\\t" \
    "vfmv.f.s           f10, v16                 \\n\\t" \
    "fmul.s             f10, f10, %[RMAXREC]     \\n\\t" \
    "fsw                f10, (a1)                \\n\\t" \
    "fdiv.s             f11, %[FONE], f10        \\n\\t" \
    "vfmul.vf           v16, v0, f11             \\n\\t" \
    "vfcvt.x.f.v        v16, v16                 \\n\\t" \
    "vsetvli            t0, zero, e16, mf2       \\n\\t" \
    "vnclip.wx          v16, v16, zero           \\n\\t" \
    "vnclip.wx          v17, v17, zero           \\n\\t" \
    "vnclip.wx          v18, v18, zero           \\n\\t" \
    "vnclip.wx          v19, v19, zero           \\n\\t" \
    "vnclip.wx          v20, v20, zero           \\n\\t" \
    "vnclip.wx          v21, v21, zero           \\n\\t" \
    "vnclip.wx          v22, v22, zero           \\n\\t" \
    "vnclip.wx          v23, v23, zero           \\n\\t" \
    "vsetvli            t0, zero, e8, mf4        \\n\\t" \
    "vnclip.wx          v24, v16, zero           \\n\\t" \
    "vnclip.wx          v25, v17, zero           \\n\\t" \
    "vnclip.wx          v26, v18, zero           \\n\\t" \
    "vnclip.wx          v27, v19, zero           \\n\\t" \
    "vnclip.wx          v28, v20, zero           \\n\\t" \
    "vnclip.wx          v29, v21, zero           \\n\\t" \
    "vnclip.wx          v30, v22, zero           \\n\\t" \
    "vnclip.wx          v31, v23, zero           \\n\\t"

#define QUANTIZEM4ROW_STORE                            \
    "addi               t1, %[BlkLen], 0         \\n\\t" \
    "vsetvli            t0, t1, e8, mf4          \\n\\t" \
    "vse8.v             v24, (s1)                \\n\\t" \
    "addi               s1, s1, 32               \\n\\t" \
    "sub                t1, t1, t0               \\n\\t" \
    "vsetvli            t0, t1, e8, mf4          \\n\\t" \
    "vse8.v             v25, (s1)                \\n\\t" \
    "addi               s1, s1, 32               \\n\\t" \
    "sub                t1, t1, t0               \\n\\t" \
    "vsetvli            t0, t1, e8, mf4          \\n\\t" \
    "vse8.v             v26, (s1)                \\n\\t" \
    "addi               s1, s1, 32               \\n\\t" \
    "sub                t1, t1, t0               \\n\\t" \
    "vsetvli            t0, t1, e8, mf4          \\n\\t" \
    "vse8.v             v27, (s1)                \\n\\t" \
    "addi               s1, s1, 32               \\n\\t" \
    "sub                t1, t1, t0               \\n\\t" \
    "vsetvli            t0, t1, e8, mf4          \\n\\t" \
    "vse8.v             v28, (s1)                \\n\\t" \
    "addi               s1, s1, 32               \\n\\t" \
    "sub                t1, t1, t0               \\n\\t" \
    "vsetvli            t0, t1, e8, mf4          \\n\\t" \
    "vse8.v             v29, (s1)                \\n\\t" \
    "addi               s1, s1, 32               \\n\\t" \
    "sub                t1, t1, t0               \\n\\t" \
    "vsetvli            t0, t1, e8, mf4          \\n\\t" \
    "vse8.v             v30, (s1)                \\n\\t" \
    "addi               s1, s1, 32               \\n\\t" \
    "sub                t1, t1, t0               \\n\\t" \
    "vsetvli            t0, t1, e8, mf4          \\n\\t" \
    "vse8.v             v31, (s1)                \\n\\t"

namespace ime1 {
void quantize_a_4row_i8(size_t BlkLen, const float * A, size_t CountK, std::byte * QuantA) {
    constexpr float range_max_reciprocal = 1.0f / ((1 << 7) - 1);
    const float     fone                 = 1.0f;

    if (BlkLen == 16 || BlkLen == 32 || BlkLen == 64) {
        for (size_t row_index = 0; row_index < 4; ++row_index) {
            const float * SRC = A + row_index * CountK;
            std::byte *   DST = QuantA + row_index * sizeof(float);

            const size_t offset = (4 - row_index) * 4 + row_index * 8;
            const size_t stride = 4 * (sizeof(float) + BlkLen);
            __asm__ volatile(
                "vsetvli            t0, zero, e32, m8        \\n\\t"
                "addi               t2, %[CountK], 0         \\n\\t"
                "addi               a1, %[DST], 0            \\n\\t"
                "blt                t2, %[BlkLen], TAIL%=    \\n\\t"

                "LOOP%=:                                     \\n\\t"
                "vsetvli            t0, %[BlkLen], e32, m8   \\n\\t"
                "vle32.v            v0, (%[SRC])             \\n\\t"
                "sub                t2, t2, t0               \\n\\t"
                "slli               t1, t0, 2                \\n\\t"
                "add                %[SRC], %[SRC], t1       \\n\\t"
                "add                s1, a1, %[OFFSET]        \\n\\t"

                QUANTIZEM4ROW_KERNEL QUANTIZEM4ROW_STORE

                "add                a1, a1, %[STRIDE]        \\n\\t"
                "bge                t2, %[BlkLen], LOOP%=    \\n\\t"

                "TAIL%=:                                     \\n\\t"
                "blez               t2, QUIT%=               \\n\\t"
                "vsetvli            t0, zero, e32, m8        \\n\\t"
                "vxor.vv            v16, v16, v16            \\n\\t"
                "vxor.vv            v24, v24, v24            \\n\\t"
                "vsetvli            t0, t2, e32, m8          \\n\\t"
                "vle32.v            v0, (%[SRC])             \\n\\t"
                "add                s1, a1, %[OFFSET]        \\n\\t"

                QUANTIZEM4ROW_KERNEL

                "addi               t3, %[BlkLen], 0         \\n\\t"
                "addi               s2, s1, 0                \\n\\t"
                "vsetvli            t0, zero, e8, mf4        \\n\\t"
                "vxor.vv            v8, v8, v8               \\n\\t"
                "SET_ZERO%=:                                 \\n\\t"
                "vse8.v             v8, (s2)                 \\n\\t"
                "addi               s2, s2, 32               \\n\\t"
                "addi               t3, t3, -8               \\n\\t"
                "bnez               t3, SET_ZERO%=           \\n\\t"

                QUANTIZEM4ROW_STORE

                "QUIT%=:                                     \\n\\t"
                : [SRC] "+r"(SRC)
                : [DST] "r"(DST), [BlkLen] "r"(BlkLen), [OFFSET] "r"(offset), [STRIDE] "r"(stride),
                  [CountK] "r"(CountK), [FONE] "f"(fone), [RMAXREC] "f"(range_max_reciprocal)
                : "cc", "t0", "t1", "t2", "t3", "a1", "s1", "s2", "f10", "f11");
        }
    } else if (BlkLen == 128) {
        for (size_t row_index = 0; row_index < 4; ++row_index) {
            const float * SRC = A + row_index * CountK;
            // Row stride: 4 * (float max scale + BlkLen). Use stride instead of
            // sizeof(float) because QuantA is a raw byte buffer, not float*.
            // Each row must write to a distinct region to avoid overlapping writes
            // in the quantized output buffer (PR #19: code scanning alert #27).
            const size_t  stride = 4 * (sizeof(float) + BlkLen);
            std::byte *   DST    = QuantA + row_index * stride;

            const size_t offset = (4 - row_index) * 4 + row_index * 8;
            __asm__ volatile(
                "vsetvli            t0, zero, e32, m8        \\n\\t"
                "li                 t6, 32                   \\n\\t"
                "addi               t2, %[CountK], 0         \\n\\t"
                "addi               a1, %[DST], 0            \\n\\t"
                "add                s1, a1, %[OFFSET]        \\n\\t"
                "blt                t2, %[BlkLen], TAIL%=    \\n\\t"

                "LOOP%=:                                     \\n\\t"
                "vsetvli            t0, zero, e32, m8        \\n\\t"
                "vle32.v            v0, (%[SRC])             \\n\\t"
                "addi               %[SRC], %[SRC], 256      \\n\\t"
                "vle32.v            v8, (%[SRC])             \\n\\t"
                "addi               %[SRC], %[SRC], 256      \\n\\t"
                "addi               t2, t2, -128             \\n\\t"

                "QUANTIZE%=:                                 \\n\\t"
                "add                s1, a1, %[OFFSET]        \\n\\t"
                "vfabs.v            v16, v0                  \\n\\t"
                "vfabs.v            v24, v8                  \\n\\t"
                "vfmax.vv           v16, v24, v16            \\n\\t"
                "vfredmax.vs        v24, v16, v24            \\n\\t"
                "vfmv.f.s           f10, v24                 \\n\\t"
                "fmul.s             f10, f10, %[RMAXREC]     \\n\\t"
                "fsw                f10, (a1)                \\n\\t"
                "fdiv.s             f11, %[FONE], f10        \\n\\t"
                "vfmul.vf           v16, v0, f11             \\n\\t"
                "vfmul.vf           v24, v8, f11             \\n\\t"
                "vfcvt.x.f.v        v16, v16                 \\n\\t"
                "vfcvt.x.f.v        v24, v24                 \\n\\t"
                "vsetvli            t0, zero, e16, m4        \\n\\t"
                "vnclip.wx          v16, v16, zero           \\n\\t"
                "vnclip.wx          v20, v24, zero           \\n\\t"
                "vsetvli            t0, zero, e8, m4         \\n\\t"
                "vnclip.wx          v16, v16, zero           \\n\\t"
                "vsetvli            t0, zero, e64, m4        \\n\\t"
                "vsse64.v           v16, (s1), t6            \\n\\t"
                "add                a1, a1, %[STRIDE]        \\n\\t"
                "bge                t2, %[BlkLen], LOOP%=    \\n\\t"

                "TAIL%=:                                     \\n\\t"
                "blez               t2, QUIT%=               \\n\\t"
                "vsetvli            t0, zero, e32, m8        \\n\\t"
                "vxor.vv             v0, v0, v0              \\n\\t"
                "vxor.vv             v8, v8, v8              \\n\\t"
                "vxor.vv             v16, v16, v16           \\n\\t"
                "vxor.vv             v24, v24, v24           \\n\\t"
                "vsetvli            t0, t2, e32, m8          \\n\\t"
                "sub                t2, t2, t0               \\n\\t"
                "vle32.v            v0, (%[SRC])             \\n\\t"
                "addi               %[SRC], %[SRC], 256      \\n\\t"
                "vsetvli            t0, t2, e32, m8          \\n\\t"
                "vle32.v            v8, (%[SRC])             \\n\\t"
                "sub                t2, t2, t2               \\n\\t"
                "vsetvli            t0, zero, e32, m8        \\n\\t"
                "jal                x0, QUANTIZE%=           \\n\\t"

                "QUIT%=:                                     \\n\\t"
                : [SRC] "+r"(SRC)
                : [DST] "r"(DST), [BlkLen] "r"(BlkLen), [OFFSET] "r"(offset), [STRIDE] "r"(stride),
                  [CountK] "r"(CountK), [FONE] "f"(fone), [RMAXREC] "f"(range_max_reciprocal)
                : "cc", "t0", "t1", "t2", "t6", "a1", "s1", "s2", "f10", "f11");
        }
    } else if (BlkLen == 256) {
        for (size_t row_index = 0; row_index < 4; ++row_index) {
            const float * SRC    = A + row_index * CountK;
            // Row stride: 4 * (float max scale + BlkLen). Use stride instead of
            // sizeof(float) because QuantA is a raw byte buffer, not float*.
            // Each row must write to a distinct region to avoid overlapping writes
            // in the quantized output buffer (PR #19: code scanning alert #27).
            const size_t  stride = 4 * (sizeof(float) + BlkLen);
            std::byte *   DST    = QuantA + row_index * stride;
            const size_t  offset = (4 - row_index) * 4 + row_index * 8;
            __asm__ volatile(
                "vsetvli            t0, zero, e32, m8        \\n\\t"
                "li                 t6, 32                   \\n\\t"
                "addi               t2, %[CountK], 0         \\n\\t"
                "addi               a1, %[DST], 0            \\n\\t"
                "add                s1, a1, %[OFFSET]        \\n\\t"
                "blt                t2, %[BlkLen], TAIL%=    \\n\\t"

                "LOOP%=:                                     \\n\\t"
                "vsetvli            t0, zero, e32, m8        \\n\\t"
                "vle32.v            v0, (%[SRC])             \\n\\t"
                "addi               %[SRC], %[SRC], 256      \\n\\t"
                "vle32.v            v8, (%[SRC])             \\n\\t"
                "addi               %[SRC], %[SRC], 256      \\n\\t"
                "vle32.v            v16, (%[SRC])            \\n\\t"
                "addi               %[SRC], %[SRC], 256      \\n\\t"
                "vle32.v            v24, (%[SRC])            \\n\\t"
                "addi               %[SRC], %[SRC], -768     \\n\\t"
                "addi               t2, t2, -256             \\n\\t"
                "vfabs.v            v0, v0                   \\n\\t"
                "vfabs.v            v8, v8                   \\n\\t"
                "vfabs.v            v16, v16                 \\n\\t"
                "vfabs.v            v24, v24                 \\n\\t"
                "vfmax.vv           v8, v0, v8               \\n\\t"
                "vfmax.vv           v24, v24, v16            \\n\\t"
                "vfmax.vv           v8, v8, v24              \\n\\t"
                "vfredmax.vs        v24, v8, v24             \\n\\t"
                "vfmv.f.s           f10, v24                 \\n\\t"
                "vle32.v            v0, (%[SRC])             \\n\\t"
                "addi               %[SRC], %[SRC], 256      \\n\\t"
                "vle32.v            v8, (%[SRC])             \\n\\t"
                "addi               %[SRC], %[SRC], 256      \\n\\t"
                "vle32.v            v16, (%[SRC])            \\n\\t"
                "addi               %[SRC], %[SRC], 256      \\n\\t"
                "vle32.v            v24, (%[SRC])            \\n\\t"
                "addi               %[SRC], %[SRC], 256      \\n\\t"

                "QUANTIZE%=:                                 \\n\\t"
                "add                s1, a1, %[OFFSET]        \\n\\t"
                "fmul.s             f10, f10, %[RMAXREC]     \\n\\t"
                "fsw                f10, (a1)                \\n\\t"
                "fdiv.s             f11, %[FONE], f10        \\n\\t"
                "vfmul.vf           v0, v0, f11              \\n\\t"
                "vfmul.vf           v8, v8, f11              \\n\\t"
                "vfmul.vf           v16, v16, f11            \\n\\t"
                "vfmul.vf           v24, v24, f11            \\n\\t"
                "vfcvt.x.f.v        v0, v0                   \\n\\t"
                "vfcvt.x.f.v        v8, v8                   \\n\\t"
                "vfcvt.x.f.v        v16, v16                 \\n\\t"
                "vfcvt.x.f.v        v24, v24                 \\n\\t"
                "vsetvli            t0, zero, e16, m4        \\n\\t"
                "vnclip.wx          v0, v0, zero             \\n\\t"
                "vnclip.wx          v4, v8, zero             \\n\\t"
                "vnclip.wx          v8, v16, zero            \\n\\t"
                "vnclip.wx          v12, v24, zero           \\n\\t"
                "vsetvli            t0, zero, e8, m4         \\n\\t"
                "vnclip.wx          v0, v0, zero             \\n\\t"
                "vnclip.wx          v4, v8, zero             \\n\\t"
                "vsetvli            t0, zero, e64, m8        \\n\\t"
                "vsse64.v           v0, (s1), t6             \\n\\t"
                "add                a1, a1, %[STRIDE]        \\n\\t"
                "bge                t2, %[BlkLen], LOOP%=    \\n\\t"

                "TAIL%=:                                     \\n\\t"
                "blez               t2, QUIT%=               \\n\\t"
                "vsetvli            t0, zero, e32, m8        \\n\\t"
                "vxor.vv            v0, v0, v0               \\n\\t"
                "vxor.vv            v8, v8, v8               \\n\\t"
                "vxor.vv            v16, v16, v16            \\n\\t"
                "vxor.vv            v24, v24, v24            \\n\\t"
                "addi               t1, t2, 0                \\n\\t"
                "vsetvli            t0, t1, e32, m8          \\n\\t"
                "sub                t1, t1, t0               \\n\\t"
                "vle32.v            v0, (%[SRC])             \\n\\t"
                "addi               %[SRC], %[SRC], 256      \\n\\t"
                "vsetvli            t0, t1, e32, m8          \\n\\t"
                "sub                t1, t1, t0               \\n\\t"
                "vle32.v            v8, (%[SRC])             \\n\\t"
                "addi               %[SRC], %[SRC], 256      \\n\\t"
                "vsetvli            t0, t1, e32, m8          \\n\\t"
                "sub                t1, t1, t0               \\n\\t"
                "vle32.v            v16, (%[SRC])            \\n\\t"
                "addi               %[SRC], %[SRC], 256      \\n\\t"
                "vsetvli            t0, t1, e32, m8          \\n\\t"
                "vle32.v            v24, (%[SRC])            \\n\\t"
                "addi               %[SRC], %[SRC], -768     \\n\\t"
                "vsetvli            t0, zero, e32, m8        \\n\\t"
                "vfabs.v            v0, v0                   \\n\\t"
                "vfabs.v            v8, v8                   \\n\\t"
                "vfabs.v            v16, v16                 \\n\\t"
                "vfabs.v            v24, v24                 \\n\\t"
                "vfmax.vv           v8, v0, v8               \\n\\t"
                "vfmax.vv           v24, v16, v24            \\n\\t"
                "vfmax.vv           v8, v8, v24              \\n\\t"
                "vfredmax.vs        v24, v8, v24             \\n\\t"
                "vfmv.f.s           f10, v24                 \\n\\t"
                "add                s1, a1, %[OFFSET]        \\n\\t"
                "fmul.s             f10, f10, %[RMAXREC]     \\n\\t"
                "fsw                f10, (a1)                \\n\\t"
                "fdiv.s             f11, %[FONE], f10        \\n\\t"
                "vsetvli            t0, zero, e64, m8        \\n\\t"
                "vxor.vv            v0, v0, v0               \\n\\t"
                "vsse64.v           v0, (s1), t6             \\n\\t"

                "TAIL_LOOP%=:                                \\n\\t"
                "vsetvli            t0, zero, e32, m4        \\n\\t"
                "vxor.vv            v0, v0, v0               \\n\\t"
                "vsetvli            t0, t2, e32, m1          \\n\\t"
                "sub                t2, t2, t0               \\n\\t"
                "vle32.v            v0, (%[SRC])             \\n\\t"
                "addi               %[SRC], %[SRC], 32       \\n\\t"
                "vfmul.vf           v1, v0, f11              \\n\\t"
                "vfcvt.x.f.v        v2, v1                   \\n\\t"
                "vsetvli            t0, zero, e16, mf2       \\n\\t"
                "vnclip.wx          v3, v2, zero             \\n\\t"
                "vsetvli            t0, zero, e8, mf4        \\n\\t"
                "vnclip.wx          v3, v3, zero             \\n\\t"
                "vse8.v             v3, (s1)                 \\n\\t"
                "addi               s1, s1, 32               \\n\\t"
                "bnez               t2, TAIL_LOOP%=          \\n\\t"

                "QUIT%=:                                     \\n\\t"
                : [SRC] "+r"(SRC)
                : [DST] "r"(DST), [BlkLen] "r"(BlkLen), [OFFSET] "r"(offset), [STRIDE] "r"(stride),
                  [CountK] "r"(CountK), [FONE] "f"(fone), [RMAXREC] "f"(range_max_reciprocal)
                : "cc", "t0", "t1", "t2", "t6", "a1", "s1", "s2", "f10", "f11");
        }
    }
}

void quantize_a_row_i8(size_t BlkLen, const float * A, size_t CountK, std::byte * QuantA) {
    const float *   SRC                  = A;
    std::byte *     DST                  = QuantA;
    constexpr float range_max_reciprocal = 1.0f / ((1 << 7) - 1);
    const float     fone                 = 1.0f;
    std::byte *   \n… truncated 156765 more characters