# Remotion Hybrid Rendering — skills.sh Merge Sections

---

## >>>> ADD: After Section 5 (Topic Intelligence checks) <<<<

```bash
# ─── 6. REMOTION HYBRID RENDERING CHECKS ────────────────────
echo ""
echo "▶ Remotion Hybrid Rendering..."

# Check Remotion installed
if [ -f "dashboard/node_modules/.package-lock.json" ] && grep -q "remotion" dashboard/package.json 2>/dev/null; then
    REMOTION_VER=$(cd dashboard && npx remotion --version 2>/dev/null || echo "unknown")
    echo "  ✅ Remotion: $REMOTION_VER"
else
    echo "  ⚠️  Remotion not in dashboard dependencies. Run: cd dashboard && npm install remotion @remotion/cli"
fi

# Check render service
RENDER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/health 2>/dev/null || echo "000")
if [ "$RENDER_STATUS" = "200" ]; then
    echo "  ✅ Remotion render service: running on :3100"
else
    echo "  ⚠️  Remotion render service not running (HTTP $RENDER_STATUS). Start with: node dashboard/src/remotion/render-service.js"
fi

# Check template directory
TEMPLATE_COUNT=$(find dashboard/src/remotion/templates -name "*.jsx" 2>/dev/null | wc -l)
if [ "$TEMPLATE_COUNT" -ge 12 ]; then
    echo "  ✅ Remotion templates: $TEMPLATE_COUNT found"
elif [ "$TEMPLATE_COUNT" -gt 0 ]; then
    echo "  ⚠️  Remotion templates: only $TEMPLATE_COUNT of 12 built"
else
    echo "  ❌ No Remotion templates found at dashboard/src/remotion/templates/"
fi

# Check remotion_templates table seeded
TEMPLATE_DB=$(curl -s "${SUPABASE_URL}/rest/v1/remotion_templates?select=template_key&limit=20" \
    -H "apikey: ${SUPABASE_ANON_KEY:-none}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY:-none}" 2>/dev/null || echo "error")
if echo "$TEMPLATE_DB" | grep -q "stat_callout"; then
    SEED_COUNT=$(echo "$TEMPLATE_DB" | grep -o "template_key" | wc -l)
    echo "  ✅ remotion_templates seeded: $SEED_COUNT templates"
else
    echo "  ❌ remotion_templates not seeded — run migration 005"
fi

# Check classification fields on scenes
CLASS_CHECK=$(curl -s "${SUPABASE_URL}/rest/v1/scenes?select=render_method,remotion_template&limit=1" \
    -H "apikey: ${SUPABASE_ANON_KEY:-none}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY:-none}" 2>/dev/null || echo "error")
if echo "$CLASS_CHECK" | grep -q "render_method"; then
    echo "  ✅ Classification fields present on scenes table"
else
    echo "  ❌ Classification fields missing — run migration 005"
fi
```
