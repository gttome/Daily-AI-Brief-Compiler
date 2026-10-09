// Release 1 editorial-complete image representation. Not a premium-image acceptance route.
export const PENDING_PLACEHOLDER_ID='illustration-pending-1200x630-v1';

export function validatePendingImageRecords({bundle,state}) {
  if(bundle.image_representation?.status!=='images_pending' ||
     bundle.image_representation.placeholder_id!==PENDING_PLACEHOLDER_ID ||
     bundle.image_representation.width!==1200 ||
     bundle.image_representation.height!==630) throw new Error('pending image representation invalid');
  if(state.images?.mode!=='images_pending' ||
     state.images?.placeholder_id!==PENDING_PLACEHOLDER_ID ||
     state.images?.required!==6 ||
     !Array.isArray(state.images?.accepted) ||
     state.images.accepted.length!==0) throw new Error('pending state must contain zero accepted images');
  if(state.editorial_bundle?.status!=='complete') throw new Error('pending publication requires complete editorial checkpoint');
  if(bundle.image_system) throw new Error('pending publication cannot claim a premium image system');
  if(!Array.isArray(bundle.images) || bundle.images.length!==6) throw new Error('six pending figure bindings required');
  const stories=new Map(bundle.stories.map(s=>[s.id,s]));
  const seen=new Set();
  const permitted=new Set(['story_id','status','accepted','placeholder_id','alt']);
  return bundle.images.map(image=>{
    if(!image || typeof image!=='object' || Array.isArray(image) ||
       Object.keys(image).some(k=>!permitted.has(k))) throw new Error('pending figure cannot carry image acceptance or asset evidence');
    const story=stories.get(image.story_id);
    if(!story || seen.has(image.story_id)) throw new Error('pending figure/story identity invalid or duplicated');
    seen.add(image.story_id);
    if(image.status!=='pending' || image.accepted!==false ||
       image.placeholder_id!==PENDING_PLACEHOLDER_ID) throw new Error('pending figure cannot be accepted artwork');
    if(typeof image.alt!=='string' || image.alt.trim()!==story.image_alt_intent.trim())
      throw new Error('pending figure requires its story-specific accessible description');
    return {story_id:image.story_id,status:'pending',placeholder_id:PENDING_PLACEHOLDER_ID,alt:image.alt};
  });
}
