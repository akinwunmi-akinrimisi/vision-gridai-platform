Generate the correct n8n HTTP Request node configuration for a Supabase query.
Input: describe what data you need (e.g., "all scenes for topic X where audio_status is pending")
Output: Complete HTTP Request node config with URL, headers, query parameters, and body.

Rules:
- Use PostgREST filter syntax: eq., neq., gt., lt., in., is., like.
- Always include apikey and Authorization headers
- For INSERT: use Prefer: return=representation to get the created row back
- For UPDATE: use PATCH, not PUT. Filter with ?id=eq.{{id}}
- For bulk reads: add &order=scene_number.asc and &limit=1000
