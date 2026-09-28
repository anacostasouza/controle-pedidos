/* Browser smoke test against a compiled frontend using synthetic HTTP fixtures.
   No real Firebase account or production database is accessed.
   Build functions first, serve crm with demo-crm/emulator settings, then run.
   Optional PLAYWRIGHT_MODULE points to an existing local Playwright installation. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const domain=require('../../functions/lib/crm/domain');
const now=new Date().toISOString(),day=domain.today(),uid='crm-demo-admin';
const actor={uid,name:'Ana Martins',role:'admin'};
const companies=[{id:'company1',name:'Aurora Arquitetura',active:true,createdAt:now},{id:'company2',name:'Café Horizonte',active:true,createdAt:now}];
const names=['Mariana Costa','Rafael Almeida','Camila Santos','Lucas Ferreira','Beatriz Lima'];
const clients=names.map((name,i)=>({id:`c${i}`,name,phone:'11987654321',email:`contato${i}@example.com`,companyId:i%2?'company2':'company1',active:true,createdAt:now}));
const opportunities=names.map((_,i)=>({...domain.newOpportunity(`o${i}`,`c${i}`,actor,now),ownerId:uid,valueCents:[4850000,1850000,3200000,2100000,850000][i],rating:[4,3,5,2,4][i],channel:['Indicação','WhatsApp','E-mail','Presencial','Site'][i],stage:domain.STAGES[i%4],serviceGroup:'Comunicação visual'}));
let tasks=[{id:'initialTask',opportunityId:'o0',ownerId:uid,kind:'D+1',cycle:1,dueDate:day,originalDueDate:day,source:'automatic',status:'pending',result:'',notes:'Apresentar opções de acabamento.',completedDate:null,completedAt:null,finalFollowUp:false,createdAt:now,reschedules:[]}];
opportunities[0].sentDate=day;opportunities[0].cycle=1;opportunities[0].stage='Proposta enviada';
const history={};
const errors=[];const checks=[];
let forceUnauthorized=false;
const row=o=>({...o,canEdit:true,client:clients.find(c=>c.id===o.clientId),company:companies.find(e=>e.id===clients.find(c=>c.id===o.clientId)?.companyId)});
const jwt=()=>{const t=Math.floor(Date.now()/1000);return `${Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({iss:'https://securetoken.google.com/demo-crm',aud:'demo-crm',auth_time:t,user_id:uid,sub:uid,iat:t,exp:t+3600,email:'desenhar@gmail.com',email_verified:true,firebase:{identities:{email:['desenhar@gmail.com']},sign_in_provider:'password'}})).toString('base64url')}.`;};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CRM_BROWSER_CHANNEL?{channel:process.env.CRM_BROWSER_CHANNEL}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/fonts.googleapis.com/**',r=>r.abort());await page.route('**/fonts.gstatic.com/**',r=>r.abort());
 await page.route('**/identitytoolkit.googleapis.com/**',async route=>{const url=route.request().url();await route.fulfill({json:url.includes('accounts:lookup')?{users:[{localId:uid,email:'desenhar@gmail.com',displayName:'Ana Martins',emailVerified:true,providerUserInfo:[{providerId:'google.com',email:'desenhar@gmail.com',federatedId:'google-demo'}]}]}:{localId:uid,email:'desenhar@gmail.com',displayName:'Ana Martins',idToken:jwt(),refreshToken:'synthetic',expiresIn:'3600',registered:true}});});
 await page.route('**/crmApi/**',async route=>{
  const req=route.request(),url=new URL(req.url()),p=url.pathname.split('/crmApi')[1],method=req.method(),body=req.postDataJSON() || {};
  if(method==='OPTIONS')return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}});
  let out={};let status=200;
  try{
   if(forceUnauthorized && p==='/bootstrap'){status=401;out={message:'Token expirado'};}
   else if(p==='/bootstrap')out={actor,settings:domain.DEFAULT_SETTINGS,users:[{id:uid,name:actor.name,active:true,role:'admin',sector:'SUPORTE'}]};
   else if(p==='/clients' || p==='/companies'){const items=p==='/clients'?clients:companies;out={items,total:items.length,nextOffset:null};}
   else if(p.startsWith('/clients/') && method==='PUT'){const id=p.split('/')[2];clients.push({...body,id,createdAt:now});out={id};}
   else if(p.startsWith('/companies/') && method==='PUT'){const id=p.split('/')[2];companies.push({...body,id,createdAt:now});out={id};}
   else if(p==='/opportunities' && method==='POST'){const o=domain.newOpportunity(body.id,body.clientId,actor,now);domain.patchOpportunity(o,body,domain.DEFAULT_SETTINGS);opportunities.push(o);out=o;}
   else if(p==='/opportunities'){const list=opportunities.filter(o=>(!url.searchParams.get('state')||o.state===url.searchParams.get('state'))&&(!url.searchParams.get('ownerId')||o.ownerId===url.searchParams.get('ownerId'))).map(row);out={items:list,total:list.length,nextOffset:null};}
   else if(p==='/day'){const active=opportunities.filter(o=>o.state==='active');const planned=tasks.filter(t=>t.dueDate===day);out={day,metrics:{portfolio:active.reduce((s,o)=>s+(o.valueCents||0),0),activeCount:active.length,missingValue:0,wonValue:2400000,wonCount:4,negotiationValue:2100000,contacts:tasks.filter(t=>t.status==='done').length,planned:planned.length,done:planned.filter(t=>t.status==='done').length},tasks:tasks.map(t=>({...t,opportunity:opportunities.find(o=>o.id===t.opportunityId),client:clients.find(c=>c.id===opportunities.find(o=>o.id===t.opportunityId)?.clientId),company:companies[0]}))};}
   else if(p.endsWith('/actions')){const id=p.split('/')[2],index=opportunities.findIndex(o=>o.id===id);const state=domain.applyCommand(opportunities[index],tasks.filter(t=>t.opportunityId===id),actor,body.action,body,domain.DEFAULT_SETTINGS,new Date().toISOString());opportunities[index]=state.opportunity;tasks=[...tasks.filter(t=>t.opportunityId!==id),...state.tasks];history[id]=[{id:`h${state.opportunity.version}`,at:now,actorName:actor.name,action:body.action},...(history[id]||[])];out=state;}
   else if(p.startsWith('/opportunities/')){const id=p.split('/')[2];out={opportunity:opportunities.find(o=>o.id===id),tasks:tasks.filter(t=>t.opportunityId===id),history:history[id]||[],canEdit:true};}
   else throw new Error(`Unexpected request: ${method} ${p}`);
  }catch(e){status=e.status||500;out={message:e.message};}
  await route.fulfill({status,json:out,headers:{'Access-Control-Allow-Origin':'*'}});
 });
 const screenshotDir=process.env.CRM_SCREENSHOTS || path.resolve(__dirname,'../../docs/screenshots');fs.mkdirSync(screenshotDir,{recursive:true});
 await page.goto(process.env.CRM_BASE_URL || 'http://localhost:5175');
 if (process.env.CRM_TEST_AUTH_EMULATOR === 'true') {
  await page.getByText('Acesso local de teste',{exact:true}).click();await page.getByLabel('E-mail',{exact:true}).fill('desenhar@gmail.com');await page.getByLabel('Senha',{exact:true}).fill('synthetic-password');await page.getByRole('button',{name:'Entrar no emulador',exact:true}).click();
 } else {
  await page.getByRole('button',{name:'Entrar com Google',exact:true}).click();
 }
 await page.getByRole('heading',{name:/Vamos fazer acontecer/}).waitFor();await page.locator('.metric-grid').waitFor();checks.push('Login e dashboard');
 await page.screenshot({path:path.join(screenshotDir,'meu-dia-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'Oportunidades',exact:true}).click();await page.locator('.opportunity-card').first().waitFor();await page.screenshot({path:path.join(screenshotDir,'kanban-desktop.png'),fullPage:true});checks.push('Kanban');
 await page.getByRole('button',{name:'＋ Nova oportunidade',exact:true}).click();await page.getByLabel('Nome do cliente *',{exact:true}).fill('Cliente de teste CRM');await page.getByLabel('Telefone',{exact:true}).fill('11999999999');await page.getByRole('button',{name:'＋ Nova empresa',exact:true}).click();await page.getByLabel('Nome da nova empresa',{exact:true}).fill('Empresa de teste CRM');await page.getByLabel('CNPJ',{exact:true}).fill('12.345.678/0001-90');await page.getByRole('button',{name:'Cadastrar e vincular',exact:true}).click();await page.getByRole('button',{name:'＋ Nova empresa',exact:true}).waitFor();checks.push('Cadastro de empresa dentro do cadastro do cliente');await page.getByLabel('Vendedor responsável',{exact:true}).selectOption(uid);await page.getByRole('button',{name:'Criar oportunidade',exact:true}).click();
 await page.getByRole('heading',{name:'Cliente de teste CRM',exact:true}).waitFor();checks.push('Criação pela recepção/cadastro');
 await page.getByRole('button',{name:'4 estrelas',exact:true}).click();await page.getByLabel('Valor (R$)',{exact:true}).fill('3500');await page.getByRole('button',{name:'Salvar dados',exact:true}).click();await page.getByRole('status').filter({hasText:'Alteração salva.'}).waitFor();assert.equal(opportunities.at(-1).rating,4);assert.equal(opportunities.at(-1).valueCents,350000);checks.push('Valor e estrelas');
 await page.getByText('Registrar envio da proposta',{exact:true}).click();await page.getByRole('button',{name:'Registrar envio',exact:true}).click();await page.locator('.task-card').filter({hasText:'D+7'}).waitFor();assert.equal(tasks.filter(t=>t.opportunityId===opportunities.at(-1).id).length,3);checks.push('Envio e tarefas automáticas');
 const first=page.locator('.task-card').filter({has:page.getByRole('heading',{name:/D\+1/})});await first.getByText('Registrar contato',{exact:true}).click();await first.getByRole('button',{name:'Concluir acompanhamento',exact:true}).click();await page.getByRole('status').filter({hasText:'Contato registrado.'}).waitFor();checks.push('Registro de contato');
 const third=page.locator('.task-card').filter({has:page.getByRole('heading',{name:/D\+3/})});await third.getByText('Reagendar',{exact:true}).click();await third.getByLabel('Nova data',{exact:true}).fill(domain.addDays(day,12));await third.getByLabel('Justificativa',{exact:true}).fill('Cliente pediu retorno nesta data');await third.getByRole('button',{name:'Salvar nova data',exact:true}).click();await page.getByRole('status').filter({hasText:'Alteração salva.'}).waitFor();assert.equal(tasks.filter(t=>t.opportunityId===opportunities.at(-1).id && t.kind==='D+3')[0].source,'manual');checks.push('Reagendamento com justificativa');
 await page.getByRole('button',{name:'Dados',exact:true}).click();await page.getByText('Concluir oportunidade',{exact:true}).click();await page.getByLabel('Resultado',{exact:true}).selectOption('Perdido');await page.getByLabel('Motivo da perda *',{exact:true}).selectOption('Preço');await page.getByRole('button',{name:'Registrar conclusão',exact:true}).click();await page.getByRole('status').filter({hasText:'Alteração salva.'}).waitFor();assert.equal(opportunities.at(-1).lossReason,'Preço');assert.equal(opportunities.at(-1).state,'closed');checks.push('Conclusão com motivo de perda');
 await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.getByRole('button',{name:'Meu Dia',exact:true}).click();await page.locator('.metric-grid').waitFor();await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(screenshotDir,'meu-dia-mobile.png'),fullPage:true});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);assert.equal(overflow,false,'Mobile page overflows');checks.push('Layout mobile sem rolagem horizontal global');
 forceUnauthorized=true; await page.reload(); await page.getByRole('button',{name:'Entrar com Google',exact:true}).waitFor(); checks.push('Sessão expirada encerra acesso');
 assert.deepEqual(errors,[],'Unexpected browser errors');
 console.log(JSON.stringify({checks,consoleErrors:errors,screenshotDir},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
