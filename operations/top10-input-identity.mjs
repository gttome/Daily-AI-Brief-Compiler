// Both names have appeared in genuine Compiler handoff files. Accept the
// precise known schema variants only when every other byte/date/provenance
// check passes; a schema alias is not evidence that a search was executed.
export const TOP10_INPUT_SCHEMAS=Object.freeze([
 'daily-ai-topic-top10-input-v1',
 'daily-ai-topic-top10-trend-input-v1'
]);
export const isTop10InputSchema=s=>TOP10_INPUT_SCHEMAS.includes(s);
