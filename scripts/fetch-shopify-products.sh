#!/bin/bash
# Fetch product listings from all Shopify stores via /products.json

INPUT_FILE="c:/Users/yoges/source/repo/sv-web/scripts/all-shopify-sites.txt"
OUTPUT_DIR="c:/Users/yoges/source/repo/sv-web/scripts/shopify-products"
SUMMARY_FILE="c:/Users/yoges/source/repo/sv-web/scripts/shopify-products-summary.txt"
TEMP_DIR=$(mktemp -d)
PARALLEL=10

mkdir -p "$OUTPUT_DIR"
> "$SUMMARY_FILE"

TOTAL=$(wc -l < "$INPUT_FILE" | tr -d ' ')
echo "Fetching products from $TOTAL Shopify stores (parallel=$PARALLEL)..."

fetch_products() {
  local brand="$1"
  local url="$2"
  local idx="$3"
  local temp_file="$TEMP_DIR/$idx.txt"

  # Normalize URL - remove trailing slash, add /products.json
  url="${url%/}"
  local products_url="${url}/products.json?limit=250"

  # Fetch products.json
  local response=$(curl -sL --max-time 30 --retry 1 \
    -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
    -o - -w "\n%{http_code}" "$products_url" 2>/dev/null)

  local http_code=$(echo "$response" | tail -1)
  local body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ] && echo "$body" | grep -q '"products"'; then
    # Count products and extract titles
    local count=$(echo "$body" | grep -oE '"title"\s*:\s*"[^"]*"' | head -250 | wc -l)
    # Extract product titles to a file
    local safe_brand=$(echo "$brand" | sed 's/[^a-zA-Z0-9]/_/g')
    echo "$body" | grep -oE '"title"\s*:\s*"[^"]*"' | sed 's/"title"\s*:\s*"//;s/"$//' > "$OUTPUT_DIR/${safe_brand}.txt"

    # Check if there might be more pages (if we got exactly 250)
    local page=2
    local total_count=$count
    while [ "$count" -ge 250 ] && [ "$page" -le 20 ]; do
      local next_url="${url}/products.json?limit=250&page=${page}"
      local next_response=$(curl -sL --max-time 30 \
        -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
        -o - "$next_url" 2>/dev/null)

      if echo "$next_response" | grep -q '"products"'; then
        count=$(echo "$next_response" | grep -oE '"title"\s*:\s*"[^"]*"' | wc -l)
        if [ "$count" -gt 0 ]; then
          echo "$next_response" | grep -oE '"title"\s*:\s*"[^"]*"' | sed 's/"title"\s*:\s*"//;s/"$//' >> "$OUTPUT_DIR/${safe_brand}.txt"
          total_count=$((total_count + count))
        fi
      else
        break
      fi
      page=$((page + 1))
    done

    echo "OK|${brand}|${total_count}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] ${brand}: ${total_count} products"
  elif [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
    echo "DENIED|${brand}|0|${url}|HTTP ${http_code}" > "$temp_file"
    echo "[$idx/$TOTAL] ${brand}: ACCESS DENIED (${http_code})"
  elif [ "$http_code" = "404" ]; then
    echo "NOT_FOUND|${brand}|0|${url}|HTTP 404" > "$temp_file"
    echo "[$idx/$TOTAL] ${brand}: products.json not found"
  else
    echo "ERROR|${brand}|0|${url}|HTTP ${http_code}" > "$temp_file"
    echo "[$idx/$TOTAL] ${brand}: ERROR (HTTP ${http_code})"
  fi
}

COUNT=0
PIDS=()

while IFS='|' read -r brand url; do
  [ -z "$url" ] && continue
  COUNT=$((COUNT + 1))

  fetch_products "$brand" "$url" "$COUNT" &
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

# Combine results and summarize
TOTAL_PRODUCTS=0
OK_COUNT=0
DENIED_COUNT=0
NOTFOUND_COUNT=0
ERROR_COUNT=0

for i in $(seq 1 $COUNT); do
  if [ -f "$TEMP_DIR/$i.txt" ]; then
    LINE=$(cat "$TEMP_DIR/$i.txt")
    echo "$LINE" >> "$SUMMARY_FILE"
    STATUS=$(echo "$LINE" | cut -d'|' -f1)
    PROD_COUNT=$(echo "$LINE" | cut -d'|' -f3)
    case "$STATUS" in
      OK) OK_COUNT=$((OK_COUNT + 1)); TOTAL_PRODUCTS=$((TOTAL_PRODUCTS + PROD_COUNT)) ;;
      DENIED) DENIED_COUNT=$((DENIED_COUNT + 1)) ;;
      NOT_FOUND) NOTFOUND_COUNT=$((NOTFOUND_COUNT + 1)) ;;
      ERROR) ERROR_COUNT=$((ERROR_COUNT + 1)) ;;
    esac
  fi
done

rm -rf "$TEMP_DIR"

echo ""
echo "============================================"
echo "SHOPIFY PRODUCT FETCH RESULTS:"
echo "============================================"
echo "  Successful: $OK_COUNT stores"
echo "  Access Denied: $DENIED_COUNT stores"
echo "  Not Found: $NOTFOUND_COUNT stores"
echo "  Errors: $ERROR_COUNT stores"
echo "  Total Products Found: $TOTAL_PRODUCTS"
echo "============================================"
echo "Product lists saved to: $OUTPUT_DIR/"
echo "Summary saved to: $SUMMARY_FILE"
echo "============================================"
