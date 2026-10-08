import {canonicalSha} from '../../image-capsules/util.mjs';
import {sealD1Specifications} from '../../image-studio/spec-admission.mjs';

// Synthetic specification-only fixtures. These are neither generated images nor
// source research, pixel reviews, accepted production assets, or live proof.
const MECHANISMS=[
  {
    key:'permission-routing',subject:'Permission routing across a split boundary',
    core:'An action request is decomposed into a scope token and an operation token. The scope token constrains the operation at a crossing gate, and a denied operation returns to the request selector.',
    facts:['An action request crosses a scope check before release.','A denied action returns to the request selector.'],
    concepts:['A split plane separates proposed operations from permitted effects.','Blank permission wafers explain scope without imitating a product interface.'],
    components:['Bounded request aperture','Request selector with separate outgoing ports','Operation token separator','Scope wafer extractor','Permission track containing the permitted scope','Crossing gate comparing scope and operation','Denied-operation return chute','Permitted-operation channel','Release barrier constrained by the crossing gate','Effect token beyond the release barrier','Scope trace joining wafer and comparator','Decision trace joining comparator and return chute'],
    composition:'split-boundary-permission-bridge',layout:'split-plane',grammar:'cross-boundary-routing',hierarchy:'two-domains-one-constrained-crossing',annotation:'edge-callouts',
    reading:'Across the proposed domain, through the permission crossing, then into the effect domain.',palette:'steel-teal-violet',metaphor:'scope-constrained bridge',evidence:'paired permission wafers',feedback:'denial chute to request selector',
    dominant:'Two exposed token tracks meet at a scope-constrained crossing.',
    transformations:['Separate the proposed operation from the requested scope.','Match the proposed operation against the permitted scope before opening the crossing.'],
    relations:['Carry the scope wafer identity into the crossing comparison.','Route denied material back to the request selector.'],
    evidenceStructure:'The operation token remains visibly paired with its permission wafer.',constraint:'A mechanical stop at the crossing blocks unpermitted scope.',feedbackPath:'Denied tokens return along a separate lower chute.',output:'A transparent release barrier separates proposed operations from effects.',
    labels:['Request','Scope','Check','Effect'],forbidden:'unbounded operation channel'
  },
  {
    key:'evidence-fusion',subject:'Evidence fusion through an alignment lattice',
    core:'Four distinct evidence fragments enter parallel alignment tracks. Their aligned features cross an air gap into an assembly chamber, where a combined digest retains four individually traceable bindings.',
    facts:['Distinct evidence fragments are aligned before assembly.','The combined digest retains a binding to every fragment.'],
    concepts:['A lattice makes alignment relationships visible.','A separate open chamber illustrates assembly as a transformation.'],
    components:['Plain plate fragment','Plain ring fragment','Plain triangular fragment','Plain capsule fragment','Four-slot intake comb','Open alignment deck','Four exposed parallel alignment tracks','Air gap crossed by four independent traces','Separate assembly chamber','Digest combining the aligned inputs','Four-port binding collar','Trace fan connecting digest to its original fragments'],
    composition:'alignment-lattice-and-open-assembly',layout:'stacked-lattice',grammar:'many-to-bound-digest',hierarchy:'fragments-alignment-assembly',annotation:'inline-stage-labels',
    reading:'From the distinct fragments down the parallel alignment tracks into the open assembly chamber.',palette:'cyan-lime-indigo',metaphor:'evidence assembly lattice',evidence:'four differently shaped blank solids',feedback:'assembly recheck loop to alignment deck',
    dominant:'An exposed alignment lattice feeds a visibly separate assembly chamber.',
    transformations:['Align each fragment on its own parallel track without merging it.','Combine aligned features into a digest while retaining four binding ports.'],
    relations:['Keep the plate fragment independently traceable to the digest.','Return an unaligned input from assembly to its original alignment track.'],
    evidenceStructure:'Four unmarked solids retain distinct shapes before and after binding.',constraint:'The intake comb preserves separation until alignment finishes.',feedbackPath:'A short recheck loop returns an unaligned fragment to the lattice.',output:'The digest exits through a single opening after the binding collar.',
    labels:['Fragments','Align','Assemble','Digest'],forbidden:'single narrowing funnel in place of assembly'
  },
  {
    key:'procedure-anatomy',subject:'Portable procedure anatomy with local authority',
    core:'A reusable procedure package separates instructions from execution authority. A local adapter binds declared steps to available tools, while a scope clamp limits which tools the procedure can invoke.',
    facts:['Procedure instructions are distinct from execution authority.','A local adapter binds procedure steps to available tools.'],
    concepts:['An exploded package reveals reusable procedure layers.','A physical scope clamp represents authority supplied locally.'],
    components:['Procedure package outer boundary','Instruction layer','Step-order layer','Declared-input socket layer','Declared-output socket layer','Local adapter plate','Tool-binding pins','Local authority collar','Scope clamp around the adapter','Permitted tool contact','Unavailable tool gap','Executed-step receipt tile'],
    composition:'exploded-procedure-package-with-local-clamp',layout:'exploded-vertical-anatomy',grammar:'package-layer-binding',hierarchy:'portable-layers-over-local-authority',annotation:'bracketed-layer-labels',
    reading:'From the exploded procedure layers into the local adapter and its constrained tool contacts.',palette:'navy-ochre-sage',metaphor:'portable instruction cartridge',evidence:'executed-step receipt tiles',feedback:'unbound step returned to adapter',
    dominant:'An exploded procedure cartridge seats into a locally constrained adapter.',
    transformations:['Resolve the declared step order into local adapter positions.','Bind a resolved step to a permitted tool contact under the scope clamp.'],
    relations:['Carry the declared input socket into the corresponding adapter pin.','Return an unavailable tool binding to the adapter without invoking it.'],
    evidenceStructure:'A blank receipt tile records which local contact completed the step.',constraint:'A scope clamp limits contacts reachable by the adapter.',feedbackPath:'Unbound steps lift back to the adapter through a separate return slot.',output:'A completed-step tile exits below the permitted tool contact.',
    labels:['Procedure','Adapter','Authority','Receipt'],forbidden:'instructions portrayed as unrestricted authority'
  },
  {
    key:'claim-comparison',subject:'Claim comparison against linked evidence',
    core:'A claim is decomposed into checkable parts. Parallel comparator rails connect each part to its supporting fragment, then a decision fork separates supported output from material returned for revision.',
    facts:['Checkable claim parts are compared with supporting fragments.','Unsupported material returns for revision before release.'],
    concepts:['A comparison plate separates the proposed claim from its evidence.','Parallel rails make each support relationship traceable.'],
    components:['Claim intake plate','Claim-part separator','First checkable claim token','Second checkable claim token','Third checkable claim token','First supporting fragment','Second supporting fragment','Third supporting fragment','Three parallel comparator rails','Central decision fork','Revision return channel','Verified release packet'],
    composition:'paired-comparison-plate-with-decision-fork',layout:'paired-planes',grammar:'claim-to-evidence-comparison',hierarchy:'claim-evidence-decision',annotation:'paired-reference-labels',
    reading:'Across matched claim and evidence pairs, then through the central decision fork.',palette:'charcoal-coral-mint',metaphor:'evidence comparator bench',evidence:'paired claim tokens and supporting fragments',feedback:'lower revision channel',
    dominant:'Three exposed comparator rails join separate claim and evidence planes.',
    transformations:['Decompose the proposed claim into independently checkable parts.','Compare each part with its supporting fragment before the decision fork.'],
    relations:['Bind the first claim token to its own evidence fragment.','Return unsupported material from the fork to the claim separator.'],
    evidenceStructure:'Each fragment is physically linked to one checkable claim token.',constraint:'The decision fork cannot pass a token without a matched comparison.',feedbackPath:'The lower channel returns unsupported material for revision.',output:'A distinct upper channel releases one verified packet.',
    labels:['Claim','Evidence','Compare','Release'],forbidden:'unsupported claim bypassing the comparator'
  },
  {
    key:'state-branching',subject:'State branching with reversible checkpoints',
    core:'A proposed state change passes through a transition guard. A checkpoint preserves the previous state, successful transitions advance to a new state, and rejected changes branch back to the checkpoint.',
    facts:['A guard evaluates a proposed state transition.','A checkpoint retains the previous state for a rejected change.'],
    concepts:['Branching rails depict alternate transition outcomes.','A checkpoint cradle represents retained prior state.'],
    components:['Previous state tile','Checkpoint cradle','Proposed-change token','Transition input socket','Guard comparator','Allowed-transition latch','Forward transition rail','New state tile','Rejected-transition diverter','Checkpoint return rail','State-difference trace','Checkpoint identity tether'],
    composition:'branching-state-tree-with-checkpoint-return',layout:'branching-tree',grammar:'guarded-state-transition',hierarchy:'checkpoint-guard-outcomes',annotation:'branch-end-labels',
    reading:'From the retained state into the transition guard, then along the permitted or rejected branch.',palette:'indigo-amber-rose',metaphor:'guarded transition switchyard',evidence:'paired before and after state tiles',feedback:'checkpoint return branch',
    dominant:'A guarded transition switch preserves the checkpoint while selecting an outcome.',
    transformations:['Compare the proposed change with the retained previous state.','Open the permitted transition latch or divert the change to the checkpoint.'],
    relations:['Connect the new state to its previous state through a difference trace.','Keep the checkpoint identity tether visible beside the return branch.'],
    evidenceStructure:'Before and after state tiles are joined by a difference trace.',constraint:'The transition latch opens only after the guard comparison.',feedbackPath:'Rejected changes follow a separate branch into the checkpoint cradle.',output:'The forward rail ends at the new state tile beyond the guard.',
    labels:['State','Checkpoint','Guard','Transition'],forbidden:'irreversible transition without checkpoint'
  },
  {
    key:'context-synchronization',subject:'Shared context synchronization with bounded updates',
    core:'Independent context updates enter a shared synchronization hub. An ordering ring aligns their versions, a merge surface combines compatible changes, and conflicts return to their originating input ports.',
    facts:['Independent context updates are ordered before merging.','Conflicting updates return to their originating input ports.'],
    concepts:['A radial hub shows separate inputs meeting in shared context.','An ordering ring depicts version alignment without fabricated timestamps.'],
    components:['North update port','East update port','West update port','Independent update tokens','Radial provenance spokes','Version-ordering ring','Version alignment latch','Shared merge surface','Conflict comparator','Origin-preserving return spoke','Merged context core','Bounded dissemination outlets'],
    composition:'radial-context-hub-with-origin-return',layout:'radial-hub',grammar:'ordered-context-synchronization',hierarchy:'inputs-ordering-shared-core',annotation:'radial-port-labels',
    reading:'From independent outer ports toward the ordered merge core, then outward through bounded outlets.',palette:'cobalt-emerald-copper',metaphor:'context synchronization hub',evidence:'origin-linked update tokens',feedback:'conflict spoke back to its originating port',
    dominant:'An ordering ring feeds a central merge surface while preserving each update origin.',
    transformations:['Align update versions on the ordering ring before admitting them to the hub.','Merge compatible changes and separate conflicting updates at the comparator.'],
    relations:['Preserve the origin of an update along its radial provenance spoke.','Return a conflicting update to its own outer port.'],
    evidenceStructure:'Every update token retains a visible spoke to its originating port.',constraint:'An alignment latch keeps unordered updates off the merge surface.',feedbackPath:'Conflicts travel outward on origin-preserving return spokes.',output:'Bounded outlets distribute only the merged context core.',
    labels:['Updates','Order','Merge','Context'],forbidden:'conflicting updates merged without comparison'
  }
];

export function makeD1SpecificationsFixture(){
  const edition_date='2026-10-09',execution_id='fixture-d1-admission-20261009',source_commit='a'.repeat(40);
  const assignments=MECHANISMS.map(m=>({
    story_id:'fixture-'+m.key,composition_signature:m.composition,layout_signature:m.layout,
    diagram_grammar:m.grammar,hierarchy_signature:m.hierarchy,annotation_pattern_signature:m.annotation,
    reading_path:m.reading,prohibited_patterns:[m.forbidden],palette_family:m.palette,
    mechanism_metaphor:m.metaphor,evidence_representation:m.evidence,feedback_pattern:m.feedback
  }));
  const stories=MECHANISMS.map((m,i)=>{
    const {story_id,...composition_assignment}=assignments[i];
    return {
      story_id,story_content_sha256:canonicalSha({subject:m.subject,facts:m.facts}),specification_sha256:'0'.repeat(64),
      generation:{
        subject:m.subject,core_mechanism:m.core,verified_visual_facts:[...m.facts],conceptual_elements:[...m.concepts],
        meaningful_components_plan:m.components.map((description,index)=>({
          component_id:'c'+(index+1),description,support:index<2?'verified_fact':'approved_concept',support_index:index%2,required:true
        })),
        mechanism_plan:{
          dominant_mechanism:m.dominant,
          internal_substages:[
            {input_component_id:'c1',transformation:m.transformations[0],output_component_id:'c3'},
            {input_component_id:'c3',transformation:m.transformations[1],output_component_id:'c6'}
          ],
          secondary_relationships:[
            {from_component_id:'c4',to_component_id:'c8',relationship:m.relations[0]},
            {from_component_id:'c9',to_component_id:'c2',relationship:m.relations[1]}
          ],
          evidence_structure:m.evidenceStructure,constraint_structure:m.constraint,feedback_path:m.feedbackPath,output_boundary:m.output
        },
        composition_assignment,visible_text_allowlist:[...m.labels],prohibited_specifics:['invented performance metrics'],
        prohibited_composition_patterns:[m.forbidden],reference_policy:'Only this sealed specification and neutral quality rules.'
      }
    };
  });
  const sourceEvidence={
    schema_version:'daily-compiler-d1-source-evidence-v1',edition_date,execution_id,source_commit,
    stories:stories.map((story,index)=>({
      story_id:story.story_id,story_content_sha256:story.story_content_sha256,
      source_url:'https://example.org/synthetic-source/'+MECHANISMS[index].key,
      verified_visual_facts:[...story.generation.verified_visual_facts]
    }))
  };
  const request={
    schema_version:'daily-compiler-d1-image-specifications-v1',contract_version:'daily-compiler-image-contract-v5',
    edition_date,execution_id,request_id:'fixture-six-specifications-request',source_commit,
    source_evidence_sha256:'0'.repeat(64),set_plan_sha256:'0'.repeat(64),
    set_plan:{
      schema_version:'daily-compiler-d1-image-set-plan-v1',edition_date,stories:assignments,
      planned_set_gate:{unique_composition_signatures:6,distinct_layout_signatures_min:4,
        distinct_diagram_grammars_min:4,distinct_hierarchy_signatures_min:4,distinct_annotation_patterns_min:3}
    },stories
  };
  return {request:sealD1Specifications(request,sourceEvidence),sourceEvidence};
}
