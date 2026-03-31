let S = {
  members: [], ogx: [], icx: [], b2b: [], activity: [],
  ogxTab: 'Approval', icxTab: 'Approval',
  nextId: { members: 1, ogx: 1, icx: 1, b2b: 1 }
};

async function apiSave(module, record, actionLog) {
  const user = document.getElementById('logged-in-user')?.textContent || 'User';
  try {
    const res = await fetch('/api/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module, record, actionLog, user })
    });
    const data = await res.json();
    if(data.nextId) S.nextId[module] = data.nextId;
  } catch(e) { console.error('apiSave error', e); }
}

async function apiDelete(module, id) {
  const user = document.getElementById('logged-in-user')?.textContent || 'User';
  try {
    await fetch('/api/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module, id, user })
    });
  } catch(e) { console.error('apiDelete error', e); }
}

// drawer state
let DM=null,DR=null,isEdit=false;

// temp file staging for modals
const staging = {};
window.ogxContractFiles=[];window.ogxExpmailFiles=[];
window.icxPassportFiles=[];window.icxExpmailFiles=[];

// ===== NAV =====
function navigate(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  const pages=['dashboard','members','ogx','icx','b2b','activity','mustsu'];
  document.querySelectorAll('.nav-item').forEach((n,i)=>{n.classList.toggle('active',pages[i]===page)});
  closeDrawer();
  const renderers={dashboard:renderDashboard,members:renderMembers,ogx:renderOGX,icx:renderICX,b2b:renderB2B,activity:renderActivity,mustsu:mustsuInit};
  if(renderers[page]) renderers[page]();
}

// ===== BADGES =====
const B = {
  role:r=>{ const m={EB:'eb',VP:'vp',TL:'tl',Member:'member'}; return `<span class="badge badge-${m[r]||'member'}">${r}</span>`},
  fn:  f=>{ const m={TM:'member',oGV:'ogv',oGT:'ogt',iGV:'igv',iGT:'igt',B2B:'b2b2','F&L':'fl'}; return `<span class="badge badge-${m[f]||'member'}">${f}</span>`},
  ct:  c=>{ const m={'New Contract':'new-contract','Re-Approval':'re-approval','Realization':'realization'}; return `<span class="badge badge-${m[c]||'prospect'}">${c}</span>`},
  stage: s=>{ const m={Prospect:'prospect',Negotiation:'negotiation','Contract Sent':'contract-sent','Closed Won':'closed-won','Closed Lost':'closed-lost',Approval:'approval',Realization:'realization',Completed:'completed'}; return `<span class="badge badge-${m[s]||'prospect'}">${s}</span>`},
  b2bStage: s=>{ const m={'Market Research':'b2b-mr','Lead':'b2b-lead','First Contact':'b2b-fc','Visit':'b2b-visit','Follow Up Visit':'b2b-fuv','Raised':'b2b-raised','Prospect List':'b2b-pl'}; return `<span class="badge badge-b2bstage badge-b2bstage-${m[s]||'b2b-lead'}">${s}</span>`},
  b2bType: t=>{ const m={GV:'ogv',GT:'ogt',BD:'b2b2'}; return `<span class="badge badge-${m[t]||'member'}">${t}</span>`},
  status:s=>`<span class="badge badge-${s==='Active'?'active':'closed'}">${s}</span>`,
  action:a=>`<span class="badge badge-${a}">${a}</span>`,
  product:p=>{ const m={oGV:'ogv',oGT:'ogt',iGV:'igv',iGT:'igt'}; return `<span class="badge badge-${m[p]||'ogv'}">${p}</span>`}
};

function fmtFiles(files){return files&&files.length?`<span style="color:var(--accent)">📎 ${files.length}</span>`:'<span style="color:var(--text-light)">—</span>'}
function fmtSize(b){if(!b)return'';if(b<1024)return b+'B';if(b<1048576)return(b/1024).toFixed(1)+'KB';return(b/1048576).toFixed(1)+'MB'}
function todayStr(){const d=new Date();return`${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`}
function nowStr(){return new Date().toLocaleString()}
function log(user,action,module,id){
  S.activity.unshift({user,action,module,recordId:'#'+id,ts:nowStr()});
  
  const dbMod = module === 'B2B Deals' || module === 'B2B DEALS' ? 'b2b' : module.toLowerCase();
  if (action !== 'deleted') {
    const record = S[dbMod].find(x => x.id === id);
    if(record) Object.assign(record, { _isPersisting: true }); // Avoid any proxy issues if needed
    if(record) apiSave(dbMod, record, action);
  } else {
    apiDelete(dbMod, id);
  }
}

// ===== MODAL FILE UPLOAD =====
function handleModalUpload(input, zoneId, chipsId, globalVar){
  if(!input.files.length)return;
  Array.from(input.files).forEach(f=>{
    window[globalVar].push({name:f.name,url:URL.createObjectURL(f),type:f.type,size:f.size});
  });
  input.value='';
  renderModalChips(chipsId,globalVar,zoneId);
  document.getElementById(zoneId).classList.add('has-file');
}

function renderModalChips(chipsId,globalVar,zoneId){
  const files=window[globalVar];
  document.getElementById(chipsId).innerHTML=files.map((f,i)=>`
    <span class="chip" title="${f.name}">
      📄 <span>${f.name}</span>
      <span class="chip-x" onclick="removeModalFile('${globalVar}','${chipsId}','${zoneId}',${i})">×</span>
    </span>`).join('');
}

function removeModalFile(globalVar,chipsId,zoneId,idx){
  window[globalVar].splice(idx,1);
  renderModalChips(chipsId,globalVar,zoneId);
  if(!window[globalVar].length) document.getElementById(zoneId).classList.remove('has-file');
}

function resetModalFiles(){
  ['ogxContractFiles','ogxExpmailFiles','icxPassportFiles','icxExpmailFiles'].forEach(k=>window[k]=[]);
  ['ogx-contract-chips','ogx-expmail-chips','icx-passport-chips','icx-expmail-chips'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='';});
  ['ogx-contract-zone','ogx-expmail-zone','icx-passport-zone','icx-expmail-zone'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('has-file');});
}

// ===== VIEW FILE =====
function viewFile(url,name){
  const ext=(name.split('.').pop()||'').toLowerCase();
  const imgs=['jpg','jpeg','png','gif','webp','svg','bmp'];
  const w=window.open('','_blank','width=900,height=700');
  if(imgs.includes(ext)){
    w.document.write(`<html><head><title>${name}</title><style>body{margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:100%;max-height:100vh;object-fit:contain}
/* ===== MOBILE RESPONSIVE ===== */
@media (max-width: 768px) {
  :root { --sidebar-w: 0px; }
  body { flex-direction: column; height: auto; min-height: 100vh; overflow: auto; }
  .sidebar {
    position: fixed; top: 0; left: 0; height: 100vh; width: 220px !important;
    z-index: 1200; transform: translateX(-100%); transition: transform .25s cubic-bezier(.4,0,.2,1);
    overflow-y: auto;
  }
  .sidebar.mobile-open { transform: translateX(0); }
  .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 1100; display: none; }
  .sidebar-overlay.open { display: block; }
  .main { flex: 1; width: 100%; }
  .topbar { padding: 0 12px; gap: 8px; }
  .hamburger { display: flex !important; align-items: center; justify-content: center; width: 34px; height: 34px; cursor: pointer; border: none; background: transparent; color: var(--text-muted); flex-shrink: 0; }
  .content { padding: 16px 12px 32px; }
  .stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .charts-row { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; gap: 10px; align-items: flex-start; }
  .table-toolbar { flex-direction: column; align-items: stretch; }
  .search-input { max-width: 100% !important; }
  .modal { width: 96vw !important; max-width: 96vw !important; padding: 18px; }
  .drawer { width: 100% !important; max-width: 100%; }
  .b2b-detail-body { grid-template-columns: 1fr; overflow: auto; }
  .b2b-detail-right { border-left: none; border-top: 1px solid var(--border); height: 400px; }
  .b2b-info-grid { grid-template-columns: 1fr; }
  .tabs { overflow-x: auto; width: 100%; }
  .confirm-box { width: 90vw !important; }
  table { font-size: 12px; }
  td, thead th { padding: 8px 10px !important; }
  .stat-value { font-size: 22px; }

  #login-overlay { padding: 16px; align-items: flex-start; }
  .login-card { padding: 28px 20px 24px; border-radius: 10px; margin: auto; }
  .login-logo { width: 180px; margin-bottom: 20px; }
  .login-title { font-size: 16px; }
  .login-input { font-size: 16px !important; } /* prevent iOS zoom */
  .login-btn { padding: 13px; font-size: 15px; }
}
@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr; }
  .bar-chart-inner { gap: 10px; }
}
</style></head><body><img src="${url}"></body></html>`);
  } else if(ext==='pdf'){
    w.document.write(`<html><head><title>${name}</title></head><body style="margin:0"><embed src="${url}" width="100%" height="100%" type="application/pdf"></body></html>`);
  } else {
    w.document.write(`<html><head><title>${name}</title><style>body{font-family:sans-serif;padding:40px;background:#f9f9f9}h2{margin-bottom:16px}.dl{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-family:sans-serif;font-size:14px}
/* ===== MOBILE RESPONSIVE ===== */
@media (max-width: 768px) {
  :root { --sidebar-w: 0px; }
  body { flex-direction: column; height: auto; min-height: 100vh; overflow: auto; }
  .sidebar {
    position: fixed; top: 0; left: 0; height: 100vh; width: 220px !important;
    z-index: 1200; transform: translateX(-100%); transition: transform .25s cubic-bezier(.4,0,.2,1);
    overflow-y: auto;
  }
  .sidebar.mobile-open { transform: translateX(0); }
  .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 1100; display: none; }
  .sidebar-overlay.open { display: block; }
  .main { flex: 1; width: 100%; }
  .topbar { padding: 0 12px; gap: 8px; }
  .hamburger { display: flex !important; align-items: center; justify-content: center; width: 34px; height: 34px; cursor: pointer; border: none; background: transparent; color: var(--text-muted); flex-shrink: 0; }
  .content { padding: 16px 12px 32px; }
  .stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .charts-row { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; gap: 10px; align-items: flex-start; }
  .table-toolbar { flex-direction: column; align-items: stretch; }
  .search-input { max-width: 100% !important; }
  .modal { width: 96vw !important; max-width: 96vw !important; padding: 18px; }
  .drawer { width: 100% !important; max-width: 100%; }
  .b2b-detail-body { grid-template-columns: 1fr; overflow: auto; }
  .b2b-detail-right { border-left: none; border-top: 1px solid var(--border); height: 400px; }
  .b2b-info-grid { grid-template-columns: 1fr; }
  .tabs { overflow-x: auto; width: 100%; }
  .confirm-box { width: 90vw !important; }
  table { font-size: 12px; }
  td, thead th { padding: 8px 10px !important; }
  .stat-value { font-size: 22px; }

  #login-overlay { padding: 16px; align-items: flex-start; }
  .login-card { padding: 28px 20px 24px; border-radius: 10px; margin: auto; }
  .login-logo { width: 180px; margin-bottom: 20px; }
  .login-title { font-size: 16px; }
  .login-input { font-size: 16px !important; } /* prevent iOS zoom */
  .login-btn { padding: 13px; font-size: 15px; }
}
@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr; }
  .bar-chart-inner { gap: 10px; }
}
</style></head><body><h2>📄 ${name}</h2><p style="color:#666;margin-bottom:20px">Preview not available for this file type.</p><a class="dl" href="${url}" download="${name}">⬇ Download</a></body></html>`);
  }
}

function downloadFile(url,name){const a=document.createElement('a');a.href=url;a.download=name;a.click()}

// ===== DASHBOARD =====
function renderDashboard(){
  document.getElementById('stat-members').textContent=S.members.length;
  document.getElementById('stat-ogx').textContent=S.ogx.length;
  document.getElementById('stat-icx').textContent=S.icx.length;
  document.getElementById('stat-b2b').textContent=S.b2b.length;
  const bData=[{l:'Jan',o:2,i:1,b:1},{l:'Feb',o:3,i:2,b:2},{l:'Mar',o:S.ogx.length,i:S.icx.length,b:S.b2b.length}];
  const max=Math.max(8,...bData.map(d=>Math.max(d.o,d.i,d.b)))||8;
  document.getElementById('bar-chart').innerHTML=bData.map(d=>`<div class="bar-group"><div class="bar bar-ogx" style="height:${(d.o/max)*136}px;flex:1" title="OGX:${d.o}"></div><div class="bar bar-icx" style="height:${(d.i/max)*136}px;flex:1" title="ICX:${d.i}"></div><div class="bar bar-b2b" style="height:${(d.b/max)*136}px;flex:1" title="B2B:${d.b}"></div><div class="bar-label">${d.l}</div></div>`).join('');
  const stages=['Market Research','Lead','First Contact','Visit','Follow Up Visit','Raised','Prospect List'];
  const colors=['#7c3aed','#c2410c','#15803d','#1d4ed8','#a16207','#86198f','#065f46'];
  const counts=stages.map(s=>S.b2b.filter(d=>d.stage===s).length);
  const total=counts.reduce((a,b)=>a+b,0)||1;
  let angle=-Math.PI/2,paths='';
  const cx=80,cy=80,r=60,ir=38;
  counts.forEach((c,i)=>{if(!c)return;const sl=(c/total)*2*Math.PI,x1=cx+r*Math.cos(angle),y1=cy+r*Math.sin(angle),x2=cx+r*Math.cos(angle+sl),y2=cy+r*Math.sin(angle+sl),ix1=cx+ir*Math.cos(angle),iy1=cy+ir*Math.sin(angle),ix2=cx+ir*Math.cos(angle+sl),iy2=cy+ir*Math.sin(angle+sl),lg=sl>Math.PI?1:0;paths+=`<path d="M${x1} ${y1}A${r} ${r} 0 ${lg} 1 ${x2} ${y2}L${ix2} ${iy2}A${ir} ${ir} 0 ${lg} 0 ${ix1} ${iy1}Z" fill="${colors[i]}" opacity=".9"/>`;angle+=sl;});
  document.getElementById('donut-svg').innerHTML=paths;
  document.getElementById('dashboard-activity').innerHTML=S.activity.slice(0,5).map(a=>`<div class="activity-row">${B.action(a.action)}<div class="activity-text"><strong>${a.user}</strong><span style="color:var(--text-muted)">${a.action==='created'?'created a record in':a.action==='edited'?'edited a record in':'deleted a record in'}</span><strong>${a.module}</strong></div><div class="activity-date">${a.ts.split(',')[0]}</div></div>`).join('');
}

// ===== MEMBERS =====
function renderMembers(){
  const s=document.getElementById('members-search').value.toLowerCase();
  const rF=document.getElementById('members-role-filter').value;
  const fF=document.getElementById('members-fn-filter').value;
  const rows=S.members.filter(m=>(!s||m.name.toLowerCase().includes(s)||m.email.toLowerCase().includes(s))&&(!rF||m.role===rF)&&(!fF||m.fn===fF));
  document.getElementById('members-tbody').innerHTML=rows.map(m=>`<tr onclick="openDrawer('members',${m.id})"><td>${m.name}</td><td>${B.role(m.role)}</td><td>${B.fn(m.fn)}</td><td style="color:var(--text-muted)">${m.email}</td><td style="color:var(--text-light)">${m.updated}</td></tr>`).join('');
  document.getElementById('members-count').textContent=rows.length+' records';
}

// ===== OGX =====
function renderOGX(){
  const s=document.getElementById('ogx-search').value.toLowerCase();
  const rows=S.ogx.filter(r=>r.stage===S.ogxTab&&(!s||r.epName.toLowerCase().includes(s)));
  document.getElementById('ogx-tbody').innerHTML=rows.map(r=>`<tr onclick="openDrawer('ogx',${r.id})"><td>${r.epName}</td><td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted)">${r.epId}</td><td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted)">${r.oppId}</td><td>${B.ct(r.contactType)}</td><td>${B.product(r.product)}</td><td>${fmtFiles(r.files)}</td><td style="color:var(--text-light)">${r.updated}</td></tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text-light);padding:24px">No records</td></tr>';
  document.getElementById('ogx-count').textContent=rows.length+' records';
  ['Approval','Realization','Completed'].forEach(s=>document.getElementById('ogx-'+s.toLowerCase()+'-count').textContent=S.ogx.filter(r=>r.stage===s).length);
}

function switchTab(m,tab){
  S[m+'Tab']=tab;
  document.getElementById(m+'-tabs').querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',['Approval','Realization','Completed'][i]===tab));
  m==='ogx'?renderOGX():renderICX();
}

// ===== ICX =====
function renderICX(){
  const s=document.getElementById('icx-search').value.toLowerCase();
  const rows=S.icx.filter(r=>r.stage===S.icxTab&&(!s||r.epName.toLowerCase().includes(s)));
  document.getElementById('icx-tbody').innerHTML=rows.map(r=>`<tr onclick="openDrawer('icx',${r.id})"><td>${r.epName}</td><td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted)">${r.epId}</td><td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted)">${r.oppId}</td><td>${fmtFiles(r.files)}</td><td style="color:var(--text-light)">${r.updated}</td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:24px">No records</td></tr>';
  document.getElementById('icx-count').textContent=rows.length+' records';
  ['Approval','Realization','Completed'].forEach(s=>document.getElementById('icx-'+s.toLowerCase()+'-count').textContent=S.icx.filter(r=>r.stage===s).length);
}

// ===== B2B =====
function renderB2B(){
  const s=document.getElementById('b2b-search').value.toLowerCase();
  const sf=document.getElementById('b2b-stage-filter').value;
  const rows=S.b2b.filter(d=>(!s||d.company.toLowerCase().includes(s)||d.owner.toLowerCase().includes(s))&&(!sf||d.stage===sf));
  document.getElementById('b2b-tbody').innerHTML=rows.map(d=>`<tr onclick="openB2BDetail(${d.id})"><td><strong>${d.company}</strong></td><td>${d.owner}</td><td>${B.b2bType(d.product)}</td><td>EGP ${d.amount.toLocaleString()}</td><td style="color:var(--text-muted)">${d.slots||0}</td><td>${B.b2bStage(d.stage)}</td><td style="color:var(--text-muted)">💬 ${(d.dealComments||[]).filter(c=>c.type==='comment').length}</td></tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text-light);padding:24px">No records</td></tr>';
  document.getElementById('b2b-count').textContent=rows.length+' records';
}

// ===== ACTIVITY =====
function renderActivity(){
  const s=(document.getElementById('activity-search')?.value||'').toLowerCase();
  const rows=S.activity.filter(a=>!s||a.user.toLowerCase().includes(s));
  document.getElementById('activity-tbody').innerHTML=rows.map(a=>`<tr><td>${a.user}</td><td>${B.action(a.action)}</td><td>${a.module}</td><td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted)">${a.recordId}</td><td style="color:var(--text-light)">${a.ts}</td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:24px">No records</td></tr>';
  document.getElementById('activity-count').textContent=rows.length+' records';
}

// ===== MODALS =====
function openModal(id){document.getElementById('modal-'+id).classList.add('open')}
function closeModal(id){document.getElementById('modal-'+id).classList.remove('open')}
document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open')}));

// ===== SAVE RECORDS =====
function saveMember(){
  const name=document.getElementById('m-name').value.trim();
  const role=document.getElementById('m-role').value;
  const fn=document.getElementById('m-fn').value;
  const email=document.getElementById('m-email').value.trim();
  if(!name||!role||!fn||!email){toast('Fill all required fields');return}
  const id=S.nextId.members++;
  S.members.push({id,name,role,fn,email,updated:todayStr(),files:[]});
  log(name,'created','Members',id);
  closeModal('add-member');
  ['m-name','m-email'].forEach(i=>document.getElementById(i).value='');
  ['m-role','m-fn'].forEach(i=>document.getElementById(i).value='');
  renderMembers();renderDashboard();toast('Member added ✓');
}

function saveOGX(){
  const epId=document.getElementById('ogx-epid').value.trim();
  const oppId=document.getElementById('ogx-oppid').value.trim();
  const epName=document.getElementById('ogx-epname').value.trim();
  const contactType=document.getElementById('ogx-contact').value;
  const product=document.getElementById('ogx-product').value;
  const stage=document.getElementById('ogx-stage').value;
  if(!epId||!oppId||!epName||!contactType||!product||!stage){toast('Fill all required fields');return}
  const id=S.nextId.ogx++;
  const files=[...window.ogxContractFiles,...window.ogxExpmailFiles];
  S.ogx.push({id,epId,oppId,epName,contactType,product,stage,updated:todayStr(),files});
  log(epName,'created','OGX',id);
  closeModal('add-ogx');
  ['ogx-epid','ogx-oppid','ogx-epname'].forEach(i=>document.getElementById(i).value='');
  ['ogx-contact','ogx-product','ogx-stage'].forEach(i=>document.getElementById(i).value='');
  resetModalFiles();
  S.ogxTab=stage;switchTab('ogx',stage);
  renderDashboard();toast('OGX record added ✓');
}

function saveICX(){
  const epName=document.getElementById('icx-epname').value.trim();
  const epId=document.getElementById('icx-epid').value.trim();
  const oppId=document.getElementById('icx-oppid').value.trim();
  const stage=document.getElementById('icx-stage').value;
  if(!epName||!epId||!oppId||!stage){toast('Fill all required fields');return}
  const id=S.nextId.icx++;
  const files=[...window.icxPassportFiles,...window.icxExpmailFiles];
  S.icx.push({id,epName,epId,oppId,stage,updated:todayStr(),files});
  log(epName,'created','ICX',id);
  closeModal('add-icx');
  ['icx-epname','icx-epid','icx-oppid'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('icx-stage').value='';
  resetModalFiles();
  S.icxTab=stage;switchTab('icx',stage);
  renderDashboard();toast('ICX record added ✓');
}

function saveB2B(){
  const company=document.getElementById('b2b-company').value.trim();
  const owner=document.getElementById('b2b-owner').value.trim();
  const product=document.getElementById('b2b-product').value;
  const amount=parseInt(document.getElementById('b2b-amount').value)||0;
  const slots=parseInt(document.getElementById('b2b-slots').value)||0;
  const stage=document.getElementById('b2b-stage').value;
  if(!company||!owner||!product||!stage){toast('Fill all required fields');return}
  const id=S.nextId.b2b++;
  const now=nowStr();
  S.b2b.push({id,company,owner,product,amount,slots,stage,dealComments:[{type:'stage',text:'Deal created — Stage set to '+stage,ts:now}],files:[]});
  log(owner,'created','B2B Deals',id);
  closeModal('add-b2b');
  ['b2b-company','b2b-owner','b2b-amount','b2b-slots'].forEach(i=>document.getElementById(i).value='');
  ['b2b-product','b2b-stage'].forEach(i=>document.getElementById(i).value='');
  renderB2B();renderDashboard();toast('B2B deal added ✓');
}

// ===== DRAWER =====
function openDrawer(module,id){
  const r=S[module].find(x=>x.id===id);
  if(!r)return;
  DM=module;DR=r;isEdit=false;
  document.getElementById('drawer-overlay').classList.add('open');
  document.getElementById('detail-drawer').classList.add('open');
  document.getElementById('detail-drawer').classList.remove('edit-mode');
  document.getElementById('btn-edit').textContent='✏️ Edit';
  document.getElementById('btn-save-edit').style.display='none';
  buildDrawer();
}

function closeDrawer(){
  document.getElementById('drawer-overlay').classList.remove('open');
  document.getElementById('detail-drawer').classList.remove('open');
  DM=null;DR=null;isEdit=false;
}

function toggleEdit(){
  isEdit=!isEdit;
  document.getElementById('btn-edit').textContent=isEdit?'👁 View':'✏️ Edit';
  document.getElementById('btn-save-edit').style.display=isEdit?'inline-flex':'none';
  document.getElementById('detail-drawer').classList.toggle('edit-mode',isEdit);
}

function dField(label,val,editHtml=''){
  return`<div class="d-field"><label>${label}</label><div class="d-val">${val}</div>${editHtml}</div>`
}
function dInput(fid,val,ph=''){return`<input class="d-input" id="df-${fid}" value="${(val||'').toString().replace(/"/g,'&quot;')}" placeholder="${ph}">`}
function dSelect(fid,val,opts){return`<select class="d-select" id="df-${fid}">${opts.map(o=>`<option${o===val?' selected':''}>${o}</option>`).join('')}</select>`}

function filesHTML(r,module){
  const key=`${module}-${r.id}`;
  const list=r.files.length
    ?r.files.map((f,i)=>`<div class="file-item">
        <div class="file-item-left" onclick="viewFile('${f.url}','${f.name}')">
          <span class="file-icon">${fileIcon(f.name)}</span>
          <span class="file-name">${f.name}</span>
          <span class="file-size">${fmtSize(f.size)}</span>
        </div>
        <div class="file-actions">
          <button class="f-btn f-view" onclick="viewFile('${f.url}','${f.name}')" title="View">👁</button>
          <button class="f-btn f-dl" onclick="downloadFile('${f.url}','${f.name}')" title="Download">⬇</button>
          <button class="f-btn" onclick="removeFile('${key}',${i})" title="Delete">🗑</button>
        </div>
      </div>`).join('')
    :`<div class="no-files-msg">No files uploaded yet</div>`;
  return`<div class="d-section">📎 Files (${r.files.length})</div>
    <div class="file-list" id="file-list-${key}">${list}</div>
    <div class="add-file-zone">
      <input type="file" multiple onchange="addFiles('${key}',this)">
      ↑ Upload files
    </div>`;
}

function fileIcon(name){
  const ext=(name.split('.').pop()||'').toLowerCase();
  if(['jpg','jpeg','png','gif','webp','svg'].includes(ext))return'🖼️';
  if(ext==='pdf')return'📕';
  if(['doc','docx'].includes(ext))return'📝';
  if(['xls','xlsx'].includes(ext))return'📊';
  return'📄';
}

function buildDrawer(){
  const r=DR,m=DM;
  let title='',sub='',body='';
  if(m==='members'){
    title=r.name;sub='Member Record';
    body=dField('Full Name',r.name,dInput('name',r.name,'Full name'))
       +dField('Role',B.role(r.role),dSelect('role',r.role,['EB','VP','TL','Member']))
       +dField('Function',B.fn(r.fn),dSelect('fn',r.fn,['TM','oGV','oGT','iGV','iGT','B2B','F&L']))
       +dField('AIESEC Email',`<a href="mailto:${r.email}" style="color:var(--accent)">${r.email}</a>`,dInput('email',r.email,'email@aiesec.net'))
       +dField('Last Updated',r.updated)
       +filesHTML(r,m);
  } else if(m==='ogx'){
    title=r.epName;sub='OGX Record';
    body=dField('EP Name',r.epName,dInput('epName',r.epName))
       +dField('EP ID',`<code style="font-family:'DM Mono',monospace;font-size:13px">${r.epId}</code>`,dInput('epId',r.epId))
       +dField('OPP ID',`<code style="font-family:'DM Mono',monospace;font-size:13px">${r.oppId}</code>`,dInput('oppId',r.oppId))
       +dField('Contact Type',B.ct(r.contactType),dSelect('contactType',r.contactType,['New Contract','Re-Approval']))
       +dField('Product',B.product(r.product),dSelect('product',r.product,['oGV','oGT']))
       +dField('Stage',B.stage(r.stage),dSelect('stage',r.stage,['Approval','Realization','Completed']))
       +dField('Last Updated',r.updated)
       +filesHTML(r,m);
  } else if(m==='icx'){
    title=r.epName;sub='ICX Record';
    body=dField('EP Name',r.epName,dInput('epName',r.epName))
       +dField('EP ID',`<code style="font-family:'DM Mono',monospace;font-size:13px">${r.epId}</code>`,dInput('epId',r.epId))
       +dField('OPP ID',`<code style="font-family:'DM Mono',monospace;font-size:13px">${r.oppId}</code>`,dInput('oppId',r.oppId))
       +dField('Stage',B.stage(r.stage),dSelect('stage',r.stage,['Approval','Realization','Completed']))
       +dField('Last Updated',r.updated)
       +filesHTML(r,m);
  } else if(m==='b2b'){
    title=r.company;sub='B2B Deal';
    body=dField('Company',r.company,dInput('company',r.company))
       +dField('Deal Owner',r.owner,dInput('owner',r.owner))
       +dField('Type',B.b2bType(r.product),dSelect('product',r.product,['GV','GT','BD']))
       +dField('Amount (EGP)',`EGP ${r.amount.toLocaleString()}`,dInput('amount',r.amount,'Amount'))
       +dField('Slots',r.slots||0,dInput('slots',r.slots||0,'Number of slots'))
       +dField('Stage',B.b2bStage(r.stage),dSelect('stage',r.stage,['Market Research','Lead','First Contact','Visit','Follow Up Visit','Raised','Prospect List']))
       +dField('Comments',`💬 ${(r.dealComments||[]).filter(c=>c.type==='comment').length}`)
       +filesHTML(r,m);
  }
  document.getElementById('drawer-title').textContent=title;
  document.getElementById('drawer-subtitle').textContent=sub;
  document.getElementById('drawer-body').innerHTML=body;
}

// ===== FILE ACTIONS IN DRAWER =====
function addFiles(key,input){
  if(!input.files.length)return;
  const [module,idStr]=key.split('-');const id=parseInt(idStr);
  const r=S[module].find(x=>x.id===id);if(!r)return;
  Array.from(input.files).forEach(f=>r.files.push({name:f.name,url:URL.createObjectURL(f),type:f.type,size:f.size}));
  r.updated=todayStr();
  log(r.name||r.epName||r.company||'User','edited',module.toUpperCase(),id);
  input.value='';
  buildDrawer();rerender(module);toast('File(s) uploaded ✓');
}

function removeFile(key,idx){
  const [module,idStr]=key.split('-');const id=parseInt(idStr);
  const r=S[module].find(x=>x.id===id);if(!r)return;
  r.files.splice(idx,1);r.updated=todayStr();
  log(r.name||r.epName||r.company||'User','edited',module.toUpperCase(),id);
  buildDrawer();rerender(module);toast('File removed');
}

// ===== SAVE EDIT =====
function saveEdit(){
  const r=DR,m=DM;
  const g=id=>{const el=document.getElementById('df-'+id);return el?el.value:null};
  if(m==='members'){
    if(!g('name')||!g('role')||!g('fn')||!g('email')){toast('Fill all fields');return}
    r.name=g('name');r.role=g('role');r.fn=g('fn');r.email=g('email');
  } else if(m==='ogx'){
    if(!g('epName')||!g('epId')||!g('oppId')){toast('Fill all fields');return}
    r.epName=g('epName');r.epId=g('epId');r.oppId=g('oppId');r.contactType=g('contactType');r.product=g('product');r.stage=g('stage');
  } else if(m==='icx'){
    if(!g('epName')||!g('epId')||!g('oppId')){toast('Fill all fields');return}
    r.epName=g('epName');r.epId=g('epId');r.oppId=g('oppId');r.stage=g('stage');
  } else if(m==='b2b'){
    if(!g('company')||!g('owner')){toast('Fill all fields');return}
    r.company=g('company');r.owner=g('owner');r.product=g('product');r.amount=parseInt(g('amount'))||r.amount;r.slots=parseInt(g('slots'))||0;r.stage=g('stage');
  }
  r.updated=todayStr();
  log(r.name||r.epName||r.company||'User','edited',m.toUpperCase(),r.id);
  isEdit=false;
  document.getElementById('btn-edit').textContent='✏️ Edit';
  document.getElementById('btn-save-edit').style.display='none';
  document.getElementById('detail-drawer').classList.remove('edit-mode');
  buildDrawer();rerender(m);toast('Record updated ✓');
}

// ===== DELETE =====
function triggerDelete(){document.getElementById('confirm-overlay').classList.add('open')}
function closeConfirm(){document.getElementById('confirm-overlay').classList.remove('open')}
function confirmDelete(){
  if(window._b2bDeletePending){
    const r=S.b2b.find(x=>x.id===B2B_DETAIL_ID);
    if(r){
      const idx=S.b2b.findIndex(x=>x.id===B2B_DETAIL_ID);
      if(idx>-1)S.b2b.splice(idx,1);
      log(r.company,'deleted','B2B Deals',r.id);
    }
    window._b2bDeletePending=false;
    closeConfirm();closeB2BDetail();
    renderB2B();renderDashboard();toast('Deal deleted');
    return;
  }
  if(!DM||!DR)return;
  const m=DM,id=DR.id;
  const name=DR.name||DR.epName||DR.company||'Record';
  const idx=S[m].findIndex(r=>r.id===id);
  if(idx>-1)S[m].splice(idx,1);
  log(name,'deleted',m.toUpperCase(),id);
  closeConfirm();closeDrawer();
  rerender(m);toast('Record deleted');
}

function rerender(m){
  ({members:renderMembers,ogx:renderOGX,icx:renderICX,b2b:renderB2B}[m])();
  if(document.getElementById('page-dashboard').classList.contains('active'))renderDashboard();
}

// ===== TOAST =====
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2600);
}

// ===== B2B DETAIL PAGE =====
let B2B_DETAIL_ID = null;
let B2B_ACTIVITY_TAB = 'activity'; // 'activity' or 'comments'

function openB2BDetail(id){
  const r=S.b2b.find(x=>x.id===id);
  if(!r)return;
  B2B_DETAIL_ID=id;
  B2B_ACTIVITY_TAB='activity';
  document.getElementById('b2b-detail-page').classList.add('open');
  document.getElementById('b2b-detail-breadcrumb').textContent=r.company;
  buildB2BDetail();
  renderB2BActivityFeed();
}

function closeB2BDetail(){
  document.getElementById('b2b-detail-page').classList.remove('open');
  B2B_DETAIL_ID=null;
  renderB2B();
}

function buildB2BDetail(){
  const r=S.b2b.find(x=>x.id===B2B_DETAIL_ID);
  if(!r)return;
  const stageOptions=['Market Research','Lead','First Contact','Visit','Follow Up Visit','Raised','Prospect List'];
  const typeOptions=['GV','GT','BD'];
  document.getElementById('b2b-detail-left').innerHTML=`
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:24px;font-weight:600;letter-spacing:-.02em">${r.company}</h1>
        <p style="font-size:13px;color:var(--text-muted);margin-top:3px">B2B Deal · ID #${r.id}</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="triggerB2BDelete()">🗑 Delete</button>
      </div>
    </div>

    <div class="b2b-detail-card">
      <h3>Deal Information</h3>
      <div class="b2b-info-grid">
        <div class="b2b-info-field">
          <label>Company</label>
          <div class="val b2b-edit-inline" id="b2b-field-company">
            <span class="b2b-view-val">${r.company}</span>
            <input style="display:none" value="${r.company}" id="b2b-inp-company">
          </div>
        </div>
        <div class="b2b-info-field">
          <label>Deal Owner</label>
          <div class="val b2b-edit-inline" id="b2b-field-owner">
            <span class="b2b-view-val">${r.owner}</span>
            <input style="display:none" value="${r.owner}" id="b2b-inp-owner">
          </div>
        </div>
        <div class="b2b-info-field">
          <label>Type</label>
          <div class="val">${B.b2bType(r.product)}</div>
        </div>
        <div class="b2b-info-field">
          <label>Package Amount (EGP)</label>
          <div class="val b2b-edit-inline">
            <span class="b2b-view-val">EGP ${r.amount.toLocaleString()}</span>
            <input style="display:none" type="number" value="${r.amount}" id="b2b-inp-amount">
          </div>
        </div>
        <div class="b2b-info-field">
          <label>Slots</label>
          <div class="val b2b-edit-inline">
            <span class="b2b-view-val">${r.slots||0}</span>
            <input style="display:none" type="number" value="${r.slots||0}" id="b2b-inp-slots">
          </div>
        </div>
        <div class="b2b-info-field">
          <label>Deal Stage</label>
          <div class="val" style="display:flex;align-items:center;gap:10px">
            ${B.b2bStage(r.stage)}
            <select id="b2b-stage-changer" style="padding:5px 8px;border:1.5px solid var(--border);border-radius:6px;font-family:inherit;font-size:12px;outline:none;background:#fff;cursor:pointer" onchange="changeB2BStage(this.value)">
              ${stageOptions.map(s=>`<option${s===r.stage?' selected':''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border);display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" onclick="saveB2BDetailEdits()">💾 Save Changes</button>
      </div>
    </div>

    <div class="b2b-detail-card">
      <h3>📎 Files (${r.files.length})</h3>
      ${filesHTML(r,'b2b')}
    </div>
  `;
}

function saveB2BDetailEdits(){
  const r=S.b2b.find(x=>x.id===B2B_DETAIL_ID);if(!r)return;
  const g=id=>{const el=document.getElementById(id);return el?el.value.trim():null};
  const company=g('b2b-inp-company')||r.company;
  const owner=g('b2b-inp-owner')||r.owner;
  const amount=parseInt(g('b2b-inp-amount'))||r.amount;
  const slots=parseInt(g('b2b-inp-slots'))||r.slots||0;
  r.company=company;r.owner=owner;r.amount=amount;r.slots=slots;
  r.updated=todayStr();
  log(r.company,'edited','B2B Deals',r.id);
  buildB2BDetail();
  document.getElementById('b2b-detail-breadcrumb').textContent=r.company;
  toast('Deal updated ✓');
}

function changeB2BStage(newStage){
  const r=S.b2b.find(x=>x.id===B2B_DETAIL_ID);if(!r)return;
  const oldStage=r.stage;
  if(newStage===oldStage)return;
  r.stage=newStage;r.updated=todayStr();
  if(!r.dealComments)r.dealComments=[];
  r.dealComments.push({type:'stage',text:`Stage changed: ${oldStage} → ${newStage}`,ts:nowStr()});
  log(r.owner,'edited','B2B Deals',r.id);
  buildB2BDetail();
  renderB2BActivityFeed();
  toast(`Stage updated to ${newStage}`);
}

function postB2BComment(){
  const r=S.b2b.find(x=>x.id===B2B_DETAIL_ID);if(!r)return;
  const input=document.getElementById('b2b-comment-input');
  const text=input.value.trim();
  if(!text)return;
  if(!r.dealComments)r.dealComments=[];
  r.dealComments.push({type:'comment',text,ts:nowStr(),author:document.getElementById('logged-in-user')?.textContent||'You'});
  input.value='';
  log(r.owner, 'edited', 'B2B Deals', r.id);
  renderB2BActivityFeed();
  toast('Comment posted');
}

function switchActivityTab(tab){
  B2B_ACTIVITY_TAB=tab;
  document.getElementById('tab-activity-btn').classList.toggle('active',tab==='activity');
  document.getElementById('tab-comments-btn').classList.toggle('active',tab==='comments');
  renderB2BActivityFeed();
}

function renderB2BActivityFeed(){
  const r=S.b2b.find(x=>x.id===B2B_DETAIL_ID);if(!r)return;
  const all=(r.dealComments||[]);
  const items=B2B_ACTIVITY_TAB==='activity'?all:all.filter(c=>c.type==='comment');
  const html=items.length===0?`<div style="text-align:center;color:var(--text-light);font-size:13px;padding:30px 0">No ${B2B_ACTIVITY_TAB} yet</div>`:
    [...items].reverse().map(c=>{
      if(c.type==='stage'){
        return`<div class="activity-entry">
          <div class="activity-avatar system">⚙</div>
          <div class="activity-bubble system-bubble">
            <div class="activity-bubble-top">
              <span class="activity-bubble-author" style="color:#6b7280">System</span>
              <span class="activity-bubble-time">${c.ts}</span>
            </div>
            <div class="activity-bubble-text">${c.text}</div>
          </div>
        </div>`;
      } else {
        const initials=(c.author||'U').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
        return`<div class="activity-entry">
          <div class="activity-avatar">${initials}</div>
          <div class="activity-bubble">
            <div class="activity-bubble-top">
              <span class="activity-bubble-author">${c.author||'User'}</span>
              <span class="activity-bubble-time">${c.ts}</span>
            </div>
            <div class="activity-bubble-text">${c.text}</div>
          </div>
        </div>`;
      }
    }).join('');
  document.getElementById('b2b-activity-feed').innerHTML=html;
}

function triggerB2BDelete(){
  window._b2bDeletePending=true;
  document.getElementById('confirm-overlay').classList.add('open');
}

// ===== MUST'S SU — GIS API INTEGRATION =====
const MUSTSU = {
  data: [],          // raw fetched applications
  filtered: [],      // after search/filter
  selected: new Set(),
  intervalId: null,
  initialized: false,
  lastFetch: null,
  isLoading: false,
};

const GIS_API = 'https://gis-api.aiesec.org/graphql';
const GIS_TOKEN = 'VE4r4-4KeFDZxoNU0w4-cy8SxG4kFNzESfjbyAvMVcg';

// ── GIS API helper ──────────────────────────────────────────────────────────
async function gisPost(query, variables = {}) {
  const res = await fetch(GIS_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': GIS_TOKEN,
    },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const json = await res.json();
  if (json.errors && json.errors.length) {
    // Return partial data alongside errors so we can inspect
    return { data: json.data, errors: json.errors };
  }
  return { data: json.data, errors: null };
}

// ── Schema probe — find the real query field name & filter args ─────────────
async function mustsuProbeSchema() {
  // 1. Get all top-level query fields
  const { data } = await gisPost(`{ __schema { queryType { fields { name args { name type { name kind ofType { name kind } } } } } } }`);
  const fields = data?.__schema?.queryType?.fields || [];

  // Look for application-related fields
  const appFields = fields.filter(f =>
    /application/i.test(f.name) || /opportunit/i.test(f.name)
  );
  console.log('[GIS Schema] Application-related fields:', appFields.map(f => f.name));

  // Find the best candidate
  const candidate = appFields.find(f => /application/i.test(f.name)) || appFields[0];
  if (candidate) {
    console.log('[GIS Schema] Using field:', candidate.name, '| args:', candidate.args?.map(a => a.name));
  }
  return { fields, appFields, candidate };
}

// ── Strategy 1: currentPerson → managed_sub_lcs → applications ────────────
const Q_VIA_PERSON = `
query myApplications($page: Int, $perPage: Int) {
  currentPerson {
    managed_sub_lcs {
      id
      name
      suboffice_members {
        id
        full_name
        email
        applications(
          pagination: { page: $page, per_page: $perPage }
        ) {
          id
          status
          created_at
          updated_at
          opportunity {
            id
            title
            programme { short_name }
          }
        }
      }
    }
  }
}`;

// ── Strategy 2: allOpportunityApplication — no filters (grab all, filter client-side) ─
const Q_ALL_APPS_SIMPLE = `
query allApps($page: Int, $perPage: Int) {
  allOpportunityApplication(
    pagination: { page: $page, per_page: $perPage }

  ) {
    data {
      id
      status
      created_at
      updated_at
      person {
        id
        full_name
        email
        home_lc { id name }
      }
      opportunity {
        id
        title
        programme { short_name }
      }
    }
    paging { total_items total_pages current_page }
  }
}`;

// ── Strategy 3: allOpportunityApplication with lc filter variants ───────────
const Q_FILTER_VARIANTS = [
  // Variant A — home_committee
  `query appsA($page:Int,$perPage:Int){allOpportunityApplication(filters:{home_committee:{id:2818}} pagination:{page:$page,per_page:$perPage}){data{id status created_at updated_at person{id full_name email}opportunity{id title programme{short_name}}}paging{total_items total_pages current_page}}}`,
  // Variant B — lc
  `query appsB($page:Int,$perPage:Int){allOpportunityApplication(filters:{lc:{id:2818}} pagination:{page:$page,per_page:$perPage}){data{id status created_at updated_at person{id full_name email}opportunity{id title programme{short_name}}}paging{total_items total_pages current_page}}}`,
  // Variant C — home_lc_id
  `query appsC($page:Int,$perPage:Int){allOpportunityApplication(filters:{home_lc_id:2818} pagination:{page:$page,per_page:$perPage}){data{id status created_at updated_at person{id full_name email}opportunity{id title programme{short_name}}}paging{total_items total_pages current_page}}}`,
  // Variant D — person home_lc
  `query appsD($page:Int,$perPage:Int){allOpportunityApplication(filters:{person:{home_lc:{id:2818}}} pagination:{page:$page,per_page:$perPage}){data{id status created_at updated_at person{id full_name email}opportunity{id title programme{short_name}}}paging{total_items total_pages current_page}}}`,
  // Variant E — no filter at all (we'll filter client side by home_lc.id)
  `query appsE($page:Int,$perPage:Int){allOpportunityApplication(pagination:{page:$page,per_page:$perPage}){data{id status created_at updated_at person{id full_name email home_lc{id name}}opportunity{id title programme{short_name}}}paging{total_items total_pages current_page}}}`,
];

// ── currentPerson — get LC info ─────────────────────────────────────────────
const Q_CURRENT_PERSON = `
query {
  currentPerson {
    id
    full_name
    email
    home_lc { id name }
    managed_sub_lcs { id name }
  }
}`;

// ────────────────────────────────────────────────────────────────────────────
// MAIN FETCH — tries multiple strategies until one works
// ────────────────────────────────────────────────────────────────────────────
async function mustsuFetch() {
  if (MUSTSU.isLoading) return;
  MUSTSU.isLoading = true;
  mustsuSetStatus('loading');
  mustsuShowTableLoading();

  try {
    // Step 0: Get current user info to know our LC ID
    let lcId = null;
    let lcName = 'MUST';
    try {
      const { data: pd } = await gisPost(Q_CURRENT_PERSON);
      if (pd?.currentPerson) {
        lcId = pd.currentPerson.home_lc?.id || pd.currentPerson.managed_sub_lcs?.[0]?.id;
        lcName = pd.currentPerson.home_lc?.name || pd.currentPerson.managed_sub_lcs?.[0]?.name || 'MUST';
        console.log('[GIS] Logged in as:', pd.currentPerson.full_name, '| LC:', lcName, '| LC ID:', lcId);
        const sub = document.getElementById('mustsu-subtitle');
        if (sub) sub.textContent = `Live data from AIESEC GIS (${lcName})`;
      }
    } catch(e) { console.warn('[GIS] currentPerson failed:', e.message); }

    // Step 1: Try filter variants
    let allData = [];
    let usedStrategy = '';

    for (let i = 0; i < Q_FILTER_VARIANTS.length; i++) {
      try {
        const { data, errors } = await gisPost(Q_FILTER_VARIANTS[i], { page: 1, perPage: 1 });
        if (!errors && data?.allOpportunityApplication) {
          // This variant works! Use it to fetch all pages
          console.log('[GIS] Filter variant', i, 'works!');
          usedStrategy = `filter-variant-${i}`;
          allData = await mustsuFetchAllPages(Q_FILTER_VARIANTS[i]);

          // If variant E (no filter), filter client-side by lcId
          if (i === 4 && lcId) {
            console.log('[GIS] Client-side filtering by LC ID:', lcId);
            allData = allData.filter(app =>
              String(app.person?.home_lc?.id) === String(lcId)
            );
          }
          break;
        } else if (errors) {
          console.log('[GIS] Variant', i, 'errors:', errors.map(e=>e.message).join('; '));
        }
      } catch(e) {
        console.log('[GIS] Variant', i, 'threw:', e.message);
      }
    }

    if (!allData.length && !usedStrategy) {
      throw new Error('All query strategies failed. Check browser console for details. The API schema may have changed.');
    }

    MUSTSU.data = allData;
    MUSTSU.lastFetch = new Date();
    mustsuSetStatus('ok');
    mustsuRender();
    document.getElementById('mustsu-live-dot').style.display = 'inline-block';

  } catch (err) {
    console.error('[GIS] mustsuFetch fatal error:', err);
    mustsuSetStatus('error', err.message);
    if (!MUSTSU.data.length) {
      document.getElementById('mustsu-tbody').innerHTML = `
        <tr><td colspan="8" style="text-align:center;padding:40px;color:#991b1b;font-size:13px">
          <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
            <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/><line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2"/></svg>
            <strong>Failed to load data</strong>
            <span style="color:var(--text-muted);max-width:500px;text-align:center">${err.message}</span>
            <div style="display:flex;gap:8px;margin-top:4px">
              <button class="btn btn-ghost btn-sm" onclick="mustsuRefresh()">↻ Try again</button>
              <button class="btn btn-ghost btn-sm" onclick="mustsuRunDiagnostic()">🔍 Run diagnostic</button>
            </div>
          </div>
        </td></tr>`;
    }
  } finally {
    MUSTSU.isLoading = false;
  }
}

async function mustsuFetchAllPages(query) {
  let allData = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { data, errors } = await gisPost(query, { page, perPage: 50 });
    if (errors && errors.length) throw new Error(errors.map(e => e.message).join(', '));
    const result = data?.allOpportunityApplication;
    if (!result) throw new Error('Unexpected response shape');
    allData = allData.concat(result.data || []);
    totalPages = result.paging?.total_pages || 1;
    page++;
    if (page > 30) break; // safety
  } while (page <= totalPages);
  return allData;
}

function mustsuShowTableLoading() {
  const el = document.getElementById('mustsu-tbody');
  if (el) el.innerHTML = `
    <tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-light);font-size:13px">
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
        <div style="width:28px;height:28px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite"></div>
        <span>Fetching SU data from AIESEC GIS…</span>
      </div>
    </td></tr>`;
}

// ── Diagnostic tool — runs in browser console + shows modal ─────────────────
async function mustsuRunDiagnostic() {
  mustsuShowDiagModal('Running diagnostic…', true);
  const lines = [];
  const log = (...args) => { console.log(...args); lines.push(args.join(' ')); };

  log('=== AIESEC GIS Diagnostic ===');

  // 1. currentPerson
  try {
    const { data, errors } = await gisPost(Q_CURRENT_PERSON);
    if (errors) log('❌ currentPerson errors:', errors.map(e=>e.message).join(', '));
    else log('✅ currentPerson:', JSON.stringify(data?.currentPerson));
  } catch(e) { log('❌ currentPerson threw:', e.message); }

  // 2. Schema introspection
  try {
    const { data } = await gisPost(`{__schema{queryType{fields{name}}}}`);
    const names = data?.__schema?.queryType?.fields?.map(f=>f.name) || [];
    const appRelated = names.filter(n => /app|opport|sign|su\b/i.test(n));
    log('✅ Query fields (app-related):', appRelated.join(', ') || '(none found)');
    log('   All fields:', names.join(', '));
  } catch(e) { log('❌ Introspection threw:', e.message); }

  // 3. Test each variant
  for (let i = 0; i < Q_FILTER_VARIANTS.length; i++) {
    try {
      const { data, errors } = await gisPost(Q_FILTER_VARIANTS[i], { page: 1, perPage: 1 });
      if (errors) log(`❌ Variant ${i}:`, errors.map(e=>e.message).join(', '));
      else {
        const count = data?.allOpportunityApplication?.paging?.total_items;
        log(`✅ Variant ${i} works! total_items=${count}`);
      }
    } catch(e) { log(`❌ Variant ${i} threw:`, e.message); }
  }

  log('=== Done ===');
  mustsuShowDiagModal(lines.join('\n'), false);
}

function mustsuShowDiagModal(text, loading) {
  let el = document.getElementById('mustsu-diag-modal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mustsu-diag-modal';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:3000;display:flex;align-items:center;justify-content:center';
    el.innerHTML = `<div style="background:#fff;border-radius:10px;padding:24px;width:700px;max-width:94vw;max-height:88vh;overflow:auto;box-shadow:0 8px 40px rgba(0,0,0,.3)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h3 style="font-size:15px;font-weight:600">🔍 API Diagnostic</h3>
        <button onclick="document.getElementById('mustsu-diag-modal').remove()" style="border:none;background:#f0f0f0;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:13px">Close ×</button>
      </div>
      <pre id="mustsu-diag-pre" style="font-size:12px;font-family:monospace;background:#f5f5f5;border-radius:6px;padding:14px;white-space:pre-wrap;word-break:break-all;max-height:60vh;overflow:auto;color:#111">${text}</pre>
      <p style="font-size:11.5px;color:#888;margin-top:10px">Full output also available in browser DevTools console (F12)</p>
    </div>`;
    document.body.appendChild(el);
  } else {
    document.getElementById('mustsu-diag-pre').textContent = text;
  }
}

function mustsuSetStatus(state, msg) {
  const dot = document.getElementById('mustsu-status-dot');
  const text = document.getElementById('mustsu-status-text');
  const lastEl = document.getElementById('mustsu-last-updated');
  if (!dot) return;
  if (state === 'loading') {
    dot.style.background = '#f59e0b';
    dot.style.animation = 'pulse 1s infinite';
    text.textContent = 'Fetching…';
  } else if (state === 'ok') {
    dot.style.background = '#22c55e';
    dot.style.animation = '';
    text.textContent = `Live · ${MUSTSU.data.length} records`;
    if (MUSTSU.lastFetch) lastEl.textContent = 'Last updated: ' + MUSTSU.lastFetch.toLocaleTimeString();
  } else if (state === 'error') {
    dot.style.background = '#ef4444';
    dot.style.animation = '';
    text.textContent = 'Error — ' + (msg || 'API unreachable');
  }
}

function mustsuInit() {
  if (MUSTSU.initialized) { mustsuRender(); return; }
  MUSTSU.initialized = true;
  mustsuFetch();
}

function mustsuRefresh() {
  MUSTSU.selected.clear();
  MUSTSU.isLoading = false; // reset lock in case previous fetch hung
  mustsuUpdateSelectionBar();
  mustsuShowTableLoading();
  mustsuFetch();
}

function mustsuRender() {
  const search = (document.getElementById('mustsu-search')?.value || '').toLowerCase();
  const statusFilter = (document.getElementById('mustsu-status-filter')?.value || '').toLowerCase();
  const dateFrom = document.getElementById('mustsu-date-from')?.value;
  const dateTo = document.getElementById('mustsu-date-to')?.value;

  let rows = MUSTSU.data.filter(app => {
    const name = (app.person?.full_name || '').toLowerCase();
    const epid = String(app.person?.id || '').toLowerCase();
    const email = (app.person?.email || '').toLowerCase();
    const status = (app.status || '').toLowerCase();

    if (search && !name.includes(search) && !epid.includes(search) && !email.includes(search)) return false;
    if (statusFilter && !status.includes(statusFilter)) return false;

    if (dateFrom || dateTo) {
      const created = new Date(app.created_at);
      if (dateFrom && created < new Date(dateFrom)) return false;
      if (dateTo && created > new Date(dateTo + 'T23:59:59')) return false;
    }

    return true;
  });

  MUSTSU.filtered = rows;

  if (!rows.length) {
    document.getElementById('mustsu-tbody').innerHTML = `
      <tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-light);font-size:13px">
        No records match your filters
      </td></tr>`;
    document.getElementById('mustsu-count').textContent = '0 records';
    document.getElementById('mustsu-export-btn').disabled = true;
    return;
  }

  document.getElementById('mustsu-export-btn').disabled = false;

  const statusColors = {
    open: {bg:'#dbeafe',color:'#1d4ed8'},
    matched: {bg:'#fef3c7',color:'#92400e'},
    accepted: {bg:'#d1fae5',color:'#065f46'},
    approved: {bg:'#dcfce7',color:'#166534'},
    realized: {bg:'#eff6ff',color:'#1e40af'},
    completed: {bg:'#f0fdf4',color:'#166534'},
    rejected: {bg:'#fee2e2',color:'#991b1b'},
    withdrawn: {bg:'#f5f5f5',color:'#555'},
    pending: {bg:'#fdf4ff',color:'#86198f'},
  };

  const html = rows.map(app => {
    const id = app.id;
    const name = app.person?.full_name || '—';
    const epId = app.person?.id || '—';
    const email = app.person?.email || '—';
    const status = (app.status || 'unknown').toLowerCase();
    const programme = app.opportunity?.programme?.short_name || '—';
    const created = app.created_at ? new Date(app.created_at).toLocaleDateString('en-GB') : '—';
    const updated = app.updated_at ? new Date(app.updated_at).toLocaleDateString('en-GB') : '—';
    const sc = statusColors[status] || {bg:'#f5f5f5',color:'#555'};
    const isSelected = MUSTSU.selected.has(id);

    return `<tr class="${isSelected ? 'mustsu-row-selected' : ''}" data-id="${id}">
      <td><input type="checkbox" class="mustsu-row-cb" data-id="${id}" ${isSelected ? 'checked' : ''} onchange="mustsuToggleRow('${id}', this.checked)"></td>
      <td style="font-weight:500">${name}</td>
      <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted)">${epId}</td>
      <td><span class="mustsu-email-cell" title="${email}">${email}</span></td>
      <td><span style="font-size:12px;font-weight:600;color:var(--text-muted)">${programme}</span></td>
      <td><span style="background:${sc.bg};color:${sc.color};padding:2px 9px;border-radius:20px;font-size:11.5px;font-weight:500;display:inline-block">${status}</span></td>
      <td style="font-size:12.5px;color:var(--text-muted)">${created}</td>
      <td style="font-size:12.5px;color:var(--text-muted)">${updated}</td>
    </tr>`;
  }).join('');

  document.getElementById('mustsu-tbody').innerHTML = html;
  document.getElementById('mustsu-count').textContent = `${rows.length} of ${MUSTSU.data.length} records`;
  mustsuUpdateSelectionBar();
}

function mustsuToggleRow(id, checked) {
  if (checked) MUSTSU.selected.add(id);
  else MUSTSU.selected.delete(id);
  // update row styling
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (row) row.classList.toggle('mustsu-row-selected', checked);
  mustsuUpdateSelectionBar();
}

function mustsuToggleAll(checked) {
  MUSTSU.filtered.forEach(app => {
    if (checked) MUSTSU.selected.add(app.id);
    else MUSTSU.selected.delete(app.id);
  });
  mustsuRender();
}

function mustsuClearSelection() {
  MUSTSU.selected.clear();
  mustsuRender();
}

function mustsuUpdateSelectionBar() {
  const bar = document.getElementById('mustsu-selection-bar');
  const count = MUSTSU.selected.size;
  if (count > 0) {
    bar.style.display = 'flex';
    document.getElementById('mustsu-sel-count').textContent = `${count} selected`;
  } else {
    bar.style.display = 'none';
  }
  // sync select-all checkbox
  const allCb = document.getElementById('mustsu-select-all');
  if (allCb && MUSTSU.filtered.length > 0) {
    allCb.checked = MUSTSU.filtered.every(a => MUSTSU.selected.has(a.id));
    allCb.indeterminate = !allCb.checked && MUSTSU.filtered.some(a => MUSTSU.selected.has(a.id));
  }
}

function mustsuBuildCSV(apps) {
  const headers = ['Name', 'EP ID', 'Email', 'Programme', 'Status', 'Applied Date', 'Last Updated'];
  const rows = apps.map(app => [
    app.person?.full_name || '',
    app.person?.id || '',
    app.person?.email || '',
    app.opportunity?.programme?.short_name || '',
    app.status || '',
    app.created_at ? new Date(app.created_at).toLocaleDateString('en-GB') : '',
    app.updated_at ? new Date(app.updated_at).toLocaleDateString('en-GB') : '',
  ]);
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  return [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
}

function mustsuDownloadCSV(csv, filename) {
  const blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast('CSV exported ✓');
}

function mustsuExportCSV() {
  if (!MUSTSU.filtered.length) { toast('No data to export'); return; }
  const date = new Date().toISOString().slice(0,10);
  mustsuDownloadCSV(mustsuBuildCSV(MUSTSU.filtered), `MUST_SU_${date}.csv`);
}

function mustsuExportSelected() {
  const selected = MUSTSU.data.filter(a => MUSTSU.selected.has(a.id));
  if (!selected.length) { toast('No rows selected'); return; }
  const date = new Date().toISOString().slice(0,10);
  mustsuDownloadCSV(mustsuBuildCSV(selected), `MUST_SU_selected_${date}.csv`);
}

// ===== INIT =====
initBackendState();

// ===== LOGIN / LOGOUT =====
const USERS = {
  admin:  'admin123',
  member: 'member123',
  guest:  'guest123'
};

function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');

  if (USERS[username] && USERS[username] === password) {
    errorEl.classList.remove('show');
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('logged-in-user').textContent = username;
  } else {
    errorEl.classList.add('show');
    document.getElementById('login-password').value = '';
    document.getElementById('login-password').focus();
  }
}

function doLogout() {
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').classList.remove('show');
  document.getElementById('logged-in-user').textContent = '';
  document.getElementById('login-overlay').style.display = 'flex';
}

// Allow pressing Enter in login inputs
document.getElementById('login-username').addEventListener('keydown', function(e){ if(e.key==='Enter') document.getElementById('login-password').focus(); });
document.getElementById('login-password').addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });

// ===== MOBILE SIDEBAR =====
function toggleSidebar(){
  document.querySelector('.sidebar').classList.toggle('mobile-open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
function closeSidebar(){
  document.querySelector('.sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}
// Auto-close sidebar on nav (mobile)
document.querySelectorAll('.nav-item').forEach(el=>{
  el.addEventListener('click', ()=>{ if(window.innerWidth<=768) closeSidebar(); });
});