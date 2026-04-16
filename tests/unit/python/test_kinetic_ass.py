"""
Unit tests for execution/generate_kinetic_ass.py

Tests the pure-logic functions:
  - ms_to_ass(ms)           : milliseconds -> ASS timestamp
  - is_emphasis_word(...)    : emphasis detection heuristics
  - group_words(...)         : word grouping into display chunks
  - generate_ass(...)        : full ASS subtitle generation

No external binaries required (no FFmpeg, no Whisper, no Docker).
"""

import pytest
from generate_kinetic_ass import ms_to_ass, is_emphasis_word, group_words, generate_ass


# ---------------------------------------------------------------------------
# ms_to_ass
# ---------------------------------------------------------------------------
class TestMsToAss:
    """Convert milliseconds to ASS timestamp format H:MM:SS.cc"""

    def test_zero(self):
        assert ms_to_ass(0) == "0:00:00.00"

    def test_one_second(self):
        assert ms_to_ass(1000) == "0:00:01.00"

    def test_half_second(self):
        assert ms_to_ass(500) == "0:00:00.50"

    def test_one_minute(self):
        assert ms_to_ass(60000) == "0:01:00.00"

    def test_one_minute_one_second_half(self):
        assert ms_to_ass(61500) == "0:01:01.50"

    def test_one_hour(self):
        assert ms_to_ass(3600000) == "1:00:00.00"

    def test_complex_time(self):
        # 1h 1m 1s 230ms -> 1:01:01.23
        ms = 3600000 + 60000 + 1000 + 230
        assert ms_to_ass(ms) == "1:01:01.23"

    def test_centiseconds_rounding(self):
        # 999ms -> 0:00:00.99  (999 // 10 = 99)
        assert ms_to_ass(999) == "0:00:00.99"

    def test_single_digit_centiseconds(self):
        # 50ms -> 0:00:00.05  (50 // 10 = 5, zero-padded)
        assert ms_to_ass(50) == "0:00:00.05"

    def test_ten_ms(self):
        # 10ms -> 0:00:00.01
        assert ms_to_ass(10) == "0:00:00.01"

    def test_nine_ms(self):
        # 9ms -> 0:00:00.00  (9 // 10 = 0)
        assert ms_to_ass(9) == "0:00:00.00"

    def test_two_hours(self):
        assert ms_to_ass(7200000) == "2:00:00.00"

    def test_large_value(self):
        # 10 hours exactly
        assert ms_to_ass(36000000) == "10:00:00.00"

    def test_59_seconds_999ms(self):
        assert ms_to_ass(59999) == "0:00:59.99"

    def test_59_minutes_59_seconds(self):
        ms = 59 * 60000 + 59 * 1000
        assert ms_to_ass(ms) == "0:59:59.00"

    def test_negative_wraps(self):
        """Negative ms produces a nonsensical but deterministic result.
        The function uses int() which truncates toward zero, and modulus
        on negative numbers in Python returns a non-negative result."""
        # We just verify it does not raise an exception
        result = ms_to_ass(-1000)
        assert isinstance(result, str)

    def test_float_input(self):
        """Float input should still work via int() truncation."""
        result = ms_to_ass(1500.7)
        assert result == "0:00:01.50"


# ---------------------------------------------------------------------------
# is_emphasis_word
# ---------------------------------------------------------------------------
class TestIsEmphasisWord:
    """Detect words that should be emphasized (larger, colored)."""

    # -- Numbers and money --
    def test_plain_number(self):
        assert is_emphasis_word("500", 0, ["500"]) is True

    def test_dollar_amount(self):
        assert is_emphasis_word("$1,000", 0, ["$1,000"]) is True

    def test_dollar_sign_only(self):
        # "$" -> cleaned to "$" which has no alnum -> empty -> False
        # Actually re.sub removes non-alnum except $%, so "$" -> "$"
        # re.match(r"^\$?\d", "$") -> no digit after $ -> False
        assert is_emphasis_word("$", 0, ["$"]) is False

    def test_percentage(self):
        # "50%" -> cleaned to "50%" -> starts with digit -> True
        assert is_emphasis_word("50%", 0, ["50%"]) is True

    def test_number_in_sentence(self):
        words = ["about", "500", "people"]
        assert is_emphasis_word("500", 1, words) is True

    # -- ALL CAPS --
    def test_all_caps_three_chars(self):
        assert is_emphasis_word("NEVER", 0, ["NEVER"]) is True

    def test_all_caps_free(self):
        assert is_emphasis_word("FREE", 0, ["FREE"]) is True

    def test_all_caps_two_chars_too_short(self):
        # "OK" -> only 2 chars, below the 3-char threshold
        assert is_emphasis_word("OK", 0, ["OK"]) is False

    def test_mixed_case_not_all_caps(self):
        assert is_emphasis_word("Never", 0, ["Never"]) is True
        # "Never" -> cleaned "Never" -> not all caps -> not a number
        # but "never" IS in power_words -> True

    def test_all_caps_with_punctuation(self):
        # "STOP!" -> cleaned to "STOP" (4 chars, all caps) -> True
        assert is_emphasis_word("STOP!", 0, ["STOP!"]) is True

    # -- Word after negation --
    def test_word_after_not(self):
        words = ["not", "working"]
        assert is_emphasis_word("working", 1, words) is True

    def test_word_after_never(self):
        words = ["never", "again"]
        assert is_emphasis_word("again", 1, words) is True

    def test_word_after_dont(self):
        words = ["don't", "stop"]
        assert is_emphasis_word("stop", 1, words) is True

    def test_word_after_cant(self):
        words = ["can't", "believe"]
        assert is_emphasis_word("believe", 1, words) is True

    def test_word_after_without(self):
        words = ["without", "permission"]
        assert is_emphasis_word("permission", 1, words) is True

    def test_word_after_wont(self):
        words = ["won't", "happen"]
        assert is_emphasis_word("happen", 1, words) is True

    def test_word_after_isnt(self):
        words = ["isn't", "right"]
        assert is_emphasis_word("right", 1, words) is True

    def test_first_word_no_negation_check(self):
        """First word (index 0) cannot be preceded by a negation."""
        words = ["stop"]
        # "stop" is not a power word, not a number, not all-caps
        assert is_emphasis_word("stop", 0, words) is False

    # -- Power words --
    def test_power_word_secret(self):
        assert is_emphasis_word("secret", 0, ["secret"]) is True

    def test_power_word_shocking(self):
        assert is_emphasis_word("shocking", 0, ["shocking"]) is True

    def test_power_word_billion(self):
        assert is_emphasis_word("billion", 0, ["billion"]) is True

    def test_power_word_exactly(self):
        assert is_emphasis_word("exactly", 0, ["exactly"]) is True

    def test_power_word_everything(self):
        assert is_emphasis_word("everything", 0, ["everything"]) is True

    def test_power_word_nothing(self):
        assert is_emphasis_word("nothing", 0, ["nothing"]) is True

    def test_power_word_guaranteed(self):
        assert is_emphasis_word("guaranteed", 0, ["guaranteed"]) is True

    def test_power_word_case_insensitive(self):
        assert is_emphasis_word("Secret", 0, ["Secret"]) is True

    def test_power_word_with_trailing_punct(self):
        # "exposed." -> cleaned "exposed" -> in power words
        assert is_emphasis_word("exposed.", 0, ["exposed."]) is True

    # -- Normal words --
    def test_normal_word_the(self):
        assert is_emphasis_word("the", 0, ["the"]) is False

    def test_normal_word_and(self):
        assert is_emphasis_word("and", 0, ["and"]) is False

    def test_normal_word_because(self):
        assert is_emphasis_word("because", 0, ["because"]) is False

    def test_normal_word_it(self):
        assert is_emphasis_word("it", 0, ["it"]) is False

    def test_normal_word_with(self):
        assert is_emphasis_word("with", 0, ["with"]) is False

    # -- Edge cases --
    def test_empty_string(self):
        # "" -> cleaned "" -> empty -> False
        assert is_emphasis_word("", 0, [""]) is False

    def test_only_punctuation(self):
        # "..." -> cleaned "" -> empty -> False
        assert is_emphasis_word("...", 0, ["..."]) is False

    def test_last_word_in_list(self):
        words = ["the", "absolute", "truth"]
        assert is_emphasis_word("truth", 2, words) is True  # power word

    def test_negation_is_not_itself_emphasized(self):
        """'not' itself is not a power word or number."""
        words = ["not", "working"]
        assert is_emphasis_word("not", 0, words) is False


# ---------------------------------------------------------------------------
# group_words
# ---------------------------------------------------------------------------
class TestGroupWords:
    """Group words into display chunks of 3-5 words."""

    def _make_words(self, texts, emphasis_indices=None):
        """Helper to build word dicts from text list."""
        emphasis_indices = emphasis_indices or set()
        return [
            {"word": t, "emphasis": i in emphasis_indices,
             "start_ms": i * 500, "end_ms": (i + 1) * 500}
            for i, t in enumerate(texts)
        ]

    def test_empty_list(self):
        assert group_words([]) == []

    def test_single_word(self):
        words = self._make_words(["hello"])
        groups = group_words(words)
        assert len(groups) == 1
        assert len(groups[0]) == 1
        assert groups[0][0]["word"] == "hello"

    def test_exactly_max_per_group(self):
        words = self._make_words(["one", "two", "three", "four"])
        groups = group_words(words, max_per_group=4)
        assert len(groups) == 1
        assert len(groups[0]) == 4

    def test_splits_at_max(self):
        words = self._make_words(["a", "b", "c", "d", "e", "f", "g", "h"])
        groups = group_words(words, max_per_group=4)
        assert len(groups) == 2
        assert len(groups[0]) == 4
        assert len(groups[1]) == 4

    def test_splits_at_period(self):
        """Period at end of word triggers a new group."""
        words = self._make_words(["end.", "new", "start"])
        groups = group_words(words, max_per_group=10)
        # "end." is in group 1, then period triggers new group
        assert len(groups) == 2
        assert groups[0][0]["word"] == "end."
        assert groups[1][0]["word"] == "new"

    def test_splits_at_exclamation(self):
        words = self._make_words(["wow!", "that", "is"])
        groups = group_words(words, max_per_group=10)
        assert len(groups) == 2
        assert groups[0][0]["word"] == "wow!"

    def test_splits_at_question_mark(self):
        words = self._make_words(["really?", "yes", "indeed"])
        groups = group_words(words, max_per_group=10)
        assert len(groups) == 2

    def test_splits_at_comma_with_two_plus_words(self):
        """Comma/semicolon only triggers split if current group has >1 word."""
        words = self._make_words(["hello,", "world"])
        groups = group_words(words, max_per_group=10)
        # "hello," is 1 word -> comma check requires len(current) > 1
        # so no split after the first word alone
        assert len(groups) == 1

    def test_splits_at_comma_after_two_words(self):
        words = self._make_words(["first", "second,", "third"])
        groups = group_words(words, max_per_group=10)
        # After "second," len(current)==2 > 1, comma triggers split
        assert len(groups) == 2
        assert len(groups[0]) == 2
        assert groups[0][1]["word"] == "second,"

    def test_emphasis_word_starts_new_group(self):
        words = self._make_words(
            ["the", "absolute", "TRUTH", "is"],
            emphasis_indices={2}
        )
        groups = group_words(words, max_per_group=10)
        assert len(groups) == 2
        assert groups[0][-1]["word"] == "absolute"
        assert groups[1][0]["word"] == "TRUTH"

    def test_emphasis_at_start_no_split(self):
        """Emphasis on first word does not create an empty group."""
        words = self._make_words(["SECRET", "plan"], emphasis_indices={0})
        groups = group_words(words, max_per_group=10)
        assert len(groups) == 1
        assert groups[0][0]["word"] == "SECRET"

    def test_uneven_split(self):
        words = self._make_words(["a", "b", "c", "d", "e"])
        groups = group_words(words, max_per_group=3)
        assert len(groups) == 2
        assert len(groups[0]) == 3
        assert len(groups[1]) == 2

    def test_custom_max_per_group(self):
        words = self._make_words(["a", "b", "c", "d", "e", "f"])
        groups = group_words(words, max_per_group=2)
        assert len(groups) == 3
        for g in groups:
            assert len(g) == 2

    def test_multiple_sentences(self):
        words = self._make_words(["go.", "stop.", "wait."])
        groups = group_words(words, max_per_group=10)
        # Each period triggers a new group after the word
        assert len(groups) == 3

    def test_preserves_word_data(self):
        """All original word dict fields are preserved in groups."""
        words = [
            {"word": "hello", "emphasis": False, "start_ms": 0,
             "end_ms": 500, "extra_field": "keep_me"}
        ]
        groups = group_words(words)
        assert groups[0][0]["extra_field"] == "keep_me"

    def test_all_words_in_one_group_when_few(self):
        words = self._make_words(["one", "two", "three"])
        groups = group_words(words, max_per_group=4)
        assert len(groups) == 1
        assert len(groups[0]) == 3

    def test_semicolon_split_after_two_words(self):
        words = self._make_words(["first", "second;", "third"])
        groups = group_words(words, max_per_group=10)
        assert len(groups) == 2

    def test_em_dash_split_after_two_words(self):
        words = self._make_words(["first", "second\u2014", "third"])
        groups = group_words(words, max_per_group=10)
        # \u2014 is em-dash, matched by [,;:\u2014]
        assert len(groups) == 2


# ---------------------------------------------------------------------------
# generate_ass (integration of the above)
# ---------------------------------------------------------------------------
class TestGenerateAss:
    """Test the full ASS generation pipeline with minimal inputs."""

    def test_empty_word_timings(self):
        result = generate_ass({}, [])
        assert "[Script Info]" in result
        assert "[Events]" in result
        # No dialogue lines
        assert "Dialogue:" not in result

    def test_single_scene_single_word(self):
        word_timings = {
            "1": {
                "words": [
                    {"word": "hello", "start_ms": 0, "end_ms": 500}
                ]
            }
        }
        scenes_data = [
            {"scene_number": 1, "start_time_ms": 0}
        ]
        result = generate_ass(word_timings, scenes_data)
        assert "Dialogue:" in result
        assert "hello" in result

    def test_emphasis_word_gets_yellow_color(self):
        word_timings = {
            "1": {
                "words": [
                    {"word": "$500", "start_ms": 0, "end_ms": 500}
                ]
            }
        }
        scenes_data = [
            {"scene_number": 1, "start_time_ms": 0}
        ]
        result = generate_ass(word_timings, scenes_data)
        # YELLOW = "&H0000D7FF"
        assert "&H0000D7FF" in result

    def test_normal_word_gets_white_color(self):
        word_timings = {
            "1": {
                "words": [
                    {"word": "the", "start_ms": 0, "end_ms": 500}
                ]
            }
        }
        scenes_data = [
            {"scene_number": 1, "start_time_ms": 0}
        ]
        result = generate_ass(word_timings, scenes_data)
        # WHITE = "&H00FFFFFF"
        assert "&H00FFFFFF" in result

    def test_scene_offset_applied(self):
        """Words in a later scene get offset by scene start_time_ms."""
        word_timings = {
            "2": {
                "words": [
                    {"word": "test", "start_ms": 0, "end_ms": 500}
                ]
            }
        }
        scenes_data = [
            {"scene_number": 1, "start_time_ms": 0},
            {"scene_number": 2, "start_time_ms": 60000}  # 1 minute offset
        ]
        result = generate_ass(word_timings, scenes_data)
        # The dialogue start should reflect the 60s offset -> "0:01:00.00"
        assert "0:01:00.00" in result

    def test_caption_highlight_word_overrides(self):
        """Scene's caption_highlight_word forces emphasis on matching words."""
        word_timings = {
            "1": {
                "words": [
                    {"word": "the", "start_ms": 0, "end_ms": 300},
                    {"word": "ordinary", "start_ms": 300, "end_ms": 800}
                ]
            }
        }
        scenes_data = [
            {"scene_number": 1, "start_time_ms": 0,
             "caption_highlight_word": "ordinary"}
        ]
        result = generate_ass(word_timings, scenes_data)
        # "ordinary" should get emphasis treatment (yellow color)
        assert "&H0000D7FF" in result

    def test_multiple_scenes_sorted(self):
        """Scenes are processed in numeric order regardless of dict key order."""
        word_timings = {
            "3": {
                "words": [{"word": "third", "start_ms": 0, "end_ms": 500}]
            },
            "1": {
                "words": [{"word": "first", "start_ms": 0, "end_ms": 500}]
            }
        }
        scenes_data = [
            {"scene_number": 1, "start_time_ms": 0},
            {"scene_number": 3, "start_time_ms": 5000}
        ]
        result = generate_ass(word_timings, scenes_data)
        # Both words should appear
        assert "first" in result
        assert "third" in result
        # "first" should come before "third" in the output
        first_pos = result.index("first")
        third_pos = result.index("third")
        assert first_pos < third_pos

    def test_empty_words_scene_skipped(self):
        """Scene with empty words list produces no dialogue."""
        word_timings = {
            "1": {"words": []}
        }
        scenes_data = [{"scene_number": 1, "start_time_ms": 0}]
        result = generate_ass(word_timings, scenes_data)
        assert "Dialogue:" not in result

    def test_scene_not_found_uses_zero_offset(self):
        """If scene_number is not in scenes_data, offset defaults to 0."""
        word_timings = {
            "99": {
                "words": [{"word": "orphan", "start_ms": 1000, "end_ms": 1500}]
            }
        }
        scenes_data = [{"scene_number": 1, "start_time_ms": 5000}]
        result = generate_ass(word_timings, scenes_data)
        assert "orphan" in result
        # Should use 0 offset, so start at 1000ms = 0:00:01.00
        assert "0:00:01.00" in result

    def test_header_format(self):
        """Verify the ASS header structure."""
        result = generate_ass({}, [])
        assert "ScriptType: v4.00+" in result
        assert "PlayResX: 1920" in result
        assert "PlayResY: 1080" in result
        assert "Style: Default" in result
        assert "Style: Emphasis" in result
        assert "Format: Layer, Start, End" in result

    def test_word_escaping(self):
        """Curly braces in words should be escaped."""
        word_timings = {
            "1": {
                "words": [
                    {"word": "{test}", "start_ms": 0, "end_ms": 500}
                ]
            }
        }
        scenes_data = [{"scene_number": 1, "start_time_ms": 0}]
        result = generate_ass(word_timings, scenes_data)
        # The word should appear with escaped braces
        assert "\\{test\\}" in result

    def test_fade_tags_present(self):
        """Each dialogue line should have fade in/out tags."""
        word_timings = {
            "1": {
                "words": [{"word": "hello", "start_ms": 0, "end_ms": 500}]
            }
        }
        scenes_data = [{"scene_number": 1, "start_time_ms": 0}]
        result = generate_ass(word_timings, scenes_data)
        assert "\\fad(80,150)" in result

    def test_pop_in_animation_tags(self):
        """Words should have scale bounce animation tags."""
        word_timings = {
            "1": {
                "words": [{"word": "bounce", "start_ms": 0, "end_ms": 500}]
            }
        }
        scenes_data = [{"scene_number": 1, "start_time_ms": 0}]
        result = generate_ass(word_timings, scenes_data)
        # Normal word: scale 100 -> 115 -> 100
        assert "\\fscx115" in result
        assert "\\fscy115" in result
