const ORIGIN='https://kazmikidev-afk.github.io';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':ORIGIN,'Cache-Control':'public, max-age=300'}});

/* ===== Push (web-push, VAPID, D1 push_subs) - 14.10 ===== */
const VAPID_PUB='BMQNC_5pOlwuL7HnAdbadx1hO8WmW5a-KgDMSB1_hsvraHPPsl_Fd1yUrxyqyvqn-2XAZkRHuISL7KC8_OsavJg';
const VAPID_SUB='mailto:kazmikidev@gmail.com';
const b64u=a=>btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const u8b64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const enc=new TextEncoder();
const cat=parts=>{const a=parts.map(p=>p instanceof Uint8Array?p:Uint8Array.from(p));const n=a.reduce((s,x)=>s+x.length,0);const o=new Uint8Array(n);let i=0;for(const x of a){o.set(x,i);i+=x.length;}return o;};
async function hmac(key,data){const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,data));}
async function vapidJwt(endpoint,env){
 const aud=new URL(endpoint).origin;
 const h=b64u(enc.encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
 const p=b64u(enc.encode(JSON.stringify({aud,exp:Math.floor(Date.now()/1000)+43200,sub:VAPID_SUB})));
 const key=await crypto.subtle.importKey('jwk',JSON.parse(env.VAPID_PRIVATE_JWK),{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,enc.encode(h+'.'+p));
 return h+'.'+p+'.'+b64u(sig);
}
async function encryptPush(keys,payloadStr){
 const auth=u8b64(keys.auth),uaPubBytes=u8b64(keys.p256dh);
 const uaPub=await crypto.subtle.importKey('raw',uaPubBytes,{name:'ECDH',namedCurve:'P-256'},false,[]);
 const asKeys=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const asPubBytes=new Uint8Array(await crypto.subtle.exportKey('raw',asKeys.publicKey));
 const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:uaPub},asKeys.privateKey,256));
 const prk=await hmac(auth,shared);
 const keyInfo=cat([enc.encode('WebPush: info'),[0],uaPubBytes,asPubBytes]);
 const ikm=await hmac(prk,cat([keyInfo,[1]]));
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const prk2=await hmac(salt,ikm);
 const cek=(await hmac(prk2,cat([enc.encode('Content-Encoding: aes128gcm'),[0,1]]))).slice(0,16);
 const nonce=(await hmac(prk2,cat([enc.encode('Content-Encoding: nonce'),[0,1]]))).slice(0,12);
 const data=cat([enc.encode(payloadStr),[2]]);
 const key=await crypto.subtle.importKey('raw',cek,{name:'AES-GCM'},false,['encrypt']);
 const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},key,data));
 const rs=new Uint8Array(4);new DataView(rs.buffer).setUint32(0,4096);
 return cat([salt,rs,[asPubBytes.length],asPubBytes,ct]);
}
async function sendPush(env,sub,payload){
 const body=await encryptPush({p256dh:sub.p256dh,auth:sub.auth},payload);
 const jwt=await vapidJwt(sub.endpoint,env);
 const r=await fetch(sub.endpoint,{method:'POST',headers:{'Authorization':'vapid t='+jwt+', k='+VAPID_PUB,'Content-Encoding':'aes128gcm','TTL':'86400'},body});
 return r.status;
}
async function deliverPush(env,payload){
 const rows=((await env.DB.prepare('SELECT endpoint,p256dh,auth FROM push_subs').all()).results)||[];
 let sent=0,gone=0,failed=0;const errs=[];
 for(const sub of rows){
  try{const status=await sendPush(env,sub,payload);
   if(status===201)sent++;
   else if(status===404||status===410){gone++;await env.DB.prepare('DELETE FROM push_subs WHERE endpoint=?').bind(sub.endpoint).run();}
   else{failed++;errs.push(status);}
  }catch(e){failed++;errs.push(String(e&&e.message||e).slice(0,80));}
 }
 return {total:rows.length,sent,gone,failed,errs:errs.slice(0,3)};
}
function constantTimeEqual(a,b){
 const x=enc.encode(String(a)),y=enc.encode(String(b));let diff=x.length^y.length;
 for(let i=0,n=Math.max(x.length,y.length);i<n;i++)diff|=(x[i]||0)^(y[i]||0);
 return diff===0;
}
async function checkAdminPushCode(request,env){
 if(typeof env.ADMIN_PUSH_CODE!=='string'||env.ADMIN_PUSH_CODE.length<24||env.ADMIN_PUSH_CODE.length>128)return {status:503,error:'admin_push_unconfigured'};
 try{
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const digest=await crypto.subtle.digest('SHA-256',enc.encode(ip));
  const ipKey=b64u(digest),minute=Math.floor(Date.now()/60000);
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS push_admin_rate_limits (minute INTEGER NOT NULL, ip_key TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(minute,ip_key))').run();
  if(minute%10===0)await env.DB.prepare('DELETE FROM push_admin_rate_limits WHERE minute < ?').bind(minute-10).run();
  await env.DB.prepare('INSERT INTO push_admin_rate_limits(minute,ip_key,attempts) VALUES(?,?,1) ON CONFLICT(minute,ip_key) DO UPDATE SET attempts=attempts+1').bind(minute,ipKey).run();
  const row=await env.DB.prepare('SELECT attempts FROM push_admin_rate_limits WHERE minute=? AND ip_key=?').bind(minute,ipKey).first();
  if(!row||Number(row.attempts)>12)return {status:429,error:'rate_limited'};
  const supplied=request.headers.get('x-admin-push-code')||'';
  if(!constantTimeEqual(supplied,env.ADMIN_PUSH_CODE))return {status:401,error:'auth'};
  return {ok:true};
 }catch{return {status:503,error:'admin_push_unavailable'};}
}
async function handlePush(request,env,u){
 const j=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':ORIGIN,'Cache-Control':'no-store','Vary':'Origin'}});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'content-type, x-notify-secret, x-admin-push-code','Cache-Control':'no-store','Vary':'Origin'}});
 if(u.pathname==='/push/key')return j({key:VAPID_PUB});
 if(u.pathname==='/push/subscribe'&&request.method==='POST'){
  let b;try{b=await request.json();}catch{return j({error:'json'},400);}
  if(!b||typeof b.endpoint!=='string'||!b.endpoint.startsWith('https://')||b.endpoint.length>500||!b.keys||typeof b.keys.p256dh!=='string'||typeof b.keys.auth!=='string'||b.keys.p256dh.length>200||b.keys.auth.length>100)return j({error:'bad_subscription'},400);
  await env.DB.prepare('INSERT INTO push_subs(endpoint,p256dh,auth,ua,created_at) VALUES(?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,ua=excluded.ua').bind(b.endpoint,b.keys.p256dh,b.keys.auth,String(b.ua||'').slice(0,200),new Date().toISOString()).run();
  return j({ok:true});
 }
 if(u.pathname==='/push/unsubscribe'&&request.method==='POST'){
  let b;try{b=await request.json();}catch{return j({error:'json'},400);}
  if(b&&typeof b.endpoint==='string')await env.DB.prepare('DELETE FROM push_subs WHERE endpoint=?').bind(b.endpoint).run();
  return j({ok:true});
 }
 if(u.pathname==='/push/admin-check'&&request.method==='POST'){
  const auth=await checkAdminPushCode(request,env);if(!auth.ok)return j({error:auth.error},auth.status);
  return j({ok:true});
 }
 if(u.pathname==='/push/admin-event'&&request.method==='POST'){
  const auth=await checkAdminPushCode(request,env);if(!auth.ok)return j({error:auth.error},auth.status);
  let b;try{b=await request.json();}catch{return j({error:'json'},400);}
  const types=new Set(['score','halftime','final']);
  if(!b||!types.has(b.type)||typeof b.revision!=='string'||!/^[a-f0-9]{40}$/.test(b.revision)||!Number.isInteger(b.gameId)||b.gameId<0||b.gameId>999999||!Array.isArray(b.score)||b.score.length!==2||b.score.some(n=>!Number.isInteger(n)||n<0||n>99)||typeof b.home!=='boolean'||typeof b.opponent!=='string'||!b.opponent.trim()||b.opponent.length>80||/[\u0000-\u001f\u007f]/.test(b.opponent))return j({error:'invalid_event'},400);
  if(b.minute!=null&&(!Number.isInteger(b.minute)||b.minute<0||b.minute>120))return j({error:'invalid_event'},400);
  const opponent=b.opponent.trim(),our=`עירוני רחובות ${b.score[0]}`,rival=`${opponent} ${b.score[1]}`;
  const scoreText=b.home?`${our}, ${rival}`:`${rival}, ${our}`;
  const prefix=b.type==='final'?'המשחק הסתיים: ':b.type==='halftime'?'מחצית: ':'תוצאה עודכנה: ';
  const eventKey=`${b.revision}:${b.gameId}:${b.type}`;
  try{
   await env.DB.prepare('CREATE TABLE IF NOT EXISTS push_admin_event_dedupe (event_key TEXT PRIMARY KEY, created_at TEXT NOT NULL)').run();
   const inserted=await env.DB.prepare('INSERT OR IGNORE INTO push_admin_event_dedupe(event_key,created_at) VALUES(?,?)').bind(eventKey,new Date().toISOString()).run();
   if(!Number.isInteger(inserted?.meta?.changes))return j({error:'dedupe_unavailable'},503);
   if(inserted.meta.changes===0)return j({ok:true,duplicate:true,total:0,sent:0,gone:0,failed:0});
   const payload=JSON.stringify({title:b.type==='final'?'משחק הסתיים':b.type==='halftime'?'מחצית':'תוצאה עודכנה',body:prefix+scoreText,url:'https://kazmikidev-afk.github.io/maccabi-rehovot-2026/#games',tag:'maccabi-'+eventKey});
   const result=await deliverPush(env,payload);
   return j({ok:true,duplicate:false,...result});
  }catch{return j({error:'notify_unavailable'},503);}
 }
 if(u.pathname==='/push/notify'&&request.method==='POST'){
  if(!env.NOTIFY_SECRET||request.headers.get('x-notify-secret')!==env.NOTIFY_SECRET)return j({error:'auth'},401);
  let b;try{b=await request.json();}catch{return j({error:'json'},400);}
  const payload=JSON.stringify({title:String(b.title||'עירוני רחובות').slice(0,80),body:String(b.body||'').slice(0,240),url:String(b.url||'https://kazmikidev-afk.github.io/maccabi-rehovot-2026/').slice(0,300),tag:String(b.tag||'maccabi-game')});
  return j({ok:true,...await deliverPush(env,payload)});
 }
 return j({error:'path'},404);
}
/* ===== סוף בלוק Push ===== */

const text=s=>s.replace(/<[^>]*>/g,'').replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim();

/* ===== Football data: JuniorLeague primary, Vole/ONE fallback - 20.10 =====
   Miki approved 20.10.2026: juniorleague.co.il is the league table + fixtures
   source; Vole/ONE stays as fallback. JuniorLeague's own league/cup pages are
   powered by a public unauthenticated JSON API (one request per page load,
   response cached 1h at the edge). Its match IDs embed IFA identifiers
   (season 28, league 173, team 2902), i.e. it mirrors official IFA data.
   leagueId stays 1277 in the response only because index.html validates that
   constant; the real IFA league id is 173. */
const JL_API='https://junior-league-api-server-928016183646.us-central1.run.app';
const JL_LEAGUE=encodeURIComponent("ליגת ילדים ג' מרכז");
const JL_CUP=encodeURIComponent('גביע ילדים ג\' ע"ש יעקב גרונדמן ז"ל');
const JL_LEAGUE_PAGE='https://www.juniorleague.co.il/%d7%99%d7%9c%d7%93%d7%99%d7%9d-%d7%92-%d7%9e%d7%a8%d7%9b%d7%96-26-27/';
const JL_CUP_PAGE='https://www.juniorleague.co.il/%d7%99%d7%9c%d7%93%d7%99%d7%9d-%d7%92-%d7%92%d7%91%d7%99%d7%a2-%d7%94%d7%9e%d7%93%d7%99%d7%a0%d7%94/';
const VOLE_LEAGUE_PAGE='https://vole.one.co.il/league/1277';
const IFA_CUP_PAGE='https://www.football.org.il/national-cup/?national_cup_id=592&season_id=28';

async function getJson(url){const r=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'maccabi-rehovot-site/1.0','Accept':'application/json'}});if(!r.ok)throw Error('source_unavailable');return r.json();}

// Israel offset for season 26/27: IDT (UTC+3) until 25.10.2026 and again from
// 26.3.2027; IST (UTC+2) in between. Used to anchor date-only games to local
// midnight so the site's existing "00:00 = unconfirmed time" guard works.
function ilMidnightIso(dateTime){const day=String(dateTime).slice(0,10);const off=(day<'2026-10-25'||day>='2027-03-26')?3:2;return new Date(Date.parse(day+'T00:00:00Z')-off*3600000).toISOString();}

function jlGame(m,roundLabel){
 if(!m||typeof m.dateTime!=='string'||!m.dateTime)return null;
 const hasTime=m.hasTime===true;
 const hs=m.homeScore,as=m.awayScore;
 return {id:m.id,date:hasTime?m.dateTime:ilMidnightIso(m.dateTime),round:roundLabel,
  home:{id:Number(m.homeTeamId),name:m.homeTeam||''},away:{id:Number(m.awayTeamId),name:m.awayTeam||''},
  score:(hs!=null&&as!=null)?[hs,as]:null,venue:m.venue||null,timeConfirmed:hasTime};
}

// Mirrors juniorleague league.js exactly: teams from matches, skip
// excludeFromLeagueTable, 3/1/0, additive pointsAdjustments, sort by points,
// goal difference, then goals for.
function jlStandings(payload){
 if(!payload||!Array.isArray(payload.matches))throw Error('invalid_standings_source');
 const t=new Map();
 for(const m of payload.matches){
  if(m.homeTeamId==null||m.awayTeamId==null)continue;
  if(!t.has(m.homeTeamId))t.set(m.homeTeamId,{team:m.homeTeam||'',p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0});
  if(!t.has(m.awayTeamId))t.set(m.awayTeamId,{team:m.awayTeam||'',p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0});
 }
 for(const m of payload.matches){
  if(m.excludeFromLeagueTable||m.homeScore==null||m.awayScore==null)continue;
  const h=t.get(m.homeTeamId),a=t.get(m.awayTeamId);if(!h||!a)continue;
  h.p++;a.p++;h.gf+=m.homeScore;h.ga+=m.awayScore;a.gf+=m.awayScore;a.ga+=m.homeScore;
  if(m.homeScore>m.awayScore){h.w++;a.l++;h.pts+=3;}
  else if(m.homeScore<m.awayScore){a.w++;h.l++;a.pts+=3;}
  else{h.d++;a.d++;h.pts++;a.pts++;}
 }
 for(const adj of (payload.league&&payload.league.pointsAdjustments)||[]){const r=t.get(String(adj.teamId));if(r&&Number.isFinite(adj.points))r.pts+=adj.points;}
 const rows=[...t.values()].sort((x,y)=>y.pts-x.pts||(y.gf-y.ga)-(x.gf-x.ga)||y.gf-x.gf);
 rows.forEach((r,i)=>r.rank=i+1);
 if(!rows.length||!rows.some(r=>String(r.team).includes('מרמורק')))throw Error('team_not_found');
 return rows;
}

const CUP_LETTERS='אבגדהוזחטי';
async function jlLeaguePart(round){
 const L=await getJson(`${JL_API}/api/public/leagues/${JL_LEAGUE}/matches?season=28`);
 const games=(L.matches||[]).filter(m=>m.round===round+1).map(m=>jlGame(m,'מחזור '+(round+1))).filter(Boolean);
 return {standings:jlStandings(L),leagueGames:games};
}
async function jlCupPart(cupRound){
 const C=await getJson(`${JL_API}/api/public/cups/${JL_CUP}/matches?season=28`);
 if(!C||!Array.isArray(C.matches))throw Error('invalid_cup_source');
 const letter=CUP_LETTERS[cupRound]||String(cupRound+1);
 const games=(C.matches||[]).filter(m=>m.round===cupRound+1).map(m=>jlGame(m,'סיבוב '+letter)).filter(Boolean);
 return {cupGames:games};
}

/* ===== Vole/ONE fallback (the pre-20.10 source) ===== */
async function voleGames(j){
 if(!Array.isArray(j.games))throw Error('invalid_games');
 return j.games.map(g=>{if(g.season_id!==28)throw Error('season_mismatch');const team=t=>({id:t.provider?.id,name:t.provider?.name||t.one?.name||''});return {id:g._id,date:g.date,round:g.round?.name,home:team(g.home.team),away:team(g.away.team),score:g.is_finished&&g.home.goals>=0&&g.away.goals>=0?[g.home.goals,g.away.goals]:null};});
}
async function voleLeaguePart(round){
 const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('source_unavailable');return r;};
 const [html,L]=await Promise.all([get(VOLE_LEAGUE_PAGE).then(r=>r.text()),get('https://vole.one.co.il/api/leagues/rounds?league_id=1277&round='+round).then(r=>r.json())]);
 if(!html.includes('season_id\\":28')&&!html.includes('season_id":28'))throw Error('season_mismatch');
 const table=html.match(/<table[^>]*>([\s\S]*?)<\/table>/)?.[1]||'';
 const standings=[];
 for(const row of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)){
  const cells=[...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x=>text(x[1]));
  if(cells.length<10)continue;
  const goals=cells[7].match(/(\d+)\s*-\s*(\d+)/);if(!goals)throw Error('invalid_standings');
  standings.push({rank:Number(cells[1]),team:cells[2],p:Number(cells[3]),w:Number(cells[4]),d:Number(cells[5]),l:Number(cells[6]),gf:Number(goals[1]),ga:Number(goals[2]),pts:Number(cells.at(-1))});
 }
 if(!standings.length||!standings.some(r=>r.team.includes('מרמורק')))throw Error('team_not_found');
 return {standings,leagueGames:await voleGames(L)};
}
async function voleCupPart(cupRound){
 const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('source_unavailable');return r;};
 const C=await get('https://vole.one.co.il/api/leagues/rounds?league_id=1304&round='+cupRound).then(r=>r.json());
 return {cupGames:await voleGames(C)};
}

export default {
 async fetch(request,env,ctx){
  const u=new URL(request.url);
  if(u.pathname==='/football'){
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET, OPTIONS'}});
   if(request.method!=='GET')return json({error:'method_not_allowed'},405);
   const round=Number(u.searchParams.get('round')||0),cupRound=Number(u.searchParams.get('cupRound')||0);
   if(!Number.isInteger(round)||round<0||round>29||!Number.isInteger(cupRound)||cupRound<0||cupRound>9)return json({error:'invalid_round'},400);
   const key=new Request(u.origin+'/football?round='+round+'&cupRound='+cupRound+'&v=jl1'); // v=jl1: 20.10 source switch; bumps the edge cache past pre-switch entries
   const cache=globalThis.caches?.default;
   const hit=cache&&await cache.match(key);if(hit)return hit;
   try{
    let leaguePart,sourceLeague,cupPart,sourceCup;
    try{leaguePart=await jlLeaguePart(round);sourceLeague='juniorleague';}
    catch{leaguePart=await voleLeaguePart(round);sourceLeague='vole';}
    try{cupPart=await jlCupPart(cupRound);sourceCup='juniorleague';}
    catch{try{cupPart=await voleCupPart(cupRound);sourceCup='vole';}catch{cupPart={cupGames:[]};sourceCup='unavailable';}}
    const data={season:28,teamId:2902,leagueId:1277,leagueName:"ליגת ילדים ג' מרכז",round,cupRound,
     standings:leaguePart.standings,leagueGames:leaguePart.leagueGames,cupGames:cupPart.cupGames,
     sourceLeague,sourceCup,updatedAt:new Date().toISOString(),
     leagueUrl:sourceLeague==='juniorleague'?JL_LEAGUE_PAGE:VOLE_LEAGUE_PAGE,
     cupUrl:sourceCup==='juniorleague'?JL_CUP_PAGE:IFA_CUP_PAGE};
    const response=json(data);response.headers.set('Cache-Control','public, max-age=3600');if(cache)ctx.waitUntil(cache.put(key,response.clone()));return response;
   }catch{return json({error:'football_source_unavailable'},502);}
  }
  if(u.pathname.startsWith('/push/'))return handlePush(request,env,u);
  if(!env.SERVICE)return new Response(JSON.stringify({error:'gateway_unavailable'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  const upstream=await env.SERVICE.fetch(request);const headers=new Headers(upstream.headers);headers.set('Cache-Control','no-store');return new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers});
 }
};
