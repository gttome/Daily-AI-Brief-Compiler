import {canonicalSha,sha256} from './util.mjs';
import {generatorProjection} from './packet.mjs';

const lines=a=>(a||[]).map(x=>'- '+x).join('\n')||'- None';
const components=a=>(a||[]).map(x=>'- '+x.component_id+': '+x.description+' ['+x.support+']').join('\n');
const assignment=a=>[
  'composition_signature: '+a.composition_signature,
  'layout_signature: '+a.layout_signature,
  'diagram_grammar: '+a.diagram_grammar,
  'hierarchy_signature: '+a.hierarchy_signature,
  'annotation_pattern_signature: '+a.annotation_pattern_signature,
  'reading_path: '+a.reading_path,
  'prohibited_patterns: '+(a.prohibited_patterns||[]).join(' | ')
].join('\n');

export function compileGeneratorPrompt(packet){
  const p=generatorProjection(packet);
  const text=[
'RENDER ONLY THIS SEALED STORY SPECIFICATION.',
'',
'Use only the story content below. Do not reuse any prior story, image, visual motif, layout, object set, brand, label set, color scheme, icon set, subject matter, or mechanism.',
'',
'OUTPUT / VISUAL TARGET',
'- Exactly one professional technical/editorial textbook mechanism illustration.',
'- Clean white or near-white background.',
'- Landscape composition designed for final 1200x630 publication.',
'- Full composition inside safe margins.',
'- High information density without clutter.',
'- Mechanism and relationships dominate the image.',
'',
'SUBJECT',p.subject,'',
'CORE MECHANISM',p.core_mechanism,'',
'VERIFIED FACTUAL ELEMENTS',lines(p.verified_visual_facts),'',
'APPROVED CONCEPTUAL ELEMENTS',lines(p.conceptual_elements),'',
'COMPOSITION ASSIGNMENT',assignment(p.composition_assignment),'',
'MEANINGFUL COMPONENT PLAN',components(p.meaningful_components_plan),'',
'PROHIBITED SPECIFICS',lines(p.prohibited_specifics),'',
'PROHIBITED COMPOSITION PATTERNS',lines(p.prohibited_composition_patterns),'',
'VISIBLE TEXT ALLOWLIST — EXACT',lines(p.visible_text_allowlist),'',
'VISIBLE TEXT FAIL-CLOSED CONTRACT',
'Render every allowlisted label legibly at least once.',
'Render NO other readable characters of any kind.',
'No timestamps.',
'No digits unless an exact allowlisted label contains them.',
'No clock text.',
'No code.',
'No CLI syntax.',
'No command fragments.',
'No filenames.',
'No hashes.',
'No receipts.',
'No badges.',
'No UI chrome.',
'No status text.',
'No metadata.',
'No fake paragraphs.',
'No pseudo-text.',
'No added headings, title, subtitle, caption, or legend.',
'Any artifact that would normally contain text must instead use blank non-text geometric strokes or unlabeled abstract texture.',
'',
'BRAND FAIL-CLOSED CONTRACT',
'Render no logos, wordmarks, trademarks, provider badges, platform marks, app icons, letterform brand icons, recognizable branded symbols, or branded color-lockups.',
'Replace every brand-like or app-like object with neutral unbranded geometry.',
'',
'ABSTRACT SUBSTITUTE CONTRACT',
'Represent devices, commands, applications, streams, receipts, evidence, screens, terminals, and documents using neutral shapes, connectors, layers, tokens, packets, blank line patterns, or document-like forms containing no unapproved text.',
'',
'HUMAN FIGURE CONTRACT',
'No people, faces, bodies, hands, avatars, group/person icons, humanoids, or identifiable real people.',
'',
'PHOTO / SCENE CONTRACT',
'No photographs, photorealism, stock-photo composition, cinematic scene, dark hero background, decorative desk/office props, or lifestyle scenery.',
'',
'QUALITY CONTRACT',
'The result must look like a commissioned advanced textbook/editorial plate, not a slide, generic infographic, icon board, dashboard, title card, repeated-card template, sparse flowchart, or placeholder.',
'Use at least 8 meaningful explanatory components.',
'Use refined technical linework, subtle depth, disciplined hierarchy, precise connectors, restrained professional accents, and clear visual storytelling.',
'Do not add complexity solely to appear sophisticated.',
'',
'FINAL SELF-CHECK',
'- correct story only;',
'- mechanism immediately legible;',
'- 8+ meaningful components;',
'- every allowlisted label readable;',
'- no other characters;',
'- no people/humanoids;',
'- no logos/brands;',
'- no photorealism;',
'- no unsupported facts/UI/metrics;',
'- no overlap or clipping;',
'- no generic/sparse/template-like output.',
'',
'Generate exactly one illustration and return only the illustration.'
  ].join('\n');
  return Object.freeze({prompt:text,prompt_sha256:sha256(text),projection_sha256:canonicalSha(p)});
}

export function assertSubmittedPrompt(packet,submitted){
  const compiled=compileGeneratorPrompt(packet);
  if(submitted!==compiled.prompt) throw new Error('submitted_instruction_not_exact_compiled_prompt');
  return compiled;
}
