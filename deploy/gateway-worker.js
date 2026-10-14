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
async function handlePush(request,env,u){
 const j=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':ORIGIN,'Cache-Control':'no-store'}});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'content-type, x-notify-secret'}});
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
 if(u.pathname==='/push/notify'&&request.method==='POST'){
  if(!env.NOTIFY_SECRET||request.headers.get('x-notify-secret')!==env.NOTIFY_SECRET)return j({error:'auth'},401);
  let b;try{b=await request.json();}catch{return j({error:'json'},400);}
  const payload=JSON.stringify({title:String(b.title||'מכבי רחובות').slice(0,80),body:String(b.body||'').slice(0,240),url:String(b.url||'https://kazmikidev-afk.github.io/maccabi-rehovot-2026/').slice(0,300),tag:String(b.tag||'maccabi-game')});
  const rows=((await env.DB.prepare('SELECT endpoint,p256dh,auth FROM push_subs').all()).results)||[];
  let sent=0,gone=0,failed=0;const errs=[];
  for(const s of rows){
   try{const st=await sendPush(env,s,payload);
    if(st===201)sent++;
    else if(st===404||st===410){gone++;await env.DB.prepare('DELETE FROM push_subs WHERE endpoint=?').bind(s.endpoint).run();}
    else{failed++;errs.push(st);}
   }catch(e){failed++;errs.push(String(e&&e.message||e).slice(0,80));}
  }
  return j({ok:true,total:rows.length,sent,gone,failed,errs:errs.slice(0,3)});
 }
 return j({error:'path'},404);
}
/* ===== סוף בלוק Push ===== */

const text=s=>s.replace(/<[^>]*>/g,'').replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim();
export default {
 async fetch(request,env,ctx){
  const u=new URL(request.url);
  if(u.pathname==='/football'){
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET, OPTIONS'}});
   if(request.method!=='GET')return json({error:'method_not_allowed'},405);
   const round=Number(u.searchParams.get('round')||0),cupRound=Number(u.searchParams.get('cupRound')||0);
   if(!Number.isInteger(round)||round<0||round>29||!Number.isInteger(cupRound)||cupRound<0||cupRound>9)return json({error:'invalid_round'},400);
   const key=new Request(u.origin+'/football?round='+round+'&cupRound='+cupRound);
   const cache=globalThis.caches?.default;
   const hit=cache&&await cache.match(key);if(hit)return hit;
   try{
    const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('source_unavailable');return r;};
    const leagueUrl='https://vole.one.co.il/league/1277',cupUrl='https://vole.one.co.il/league/1304';
    const [html,L,C]=await Promise.all([get(leagueUrl).then(r=>r.text()),get('https://vole.one.co.il/api/leagues/rounds?league_id=1277&round='+round).then(r=>r.json()),get('https://vole.one.co.il/api/leagues/rounds?league_id=1304&round='+cupRound).then(r=>r.json())]);
    if(!html.includes('season_id\\":28')&&!html.includes('season_id":28'))throw Error('season_mismatch');
    const table=html.match(/<table[^>]*>([\s\S]*?)<\/table>/)?.[1]||'';
    const standings=[];
    for(const row of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)){
     const cells=[...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x=>text(x[1]));
     if(cells.length<10)continue;
     const goals=cells[7].match(/(\d+)\s*-\s*(\d+)/);if(!goals)throw Error('invalid_standings');
     standings.push({rank:Number(cells[1]),team:cells[2],p:Number(cells[3]),w:Number(cells[4]),d:Number(cells[5]),l:Number(cells[6]),gf:Number(goals[1]),ga:Number(goals[2]),pts:Number(cells.at(-1))});
    }
    if(!standings.length||!standings.some(r=>r.team.includes('מרמורק')&&r.team.includes('רחובות')))throw Error('team_not_found');
    const games=j=>{if(!Array.isArray(j.games))throw Error('invalid_games');return j.games.map(g=>{if(g.season_id!==28)throw Error('season_mismatch');const team=t=>({id:t.provider?.id,name:t.provider?.name||t.one?.name||''});const home=team(g.home.team),away=team(g.away.team);return {id:g._id,date:g.date,round:g.round?.name,home,away,score:g.is_finished&&g.home.goals>=0&&g.away.goals>=0?[g.home.goals,g.away.goals]:null};});};
    const data={season:28,teamId:2902,leagueId:1277,leagueName:"ליגת ילדים ג' מרכז",round,cupRound,standings,leagueGames:games(L),cupGames:games(C),updatedAt:new Date().toISOString(),leagueUrl,cupUrl};
    const response=json(data);response.headers.set('Cache-Control','public, max-age=3600');if(cache)ctx.waitUntil(cache.put(key,response.clone()));return response;
   }catch{return json({error:'football_source_unavailable'},502);}
  }
  if(u.pathname.startsWith('/push/'))return handlePush(request,env,u);
  if(!env.SERVICE)return new Response(JSON.stringify({error:'gateway_unavailable'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  const upstream=await env.SERVICE.fetch(request);const headers=new Headers(upstream.headers);headers.set('Cache-Control','no-store');return new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers});
 }
};
