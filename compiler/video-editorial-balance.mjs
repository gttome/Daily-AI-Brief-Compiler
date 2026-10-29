// Prospective October 30 video source concentration check; immutable older editions unchanged.
// An advancing player establishes availability, not an independent educational perspective.
export const VIDEO_BALANCE_EFFECTIVE='2026-10-30';
const fail=code=>{throw Error('video_editorial_balance:'+code);};
export function validateVideoEditorialBalance({edition_date,videos,publishers}){
 if(edition_date<VIDEO_BALANCE_EFFECTIVE)return {result:'SKIPPED_HISTORICAL'};
 if(!Array.isArray(videos)||videos.length!==2||
    !Array.isArray(publishers)||publishers.length!==2||
    publishers.some(x=>typeof x!=='string'||!x))
   fail('two_videos_with_verified_publisher_identities_required');
 if(new Set(publishers).size!==2)
   fail('two_distinct_original_video_publishers_required_no_same_vendor_fallback');
 // An entire pair of medium-risk first-party product tutorials cannot pass
 // on the basis of successful playback or structurally valid teaching points.
 // The original separate media gate continues to reject high-risk ads.
 if(videos.every(v=>v?.quality_review?.promotional_risk!=='low'))
   fail('two_promotional_risk_videos_not_independent_education');
 return {result:'PASS',distinct_original_publishers:2,
   low_promotion_videos:videos.filter(v=>v.quality_review?.promotional_risk==='low').length,
   substantive_content_review_remains_required:true};
}
