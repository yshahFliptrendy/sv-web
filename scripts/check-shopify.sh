#!/bin/bash
# Check which official sites are Shopify websites

INPUT_FILE="c:/Users/yoges/source/repo/sv-web/scripts/official-site-links.txt"
SHOPIFY_FILE="c:/Users/yoges/source/repo/sv-web/scripts/shopify-sites.txt"
NON_SHOPIFY_FILE="c:/Users/yoges/source/repo/sv-web/scripts/non-shopify-sites.txt"
TEMP_DIR=$(mktemp -d)
PARALLEL=20

> "$SHOPIFY_FILE"
> "$NON_SHOPIFY_FILE"

TOTAL=$(grep -cv "NOT_FOUND" "$INPUT_FILE")
echo "Checking $TOTAL sites for Shopify..."

check_shopify() {
  local brand="$1"
  local url="$2"
  local idx="$3"
  local temp_file="$TEMP_DIR/$idx.txt"

  # Follow redirects, check for shopify indicators
  RESULT=$(curl -sL --max-time 15 -o - "$url" 2>/dev/null | grep -ci "cdn\.shopify\.com\|myshopify\.com\|Shopify\.theme\|shopify-section\|shopify\.com/s/files" 2>/dev/null)

  if [ "$RESULT" -gt 0 ] 2>/dev/null; then
    echo "SHOPIFY|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] SHOPIFY: ${brand} (${url})"
  else
    echo "OTHER|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] OTHER: ${brand}"
  fi
}

COUNT=0
PIDS=()

while IFS='|' read -r brand url; do
  [ -z "$url" ] && continue
  [ "$url" = "NOT_FOUND" ] && continue

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
for i in $(seq 1 $COUNT); do
  if [ -f "$TEMP_DIR/$i.txt" ]; then
    LINE=$(cat "$TEMP_DIR/$i.txt")
    TYPE=$(echo "$LINE" | cut -d'|' -f1)
    BRAND=$(echo "$LINE" | cut -d'|' -f2)
    URL=$(echo "$LINE" | cut -d'|' -f3)
    if [ "$TYPE" = "SHOPIFY" ]; then
      echo "${BRAND}|${URL}" >> "$SHOPIFY_FILE"
    else
      echo "${BRAND}|${URL}" >> "$NON_SHOPIFY_FILE"
    fi
  fi
done

rm -rf "$TEMP_DIR"

SHOPIFY_COUNT=$(wc -l < "$SHOPIFY_FILE" | tr -d ' ')
OTHER_COUNT=$(wc -l < "$NON_SHOPIFY_FILE" | tr -d ' ')
echo ""
echo "================================"
echo "RESULTS:"
echo "Shopify sites: $SHOPIFY_COUNT"
echo "Non-Shopify sites: $OTHER_COUNT"
echo "================================"
echo "Shopify list: $SHOPIFY_FILE"
echo "Non-Shopify list: $NON_SHOPIFY_FILE"
