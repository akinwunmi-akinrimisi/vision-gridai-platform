#!/usr/bin/env python3
"""
Seed script for migration 007 — Grand Master Prompts Integration.
Reads both Grand Master Prompt files, extracts each section,
and inserts 8 rows into the system_prompts table via psql.
"""

import json
import subprocess
import sys
import os

# ── File paths ────────────────────────────────────────────────────────────────
# Script lives in supabase/ subdirectory; prompts are in parent project root
BASE        = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE)
TOPIC_GEN_FILE  = os.path.join(PROJECT_ROOT, "Grand_Master_Prompt_Topic_Generator_v3.md")
SCRIPT_GEN_FILE = os.path.join(PROJECT_ROOT, "Grand_Master_Prompt_Script_Generator_v1.md")

def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

# ── Section extractors ────────────────────────────────────────────────────────

def extract_code_block(text, start_marker, end_marker="```"):
    """Extract text between the first ``` after start_marker and the next ```."""
    idx = text.find(start_marker)
    if idx == -1:
        raise ValueError(f"Marker not found: {start_marker!r}")
    fence_start = text.find("```", idx)
    if fence_start == -1:
        raise ValueError(f"No opening ``` found after: {start_marker!r}")
    # Skip the opening fence line (may have language tag like ```json)
    content_start = text.find("\n", fence_start) + 1
    fence_end = text.find("\n```", content_start)
    if fence_end == -1:
        raise ValueError(f"No closing ``` found after: {start_marker!r}")
    return text[content_start:fence_end].strip()


def build_topic_generator_prompt(topic_gen_text):
    """Full topic generator doc + JSON output instruction appended."""
    json_instruction = """
IMPORTANT: Return your output as a valid JSON object with this structure:
{
  "playlists": [
    {
      "playlist_title": "...",
      "playlist_theme": "...",
      "topics": [
        {
          "topic_number": 1,
          "subtopic": "The YouTube title...",
          "core_domain_framework": "...",
          "primary_problem_trigger": "...",
          "target_audience_segment": "...",
          "audience_avatar": "2-3 sentence character sketch...",
          "psychographics": "...",
          "key_emotional_drivers": "emotion1, emotion2, emotion3...",
          "video_style_structure": "...",
          "content_angle_blue_ocean": "...",
          "viewer_search_intent": "...",
          "practical_takeaways": "takeaway1; takeaway2; takeaway3..."
        }
      ]
    }
  ]
}
No markdown. No commentary. Valid JSON only."""
    return topic_gen_text.strip() + "\n" + json_instruction.strip()


def extract_system_prompt(script_gen_text):
    """§3 — the code block."""
    return extract_code_block(script_gen_text, "## §3 — SYSTEM PROMPT")


def extract_pass1_prompt(script_gen_text):
    """§4 — Prompt Template code block."""
    return extract_code_block(script_gen_text, "## §4 — PASS 1: FOUNDATION")


def extract_pass2_prompt(script_gen_text):
    """§5 — Prompt Template code block."""
    return extract_code_block(script_gen_text, "## §5 — PASS 2: DEPTH")


def extract_pass3_prompt(script_gen_text):
    """§6 — Prompt Template code block."""
    return extract_code_block(script_gen_text, "## §6 — PASS 3: RESOLUTION")


def extract_evaluator_prompt(script_gen_text):
    """§7 — Evaluator Prompt Template code block."""
    return extract_code_block(script_gen_text, "## §7 — QUALITY EVALUATOR")


def extract_retry_template(script_gen_text):
    """§8.2 — Retry Injection Template code block."""
    return extract_code_block(script_gen_text, "### 8.2 Retry Injection Template")


def extract_metadata_extractor(script_gen_text):
    """§9.3 — Summary Extraction Prompt code block."""
    return extract_code_block(script_gen_text, "### 9.3 Summary Extraction Prompt")


# ── SQL generation ────────────────────────────────────────────────────────────

def escape_sql_string(s):
    """Escape a string for use in a PostgreSQL dollar-quoted literal isn't needed
    because we use dollar-quoting, but we do need to escape the $$ delimiter if
    present in the text. We use a unique tag to avoid clashes."""
    # Use a tag that is very unlikely to appear in prompt text
    return s


def build_sql(rows):
    """Build the INSERT SQL using dollar-quoting per row."""
    parts = []
    parts.append("-- Seed: 8 rows into system_prompts")
    parts.append("-- Uses ON CONFLICT DO UPDATE to be idempotent")
    parts.append("")

    for row in rows:
        prompt_type = row["prompt_type"]
        prompt_text = row["prompt_text"]
        description = row["description"]
        version     = row["version"]

        # Use $BODY$...$BODY$ dollar-quoting to avoid ALL escaping issues
        # But if the text itself contains $BODY$, fall back to a numbered tag
        tag = "BODY"
        if f"${tag}$" in prompt_text:
            tag = "PROMPT007"
        if f"${tag}$" in prompt_text:
            tag = "GRANDMASTER007"

        sql = f"""INSERT INTO system_prompts (prompt_type, prompt_text, version, is_active, description)
VALUES (
  '{prompt_type}',
  ${tag}${prompt_text}${tag}$,
  {version},
  true,
  '{description.replace("'", "''")}'
)
ON CONFLICT (prompt_type) DO UPDATE
  SET prompt_text = EXCLUDED.prompt_text,
      version     = system_prompts.version + 1,
      updated_at  = now();
"""
        parts.append(sql)

    return "\n".join(parts)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("Reading Grand Master Prompt files...")
    topic_gen_text  = read_file(TOPIC_GEN_FILE)
    script_gen_text = read_file(SCRIPT_GEN_FILE)
    print(f"  Topic Generator: {len(topic_gen_text):,} chars")
    print(f"  Script Generator: {len(script_gen_text):,} chars")

    print("\nExtracting sections...")

    rows = []

    # 1. topic_generator_master
    topic_gen_prompt = build_topic_generator_prompt(topic_gen_text)
    rows.append({
        "prompt_type": "topic_generator_master",
        "prompt_text": topic_gen_prompt,
        "description": "Grand Master Topic Generator v3.0 — full document + JSON output instruction",
        "version": 1,
    })
    print(f"  [1] topic_generator_master: {len(topic_gen_prompt):,} chars")

    # 2. script_system_prompt
    sys_prompt = extract_system_prompt(script_gen_text)
    rows.append({
        "prompt_type": "script_system_prompt",
        "prompt_text": sys_prompt,
        "description": "Script Generator v1.0 §3 — system role prompt injected into all 3 passes",
        "version": 1,
    })
    print(f"  [2] script_system_prompt: {len(sys_prompt):,} chars")

    # 3. script_pass1
    pass1 = extract_pass1_prompt(script_gen_text)
    rows.append({
        "prompt_type": "script_pass1",
        "prompt_text": pass1,
        "description": "Script Generator v1.0 §4 — Pass 1 Foundation prompt template",
        "version": 1,
    })
    print(f"  [3] script_pass1: {len(pass1):,} chars")

    # 4. script_pass2
    pass2 = extract_pass2_prompt(script_gen_text)
    rows.append({
        "prompt_type": "script_pass2",
        "prompt_text": pass2,
        "description": "Script Generator v1.0 §5 — Pass 2 Depth prompt template",
        "version": 1,
    })
    print(f"  [4] script_pass2: {len(pass2):,} chars")

    # 5. script_pass3
    pass3 = extract_pass3_prompt(script_gen_text)
    rows.append({
        "prompt_type": "script_pass3",
        "prompt_text": pass3,
        "description": "Script Generator v1.0 §6 — Pass 3 Resolution prompt template",
        "version": 1,
    })
    print(f"  [5] script_pass3: {len(pass3):,} chars")

    # 6. script_evaluator
    evaluator = extract_evaluator_prompt(script_gen_text)
    rows.append({
        "prompt_type": "script_evaluator",
        "prompt_text": evaluator,
        "description": "Script Generator v1.0 §7 — Quality Evaluator prompt template",
        "version": 1,
    })
    print(f"  [6] script_evaluator: {len(evaluator):,} chars")

    # 7. script_retry_template
    retry_tmpl = extract_retry_template(script_gen_text)
    rows.append({
        "prompt_type": "script_retry_template",
        "prompt_text": retry_tmpl,
        "description": "Script Generator v1.0 §8.2 — Retry injection template",
        "version": 1,
    })
    print(f"  [7] script_retry_template: {len(retry_tmpl):,} chars")

    # 8. script_metadata_extractor
    meta_extractor = extract_metadata_extractor(script_gen_text)
    rows.append({
        "prompt_type": "script_metadata_extractor",
        "prompt_text": meta_extractor,
        "description": "Script Generator v1.0 §9.3 — Summary extraction prompt for Pass 3 context",
        "version": 1,
    })
    print(f"  [8] script_metadata_extractor: {len(meta_extractor):,} chars")

    # Build SQL
    sql = build_sql(rows)
    sql_path = os.path.join(PROJECT_ROOT, "supabase", "migrations", "007_seed_system_prompts.sql")
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"\nSQL written to: {sql_path}")
    print(f"Total SQL size: {len(sql):,} chars")

    return sql_path, rows


if __name__ == "__main__":
    sql_path, rows = main()
    print("\nDone. To apply:")
    print(f"  python3 {__file__}")
    print("  Then SCP + apply via SSH.")
