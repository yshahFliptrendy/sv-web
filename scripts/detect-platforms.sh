#!/bin/bash
# Detect web platform for non-Shopify sites

INPUT_FILE="c:/Users/yoges/source/repo/sv-web/scripts/dns-confirmed-non-shopify.txt"
OUTPUT_FILE="c:/Users/yoges/source/repo/sv-web/scripts/platform-results.txt"
TEMP_DIR=$(mktemp -d)
PARALLEL=15

> "$OUTPUT_FILE"

TOTAL=$(wc -l < "$INPUT_FILE" | tr -d ' ')
echo "Detecting platforms for $TOTAL sites (parallel=$PARALLEL)..."

detect_platform() {
  local brand="$1"
  local url="$2"
  local idx="$3"
  local temp_file="$TEMP_DIR/$idx.txt"

  # Fetch with browser UA, follow redirects
  local content=$(curl -sL --max-time 20 --retry 1 \
    -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
    -o - "$url" 2>/dev/null)

  if [ -z "$content" ]; then
    echo "UNKNOWN|${brand}|${url}|No response" > "$temp_file"
    echo "[$idx/$TOTAL] UNKNOWN (no response): ${brand}"
    return
  fi

  # Check for various platforms
  # WooCommerce (WordPress + WooCommerce plugin)
  if echo "$content" | grep -qiE "woocommerce|wc-block|wp-content.*woocommerce"; then
    echo "WOOCOMMERCE|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] WOOCOMMERCE: ${brand}"
  # WordPress (without WooCommerce)
  elif echo "$content" | grep -qiE "wp-content|wp-includes|wordpress"; then
    echo "WORDPRESS|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] WORDPRESS: ${brand}"
  # Magento
  elif echo "$content" | grep -qiE "magento|mage-|Magento_|/static/version"; then
    echo "MAGENTO|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] MAGENTO: ${brand}"
  # BigCommerce
  elif echo "$content" | grep -qiE "bigcommerce|stencil-utils|BigCommerce"; then
    echo "BIGCOMMERCE|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] BIGCOMMERCE: ${brand}"
  # Salesforce Commerce Cloud / Demandware
  elif echo "$content" | grep -qiE "demandware|salesforce.*commerce|dw\.ac|sfcc"; then
    echo "SFCC|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] SFCC: ${brand}"
  # Squarespace
  elif echo "$content" | grep -qiE "squarespace|sqsp"; then
    echo "SQUARESPACE|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] SQUARESPACE: ${brand}"
  # Wix
  elif echo "$content" | grep -qiE "wix\.com|wixstatic|X-Wix"; then
    echo "WIX|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] WIX: ${brand}"
  # Sitecore
  elif echo "$content" | grep -qiE "sitecore|sc_site"; then
    echo "SITECORE|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] SITECORE: ${brand}"
  # PrestaShop
  elif echo "$content" | grep -qiE "prestashop|PrestaShop"; then
    echo "PRESTASHOP|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] PRESTASHOP: ${brand}"
  # Volusion
  elif echo "$content" | grep -qiE "volusion"; then
    echo "VOLUSION|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] VOLUSION: ${brand}"
  # 3dcart / Shift4Shop
  elif echo "$content" | grep -qiE "3dcart|shift4shop"; then
    echo "SHIFT4SHOP|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] SHIFT4SHOP: ${brand}"
  # Webflow
  elif echo "$content" | grep -qiE "webflow\.com|wf-page"; then
    echo "WEBFLOW|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] WEBFLOW: ${brand}"
  # Adobe Commerce / AEM
  elif echo "$content" | grep -qiE "adobe.*commerce|aem-|experience-manager"; then
    echo "ADOBE|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] ADOBE: ${brand}"
  # Drupal
  elif echo "$content" | grep -qiE "drupal|Drupal\.settings"; then
    echo "DRUPAL|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] DRUPAL: ${brand}"
  # Craft CMS
  elif echo "$content" | grep -qiE "craft-cms|craftcms"; then
    echo "CRAFTCMS|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] CRAFTCMS: ${brand}"
  # Contentful
  elif echo "$content" | grep -qiE "contentful"; then
    echo "CONTENTFUL|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] CONTENTFUL: ${brand}"
  # Next.js / Vercel
  elif echo "$content" | grep -qiE "__next|_next/static|__NEXT_DATA__"; then
    echo "NEXTJS|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] NEXTJS: ${brand}"
  # Gatsby
  elif echo "$content" | grep -qiE "gatsby|___gatsby"; then
    echo "GATSBY|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] GATSBY: ${brand}"
  # Cloudflare-blocked (403/409)
  elif echo "$content" | grep -qiE "cloudflare|cf-browser-verification|challenge-platform"; then
    echo "CLOUDFLARE_BLOCKED|${brand}|${url}" > "$temp_file"
    echo "[$idx/$TOTAL] CLOUDFLARE_BLOCKED: ${brand}"
  else
    echo "UNKNOWN|${brand}|${url}" > "$temp_file"
  fi
}

COUNT=0
PIDS=()

while IFS='|' read -r brand url; do
  [ -z "$url" ] && continue
  COUNT=$((COUNT + 1))

  detect_platform "$brand" "$url" "$COUNT" &
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

# Combine and summarize
declare -A COUNTS
for i in $(seq 1 $COUNT); do
  if [ -f "$TEMP_DIR/$i.txt" ]; then
    LINE=$(cat "$TEMP_DIR/$i.txt")
    echo "$LINE" >> "$OUTPUT_FILE"
    TYPE=$(echo "$LINE" | cut -d'|' -f1)
    COUNTS[$TYPE]=$(( ${COUNTS[$TYPE]:-0} + 1 ))
  fi
done

rm -rf "$TEMP_DIR"

echo ""
echo "============================================"
echo "PLATFORM DETECTION RESULTS:"
echo "============================================"
for platform in $(echo "${!COUNTS[@]}" | tr ' ' '\n' | sort); do
  echo "  $platform: ${COUNTS[$platform]}"
done
echo "============================================"
echo "Total: $COUNT"
echo "Results saved to: $OUTPUT_FILE"
echo "============================================"
