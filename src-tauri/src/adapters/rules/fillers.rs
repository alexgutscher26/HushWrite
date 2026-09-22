/*!
 * SOURCE OF TRUTH KEYWORDS: strip_fillers, FILLERS, fillers_for_language
 * WHAT:  Language-specific filler word stripping.
 * WHERE: Consumed by adapters/rules/mod.rs and text.rs.
 */

use std::collections::HashMap;
use std::sync::LazyLock;

use super::dictionary::replace_whole_words;
use super::whitespace::normalise_whitespace;
use crate::types::LanguageCode;

const ENGLISH_FILLERS: &[&str] = &[
    "um",
    "uh",
    "erm",
    "hmm",
    "mhm",
    "uhh",
    "umm",
    "er",
    "ah",
    "like",
    "you know",
    "i mean",
    "sort of",
    "kind of",
    "basically",
    "literally",
    "actually",
];

const SPANISH_FILLERS: &[&str] = &[
    "este", "eh", "em", "o sea", "bueno", "sabes", "tipo", "pues", "digamos", "en plan",
    "es decir", "ajá", "a ver",
];

const FRENCH_FILLERS: &[&str] = &[
    "euh",
    "ben",
    "bah",
    "genre",
    "tu sais",
    "du coup",
    "en fait",
    "enfin",
    "voilà",
    "c'est-à-dire",
    "écoute",
    "quoi",
];

const GERMAN_FILLERS: &[&str] = &[
    "äh",
    "ähm",
    "halt",
    "quasi",
    "sozusagen",
    "weißt du",
    "also",
    "na ja",
    "tja",
    "eigentlich",
    "irgendwie",
];

const ITALIAN_FILLERS: &[&str] = &[
    "ehm",
    "ecco",
    "cioè",
    "tipo",
    "sai",
    "diciamo",
    "praticamente",
    "nel senso",
    "allora",
    "guarda",
];

const PORTUGUESE_FILLERS: &[&str] = &[
    "é",
    "né",
    "tipo",
    "tipo assim",
    "sabe",
    "então",
    "ou seja",
    "quer dizer",
    "ahem",
    "humm",
    "pronto",
    "pá",
];

const JAPANESE_FILLERS: &[&str] = &[
    "えーと",
    "あの",
    "その",
    "ええと",
    "まあ",
    "なんか",
    "というか",
    "ほら",
];

const CHINESE_FILLERS: &[&str] = &[
    "那个", "就是", "然后", "呃", "啊", "嗯", "这个", "那啥", "嗱", "即係",
];

const RUSSIAN_FILLERS: &[&str] = &[
    "э-э",
    "ну",
    "типа",
    "как бы",
    "значит",
    "короче",
    "в общем",
    "слушай",
    "понимаешь",
];

const DUTCH_FILLERS: &[&str] = &[
    "eh",
    "ehm",
    "nou",
    "zeg maar",
    "weet je",
    "eigenlijk",
    "gewoon",
    "dus",
];

const KOREAN_FILLERS: &[&str] = &["그", "저", "어", "음", "그니까", "있잖아", "뭐지"];

const ARABIC_FILLERS: &[&str] = &["يعني", "أمم", "إيه", "طيب", "يعني زي", "فاهم"];

const HINDI_FILLERS: &[&str] = &["मतलब", "यानी", "जैसे कि", "अरे", "अच्छा", "हाँ"];

const POLISH_FILLERS: &[&str] = &["no", "wiesz", "znaczy", "jakby", "w sumie", "yyy", "eee"];

const TURKISH_FILLERS: &[&str] = &["şey", "yani", "ııı", "falan", "mesela", "hani", "öhm"];

const SWEDISH_FILLERS: &[&str] = &[
    "eh",
    "öh",
    "liksom",
    "typ",
    "alltså",
    "vet du",
    "så att säga",
];

pub fn fillers_for_language(language: Option<&LanguageCode>) -> Option<&'static [&'static str]> {
    let lang = language?.as_str();
    let prefix = lang.split(['-', '_']).next().unwrap_or(lang);
    match prefix {
        "en" => Some(ENGLISH_FILLERS),
        "es" => Some(SPANISH_FILLERS),
        "fr" => Some(FRENCH_FILLERS),
        "de" => Some(GERMAN_FILLERS),
        "it" => Some(ITALIAN_FILLERS),
        "pt" => Some(PORTUGUESE_FILLERS),
        "ja" => Some(JAPANESE_FILLERS),
        "zh" | "yue" => Some(CHINESE_FILLERS),
        "ru" => Some(RUSSIAN_FILLERS),
        "nl" => Some(DUTCH_FILLERS),
        "ko" => Some(KOREAN_FILLERS),
        "ar" => Some(ARABIC_FILLERS),
        "hi" => Some(HINDI_FILLERS),
        "pl" => Some(POLISH_FILLERS),
        "tr" => Some(TURKISH_FILLERS),
        "sv" => Some(SWEDISH_FILLERS),
        _ => None,
    }
}

/**
 * SOURCE OF TRUTH KEYWORDS: fillers_sorted_for_language, pipeline caching
 * WHAT:  The language's filler list pre-sorted longest-first, built once per
 *        process.
 * WHY:   strip_fillers runs on every chunk and used to clone + sort its table
 *        each call — work whose answer never changes for a static list. The
 *        sorted Vecs are leaked at LazyLock init (a handful of pointers, one
 *        time) so they are 'static and the lookup is a map hit.
 * WHERE: strip_fillers; the language dispatch mirrors fillers_for_language
 *        exactly, so the two can only drift if a language is added to one and
 *        not the other — kept adjacent on purpose.
 */
fn fillers_sorted_for_language(
    language: Option<&LanguageCode>,
) -> Option<&'static [&'static str]> {
    static SORTED: LazyLock<HashMap<&'static str, &'static [&'static str]>> = LazyLock::new(|| {
        let tables: &[(&str, &[&str])] = &[
            ("en", ENGLISH_FILLERS),
            ("es", SPANISH_FILLERS),
            ("fr", FRENCH_FILLERS),
            ("de", GERMAN_FILLERS),
            ("it", ITALIAN_FILLERS),
            ("pt", PORTUGUESE_FILLERS),
            ("ja", JAPANESE_FILLERS),
            ("zh", CHINESE_FILLERS),
            ("yue", CHINESE_FILLERS),
            ("ru", RUSSIAN_FILLERS),
            ("nl", DUTCH_FILLERS),
            ("ko", KOREAN_FILLERS),
            ("ar", ARABIC_FILLERS),
            ("hi", HINDI_FILLERS),
            ("pl", POLISH_FILLERS),
            ("tr", TURKISH_FILLERS),
            ("sv", SWEDISH_FILLERS),
        ];
        tables
            .iter()
            .map(|(code, table)| {
                let mut sorted: Vec<&str> = table.to_vec();
                sorted.sort_by_key(|f| std::cmp::Reverse(f.len()));
                (*code, &*Box::leak(sorted.into()))
            })
            .collect()
    });

    let lang = language?.as_str();
    let prefix = lang.split(['-', '_']).next().unwrap_or(lang);
    SORTED.get(prefix).copied()
}

pub fn is_cjk(language: Option<&LanguageCode>) -> bool {
    language
        .map(|l| {
            let code = l.as_str();
            code.starts_with("zh") || code.starts_with("ja") || code.starts_with("yue")
        })
        .unwrap_or(false)
}

/**
 * WHAT:  Removes filler words.
 * WHY:   Whole-word and case-insensitive. Off by default in settings.
 */
pub fn strip_fillers(text: &str, language: Option<&LanguageCode>) -> String {
    // The sorted view, not the raw table: same order the per-call sort used
    // to produce, minus the clone-and-sort on every chunk.
    let Some(fillers) = fillers_sorted_for_language(language) else {
        return text.to_string();
    };

    let mut out = text.to_string();
    let cjk = is_cjk(language);
    for filler in fillers {
        if cjk {
            out = out.replace(filler, "");
        } else {
            out = replace_whole_words(&out, filler, "", false, true);
        }
    }
    normalise_whitespace(&out)
}

#[cfg(test)]
mod tests {
    use super::*;

    /**
     * WHAT:  The sorted cache is the raw table, longest first, for every
     *        language both dispatchers know.
     * WHY:   The cache mirrors fillers_for_language's match by hand, so a
     *        language added to one and not the other — or a list edited
     *        without the cache noticing — would change filler removal only
     *        through the cached path. Sorting both sides the same way makes
     *        the assertion exact.
     */
    #[test]
    fn the_sorted_filler_table_is_the_raw_table_longest_first() {
        for language in [
            "en", "es", "fr", "de", "it", "pt", "ja", "zh", "yue", "ru", "nl", "ko", "ar",
            "hi", "pl", "tr", "sv",
        ] {
            let code = LanguageCode(language.into());
            let raw = fillers_for_language(Some(&code)).expect(language);
            let sorted = fillers_sorted_for_language(Some(&code)).expect(language);
            let mut expected: Vec<&str> = raw.to_vec();
            expected.sort_by_key(|f| std::cmp::Reverse(f.len()));
            assert_eq!(sorted.to_vec(), expected, "cache drifted for {language}");
        }
    }
}
