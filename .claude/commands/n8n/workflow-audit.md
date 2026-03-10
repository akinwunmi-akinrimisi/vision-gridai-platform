Analyze the n8n workflow at the given URL or JSON file. For each node:
1. Check if credentials are properly referenced (no hardcoded keys)
2. Verify error handling (continueOnFail or error outputs)
3. Check HTTP Request nodes use correct Supabase REST API patterns
4. Verify self-chaining: does the workflow fire the next workflow on completion?
5. Check progress tracking: does it write status updates to Supabase after each operation?
6. Verify checkpoint/resume: can this workflow resume from where it left off?

Report issues by priority (P0 = breaks pipeline, P1 = data loss risk, P2 = optimization).
