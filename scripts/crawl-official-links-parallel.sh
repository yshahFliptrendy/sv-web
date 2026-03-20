#!/bin/bash
# Crawl all cruelty-free brand pages in parallel and extract "Buy From Official Site" links

INPUT_FILE="C:/Users/yoges/.claude/projects/c--Users-yoges-source-repo-sv-web/ad8b42e1-0c8f-4def-8c09-8bfde3b3a728/tool-results/bafwua7rc.txt"
OUTPUT_FILE="c:/Users/yoges/source/repo/sv-web/scripts/official-site-links.txt"
TEMP_DIR=$(mktemp -d)
PARALLEL=20  # Number of concurrent requests

# Clear output file
> "$OUTPUT_FILE"

TOTAL=$(grep -c '|' "$INPUT_FILE")
echo "Starting crawl of $TOTAL brand pages with $PARALLEL parallel requests..."

# Function to fetch a single brand page
fetch_brand() {
  local url="$1"
  local brand="$2"
  local idx="$3"
  local temp_file="$TEMP_DIR/$idx.txt"

  OFFICIAL_URL=$(curl -s --max-time 15 "$url" | grep -oE 'href="[^"]*"[^>]*>Buy From Official Site' | head -1 | sed 's/href="//;s/".*$//')

  if [ -n "$OFFICIAL_URL" ]; then
    echo "${brand}|${OFFICIAL_URL}" > "$temp_file"
    echo "[$idx/$TOTAL] ${brand} -> ${OFFICIAL_URL}"
  else
    echo "${brand}|NOT_FOUND" > "$temp_file"
    echo "[$idx/$TOTAL] ${brand} -> NOT FOUND"
  fi
}

# Process URLs in parallel batches
COUNT=0
PIDS=()

while IFS='|' read -r url brand; do
  [ -z "$url" ] && continue
  COUNT=$((COUNT + 1))

  fetch_brand "$url" "$brand" "$COUNT" &
  PIDS+=($!)

  # Limit parallel jobs
  if [ ${#PIDS[@]} -ge $PARALLEL ]; then
    # Wait for all current batch to finish
    for pid in "${PIDS[@]}"; do
      wait "$pid"
    done
    PIDS=()
  fi

done < "$INPUT_FILE"

# Wait for remaining jobs
for pid in "${PIDS[@]}"; do
  wait "$pid"
done

# Combine all temp files in order
for i in $(seq 1 $COUNT); do
  if [ -f "$TEMP_DIR/$i.txt" ]; then
    cat "$TEMP_DIR/$i.txt" >> "$OUTPUT_FILE"
  fi
done

# Cleanup
rm -rf "$TEMP_DIR"

FOUND=$(grep -cv "NOT_FOUND" "$OUTPUT_FILE" 2>/dev/null || echo 0)
echo ""
echo "Done! Results saved to $OUTPUT_FILE"
echo "Total processed: $COUNT"
echo "Links found: $FOUND"
echo "Not found: $((COUNT - FOUND))"
