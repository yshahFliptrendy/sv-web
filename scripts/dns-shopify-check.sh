#!/bin/bash
# Check non-Shopify sites via DNS lookup for Shopify IPs

INPUT_FILE="c:/Users/yoges/source/repo/sv-web/scripts/confirmed-non-shopify.txt"
DNS_SHOPIFY="c:/Users/yoges/source/repo/sv-web/scripts/dns-shopify-found.txt"
DNS_OTHER="c:/Users/yoges/source/repo/sv-web/scripts/dns-confirmed-non-shopify.txt"
TEMP_DIR=$(mktemp -d)
PARALLEL=15

> "$DNS_SHOPIFY"
> "$DNS_OTHER"

TOTAL=$(wc -l < "$INPUT_FILE" | tr -d ' ')
echo "DNS-checking $TOTAL sites for Shopify IPs..."

# Known Shopify IP ranges
# 23.227.38.x, 23.227.39.x, 23.236.x.x, 104.154.x.x etc.
# Also check reverse DNS for myshopify.com or shopify.com

check_dns() {
  local brand="$1"
  local url="$2"
  local idx="$3"
  local temp_file="$TEMP_DIR/$idx.txt"

  # Extract domain from URL
  local domain=$(echo "$url" | sed 's|https\?://||;s|/.*||;s|:.*||')

  # DNS lookup - check if IP resolves to shopify
  local ip=$(nslookup "$domain" 2>/dev/null | grep -A1 "Name:" | grep "Address:" | head -1 | awk '{print $2}')

  if [ -z "$ip" ]; then
    echo "OTHER|${brand}|${url}" > "$temp_file"
    return
  fi

  # Reverse DNS lookup
  local rdns=$(nslookup "$ip" 2>/dev/null | grep "Name:" | head -1 | awk '{print $2}')

  # Check CNAME for shopify
  local cname=$(nslookup -type=CNAME "$domain" 2>/dev/null | grep -i "canonical\|shopify" | head -1)

  if echo "$rdns" | grep -qi "shopify\|myshopify"; then
    echo "SHOPIFY|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] SHOPIFY (rdns): ${brand} -> ${ip} -> ${rdns}"
  elif echo "$cname" | grep -qi "shopify\|myshopify"; then
    echo "SHOPIFY|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] SHOPIFY (cname): ${brand} -> ${cname}"
  elif echo "$ip" | grep -qE "^23\.227\.(38|39)\.|^23\.236\."; then
    echo "SHOPIFY|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] SHOPIFY (ip): ${brand} -> ${ip}"
  else
    echo "OTHER|${brand}|${url}" > "$temp_file"
  fi
}

COUNT=0
PIDS=()

while IFS='|' read -r brand url; do
  [ -z "$url" ] && continue
  COUNT=$((COUNT + 1))

  check_dns "$brand" "$url" "$COUNT" &
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
      echo "${BRAND}|${URL}" >> "$DNS_SHOPIFY"
      SHOPIFY_COUNT=$((SHOPIFY_COUNT + 1))
    else
      echo "${BRAND}|${URL}" >> "$DNS_OTHER"
      OTHER_COUNT=$((OTHER_COUNT + 1))
    fi
  fi
done

rm -rf "$TEMP_DIR"

# Now combine all shopify lists into final
FINAL="c:/Users/yoges/source/repo/sv-web/scripts/all-shopify-sites.txt"
cat c:/Users/yoges/source/repo/sv-web/scripts/shopify-sites.txt \
    c:/Users/yoges/source/repo/sv-web/scripts/new-shopify-found.txt \
    "$DNS_SHOPIFY" | sort -u > "$FINAL"

FINAL_COUNT=$(wc -l < "$FINAL" | tr -d ' ')

echo ""
echo "================================"
echo "DNS CHECK RESULTS:"
echo "New Shopify found via DNS: $SHOPIFY_COUNT"
echo "Confirmed non-Shopify: $OTHER_COUNT"
echo ""
echo "GRAND TOTAL SHOPIFY: $FINAL_COUNT"
echo "GRAND TOTAL NON-SHOPIFY: $(wc -l < "$DNS_OTHER" | tr -d ' ')"
echo "================================"
