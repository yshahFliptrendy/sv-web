#!/bin/bash
# Find and re-check sites that were missed in the first re-check

INPUT_FILE="c:/Users/yoges/source/repo/sv-web/scripts/non-shopify-sites.txt"
FOUND="c:/Users/yoges/source/repo/sv-web/scripts/new-shopify-found.txt"
CONFIRMED="c:/Users/yoges/source/repo/sv-web/scripts/confirmed-non-shopify.txt"
MISSING="c:/Users/yoges/source/repo/sv-web/scripts/missing-sites.txt"
TEMP_DIR=$(mktemp -d)
PARALLEL=5

# Find sites not in either result file
> "$MISSING"
while IFS='|' read -r brand url; do
  [ -z "$url" ] && continue
  if ! grep -qF "$brand" "$FOUND" 2>/dev/null && ! grep -qF "$brand" "$CONFIRMED" 2>/dev/null; then
    echo "${brand}|${url}" >> "$MISSING"
  fi
done < "$INPUT_FILE"

TOTAL=$(wc -l < "$MISSING" | tr -d ' ')
echo "Re-checking $TOTAL missing sites..."

check_shopify() {
  local brand="$1"
  local url="$2"
  local idx="$3"
  local temp_file="$TEMP_DIR/$idx.txt"

  RESULT=$(curl -sL --max-time 25 --retry 1 -o - "$url" 2>/dev/null | grep -ciE "cdn\.shopify\.com|myshopify\.com|Shopify\.theme|shopify-section|shopify\.com/s/files" 2>/dev/null)

  if [ "$RESULT" -gt 0 ] 2>/dev/null; then
    echo "SHOPIFY|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] SHOPIFY: ${brand}"
  else
    echo "OTHER|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] OTHER: ${brand}"
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
done < "$MISSING"

for pid in "${PIDS[@]}"; do
  wait "$pid"
done

# Append results
NEW_SHOPIFY=0
NEW_OTHER=0
for i in $(seq 1 $COUNT); do
  if [ -f "$TEMP_DIR/$i.txt" ]; then
    LINE=$(cat "$TEMP_DIR/$i.txt")
    TYPE=$(echo "$LINE" | cut -d'|' -f1)
    BRAND=$(echo "$LINE" | cut -d'|' -f2)
    URL=$(echo "$LINE" | cut -d'|' -f3)
    if [ "$TYPE" = "SHOPIFY" ]; then
      echo "${BRAND}|${URL}" >> "$FOUND"
      NEW_SHOPIFY=$((NEW_SHOPIFY + 1))
    else
      echo "${BRAND}|${URL}" >> "$CONFIRMED"
      NEW_OTHER=$((NEW_OTHER + 1))
    fi
  fi
done

rm -rf "$TEMP_DIR"

TOTAL_SHOPIFY=$(wc -l < "$FOUND" | tr -d ' ')
TOTAL_OTHER=$(wc -l < "$CONFIRMED" | tr -d ' ')

echo ""
echo "================================"
echo "This run: $NEW_SHOPIFY Shopify, $NEW_OTHER other"
echo "Cumulative new Shopify: $TOTAL_SHOPIFY"
echo "Cumulative non-Shopify: $TOTAL_OTHER"
echo "Total processed: $((TOTAL_SHOPIFY + TOTAL_OTHER))"
echo "Grand total Shopify (incl. original 58): $((TOTAL_SHOPIFY + 58))"
echo "================================"
