const ORIGIN='https://kazmikidev-afk.github.io';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':ORIGIN,'Cache-Control':'public, max-age=300'}});
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
    const leagueUrl='https://vole.one.co.il/league/1284',cupUrl='https://vole.one.co.il/league/1304';
    const [html,L,C]=await Promise.all([get(leagueUrl).then(r=>r.text()),get('https://vole.one.co.il/api/leagues/rounds?league_id=1284&round='+round).then(r=>r.json()),get('https://vole.one.co.il/api/leagues/rounds?league_id=1304&round='+cupRound).then(r=>r.json())]);
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
    const data={season:28,teamId:2902,leagueId:1284,leagueName:"ליגת ילדים ג' שפלה",round,cupRound,standings,leagueGames:games(L),cupGames:games(C),updatedAt:new Date().toISOString(),leagueUrl,cupUrl};
    const response=json(data);response.headers.set('Cache-Control','public, max-age=3600');if(cache)ctx.waitUntil(cache.put(key,response.clone()));return response;
   }catch{return json({error:'football_source_unavailable'},502);}
  }
  if(!env.SERVICE)return new Response(JSON.stringify({error:'gateway_unavailable'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  const upstream=await env.SERVICE.fetch(request);const headers=new Headers(upstream.headers);headers.set('Cache-Control','no-store');return new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers});
 }
};
