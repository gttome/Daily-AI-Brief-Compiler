export const P0A_ROUTE_MATRIX_SCHEMA='daily-compiler-d0-p0a-route-matrix-v1';

export const REQUIRED_CAPABILITIES=Object.freeze([
  'native_chatgpt_images',
  'fresh_context',
  'story_prompt_exactly_bindable',
  'generated_asset_programmatically_retrievable',
  'exact_bytes_available_before_context_end',
  'post_generation_persistence_available',
  'autonomous_invocation'
]);

export const PROHIBITED_DEPENDENCIES=Object.freeze([
  'owner_intervention','work','codex','paid_model_api','paid_image_service',
  'billable_overage','new_paid_infrastructure','alternate_account','proposal1r_reader_fallback'
]);

const strictTrue=v=>v===true;

export function evaluateP0ARoute(route={}){
  const missing=REQUIRED_CAPABILITIES.filter(k=>!strictTrue(route?.[k]));
  const prohibited=PROHIBITED_DEPENDENCIES.filter(k=>route?.[k]===true);
  const ready=missing.length===0&&prohibited.length===0&&route?.status!=='PROHIBITED';
  return {
    route_id:route?.route_id??null,
    ready,
    missing_capabilities:missing,
    prohibited_dependencies:prohibited
  };
}

export function evaluateP0ARouteMatrix(matrix={}){
  if(matrix?.schema_version!==P0A_ROUTE_MATRIX_SCHEMA) throw new Error('p0a_route_matrix_schema');
  if(!Array.isArray(matrix?.routes)||matrix.routes.length===0) throw new Error('p0a_routes_required');
  const evaluations=matrix.routes.map(evaluateP0ARoute);
  const ready_routes=evaluations.filter(x=>x.ready).map(x=>x.route_id);
  return {
    result:ready_routes.length?'READY_FOR_BOUNDED_P0A_RETRY':'BLOCKED_NO_ZERO_COST_NATIVE_ROUTE',
    retry_allowed:ready_routes.length>0,
    ready_routes,
    evaluations
  };
}

export function assertP0ARetryRoute(matrix={}){
  const result=evaluateP0ARouteMatrix(matrix);
  if(!result.retry_allowed) throw new Error('p0a_retry_route_unavailable');
  return result;
}
