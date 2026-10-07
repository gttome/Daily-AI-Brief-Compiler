import {isCompilerFeedbackItem,isCompilerReaderEventItem,isCompilerWatchTopic} from '../compiler/feedback-identity.mjs';

const choices=new Set(['very_interested','somewhat_interested','not_interested']);
const eventMetrics=new Set(['share_initiations','source_clicks','permanent_page_clicks','worth_watching_clicks','views','retention_30s']);
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''));

function cors(origin){
  return {
    'cache-control':'no-store',
    'content-type':'application/json; charset=utf-8',
    'x-content-type-options':'nosniff',
    'access-control-allow-origin':origin||'*',
    'access-control-allow-methods':'GET, POST, OPTIONS',
    'access-control-allow-headers':'content-type, x-operation-id'
  };
}
const json=(value,status=200,origin='*')=>new Response(JSON.stringify(value),{status,headers:cors(origin)});
const bad=(message,status=400,origin='*')=>json({recorded:false,error:message},status,origin);

export function createD1Storage(db){
  if(!db)throw new Error('D1 binding required');
  return {
    async aggregate(edition,item,kind){
      const rows=await db.prepare('SELECT value,COUNT(*) AS count FROM compiler_feedback WHERE edition=? AND item=? AND kind=? GROUP BY value').bind(edition,item,kind).all();
      return Object.fromEntries((rows.results||[]).map(row=>[row.value,Number(row.count)]));
    },
    async saveFact({operation,kind,edition,item,value,createdAt}){
      const result=await db.batch([
        db.prepare('INSERT INTO compiler_feedback(operation,kind,edition,item,value,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(operation) DO NOTHING').bind(operation,kind,edition,item,String(value),createdAt),
        db.prepare('SELECT kind,edition,item,value FROM compiler_feedback WHERE operation=?').bind(operation),
        db.prepare('SELECT COUNT(*) AS count FROM compiler_feedback WHERE edition=? AND item=? AND kind=? AND value=?').bind(edition,item,kind,String(value))
      ]);
      const saved=result[1].results?.[0];
      return {saved,count:Number(result[2].results?.[0]?.count||0)};
    },
    async saveComment({operation,edition,item,body,createdAt}){
      const result=await db.batch([
        db.prepare('INSERT INTO compiler_comments(operation,edition,item,body,created_at) VALUES(?,?,?,?,?) ON CONFLICT(operation) DO NOTHING').bind(operation,edition,item,body,createdAt),
        db.prepare('SELECT edition,item,body,created_at FROM compiler_comments WHERE operation=?').bind(operation)
      ]);
      return result[1].results?.[0];
    },
    async comments(edition,item){
      const rows=await db.prepare('SELECT body,created_at FROM compiler_comments WHERE edition=? AND item=? ORDER BY created_at DESC LIMIT 100').bind(edition,item).all();
      return rows.results||[];
    },
    async saveVote({topic,ballot,choice,revision,updatedAt}){
      const result=await db.batch([
        db.prepare('INSERT INTO compiler_watchlist_ballots(topic,ballot,choice,revision,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(topic,ballot) DO UPDATE SET choice=excluded.choice,revision=excluded.revision,updated_at=excluded.updated_at WHERE excluded.revision>compiler_watchlist_ballots.revision').bind(topic,ballot,choice,revision,updatedAt),
        db.prepare('SELECT choice,revision FROM compiler_watchlist_ballots WHERE topic=? AND ballot=?').bind(topic,ballot)
      ]);
      return result[1].results?.[0];
    },
    async watchlistTotals(){
      const rows=await db.prepare('SELECT topic AS topic_id,choice,COUNT(*) AS count FROM compiler_watchlist_ballots GROUP BY topic,choice').all();
      return rows.results||[];
    }
  };
}

export function createFeedbackWorker({allowedOrigins=['https://gttome.github.io']}={}){
  async function parseBody(request,origin){
    if(!request.headers.get('content-type')?.startsWith('application/json'))throw Object.assign(new Error('JSON required'),{status:415});
    const text=await request.text();
    if(text.length>8192)throw Object.assign(new Error('Request too large'),{status:413});
    let body;try{body=JSON.parse(text);}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}
    if(!body||typeof body!=='object'||Array.isArray(body))throw Object.assign(new Error('Object required'),{status:400});
    return body;
  }
  return {
    async fetch(request,env={}){
      const url=new URL(request.url),origin=request.headers.get('origin')||'';
      if(request.method==='OPTIONS'){
        const allowed=allowedOrigins.includes(origin)||origin===url.origin;
        return new Response(null,{status:204,headers:cors(allowed?origin:'null')});
      }
      if(!['/api/ratings','/api/comments','/api/watchlist','/api/events'].includes(url.pathname))return bad('Not found',404,'*');
      const store=env.STORE||createD1Storage(env.DB);
      if(request.method==='GET'){
        if(url.pathname==='/api/watchlist')return json({totals:await store.watchlistTotals()},200,'*');
        const edition=url.searchParams.get('brief_date'),item=url.searchParams.get('item_id');
        const validItem=url.pathname==='/api/events'?isCompilerReaderEventItem(edition,item):isCompilerFeedbackItem(edition,item);
        if(!date(edition)||!validItem)return bad('Invalid Compiler item',400,'*');
        if(url.pathname==='/api/comments')return json({comments:await store.comments(edition,item)},200,'*');
        const kind=url.pathname==='/api/ratings'?'rating':'event';
        return json({totals:await store.aggregate(edition,item,kind)},200,'*');
      }
      if(request.method!=='POST')return bad('Method not allowed',405,origin||'*');
      if(!(allowedOrigins.includes(origin)||origin===url.origin))return bad('Origin not allowed',403,origin||'null');
      let body;try{body=await parseBody(request,origin);}catch(error){return bad(error.message,error.status||400,origin);}
      const now=Date.now();
      if(url.pathname==='/api/watchlist'){
        const {topic_id:topic,ballot,choice,revision}=body;
        if(!isCompilerWatchTopic(topic)||!uuid(ballot)||!choices.has(choice)||!Number.isSafeInteger(revision)||revision<1||revision>1000000)return bad('Invalid vote',400,origin);
        const saved=await store.saveVote({topic,ballot,choice,revision,updatedAt:now});
        if(!saved)return bad('Vote persistence failed',503,origin);
        if(Number(saved.revision)===revision&&saved.choice!==choice)return bad('Revision already used',409,origin);
        return json({recorded:true,choice:saved.choice,revision:Number(saved.revision)},200,origin);
      }
      const edition=body.brief_date,item=body.item_id,operation=request.headers.get('x-operation-id');
      const validItem=url.pathname==='/api/events'?isCompilerReaderEventItem(edition,item):isCompilerFeedbackItem(edition,item);
      if(!date(edition)||!validItem)return bad('Invalid Compiler item',400,origin);
      if(!uuid(operation))return bad('Operation ID required',400,origin);
      if(url.pathname==='/api/comments'){
        const comment=String(body.body||'').trim();
        if(!comment||comment.length>1000)return bad('Comment must be 1–1000 characters',400,origin);
        const saved=await store.saveComment({operation,edition,item,body:comment,createdAt:now});
        if(!saved)return bad('Comment persistence failed',503,origin);
        if(saved.edition!==edition||saved.item!==item||saved.body!==comment)return bad('Operation ID already used',409,origin);
        return json({recorded:true},201,origin);
      }
      const kind=url.pathname==='/api/ratings'?'rating':'event';
      const value=kind==='rating'?Number(body.rating):body.metric;
      if(kind==='rating'&&(!Number.isInteger(value)||value<1||value>5))return bad('Rating must be 1–5',400,origin);
      if(kind==='event'&&!eventMetrics.has(value))return bad('Invalid event metric',400,origin);
      const result=await store.saveFact({operation,kind,edition,item,value:String(value),createdAt:now});
      const saved=result.saved;
      if(!saved||saved.kind!==kind||saved.edition!==edition||saved.item!==item||saved.value!==String(value))return bad('Operation ID already used',409,origin);
      return json({recorded:true,count:result.count},201,origin);
    }
  };
}

export default createFeedbackWorker();
