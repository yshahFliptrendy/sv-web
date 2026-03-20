#!/bin/bash
# Crawl all cruelty-free brand pages and extract "Buy From Official Site" links

INPUT_FILE="C:/Users/yoges/.claude/projects/c--Users-yoges-source-repo-sv-web/ad8b42e1-0c8f-4def-8c09-8bfde3b3a728/tool-results/bafwua7rc.txt"
OUTPUT_FILE="c:/Users/yoges/source/repo/sv-web/scripts/official-site-links.txt"

# Clear output file
> "$OUTPUT_FILE"

TOTAL=$(wc -l < "$INPUT_FILE" | tr -d ' ')
COUNT=0

while IFS='|' read -r url brand; do
  # Skip empty lines
  [ -z "$url" ] && continue

  COUNT=$((COUNT + 1))

  # Fetch the page and extract the "Buy From Official Site" link
  OFFICIAL_URL=$(curl -s --max-time 10 "$url" | grep -oE 'href="[^"]*"[^>]*>Buy From Official Site' | head -1 | sed 's/href="//;s/".*$//')

  if [ -n "$OFFICIAL_URL" ]; then
    echo "${brand}|${OFFICIAL_URL}" >> "$OUTPUT_FILE"
    echo "[$COUNT/$TOTAL] ${brand} -> ${OFFICIAL_URL}"
  else
    echo "${brand}|NOT_FOUND" >> "$OUTPUT_FILE"
    echo "[$COUNT/$TOTAL] ${brand} -> NOT FOUND"
  fi

done < "$INPUT_FILE"

echo ""
echo "Done! Results saved to $OUTPUT_FILE"
echo "Total processed: $COUNT"
