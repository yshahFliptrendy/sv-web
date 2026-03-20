#!/bin/bash
# Re-check non-shopify sites with lower parallelism and longer timeout

INPUT_FILE="c:/Users/yoges/source/repo/sv-web/scripts/non-shopify-sites.txt"
NEW_SHOPIFY="c:/Users/yoges/source/repo/sv-web/scripts/new-shopify-found.txt"
STILL_OTHER="c:/Users/yoges/source/repo/sv-web/scripts/confirmed-non-shopify.txt"
TEMP_DIR=$(mktemp -d)
PARALLEL=10

> "$NEW_SHOPIFY"
> "$STILL_OTHER"

TOTAL=$(wc -l < "$INPUT_FILE" | tr -d ' ')
echo "Re-checking $TOTAL non-Shopify sites (parallel=$PARALLEL, timeout=20s)..."

check_shopify() {
  local brand="$1"
  local url="$2"
  local idx="$3"
  local temp_file="$TEMP_DIR/$idx.txt"

  # Follow redirects, longer timeout, retry once
  RESULT=$(curl -sL --max-time 20 --retry 1 -o - "$url" 2>/dev/null | grep -ciE "cdn\.shopify\.com|myshopify\.com|Shopify\.theme|shopify-section|shopify\.com/s/files" 2>/dev/null)

  if [ "$RESULT" -gt 0 ] 2>/dev/null; then
    echo "SHOPIFY|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] SHOPIFY: ${brand} (${url})"
  else
    echo "OTHER|${brand}|${url}" > "$temp_file"
  fi
}

COUNT=0
PIDS=()

while IFS='|' read -r brand url; do
  [ -z "$url" ] && continue
  COUNT=$((COUNT + 1))

  check_shopify "$brand" "$url" "$COUNT" &
  PIDS+=($!)

  if [ ${#PIDS[@]} -ge $PARALLEL ]; then
    for pid in "${PIDS[@]}"; do
      wait "$pid"
    done
    PIDS=()
  fi

done < "$INPUT_FILE"

for pid in "${PIDS[@]}"; do
  wait "$pid"
done

# Combine results
SHOPIFY_COUNT=0
OTHER_COUNT=0
for i in $(seq 1 $COUNT); do
  if [ -f "$TEMP_DIR/$i.txt" ]; then
    LINE=$(cat "$TEMP_DIR/$i.txt")
    TYPE=$(echo "$LINE" | cut -d'|' -f1)
    BRAND=$(echo "$LINE" | cut -d'|' -f2)
    URL=$(echo "$LINE" | cut -d'|' -f3)
    if [ "$TYPE" = "SHOPIFY" ]; then
      echo "${BRAND}|${URL}" >> "$NEW_SHOPIFY"
      SHOPIFY_COUNT=$((SHOPIFY_COUNT + 1))
    else
      echo "${BRAND}|${URL}" >> "$STILL_OTHER"
      OTHER_COUNT=$((OTHER_COUNT + 1))
    fi
  fi
done

rm -rf "$TEMP_DIR"

echo ""
echo "================================"
echo "RE-CHECK RESULTS:"
echo "Newly found Shopify sites: $SHOPIFY_COUNT"
echo "Confirmed non-Shopify: $OTHER_COUNT"
echo "Previously found Shopify: 58"
echo "TOTAL Shopify: $((SHOPIFY_COUNT + 58))"
echo "================================"
echo "New Shopify list: $NEW_SHOPIFY"
echo "Confirmed non-Shopify: $STILL_OTHER"
