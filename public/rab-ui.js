import {rabExport} from './rab-export.js';
import {downloadWorkbook} from './excel-export.js';
import {calculateRab} from './rab-model.js';
import {createRabTemplate} from './rab-template.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>value===null?'—':Number(value).toLocaleString('id-ID',{maximumFractionDigits:2});
const columns=[
 ['description','Uraian pekerjaan'],['unit','Satuan'],['volume','Volume'],['price','Harga satuan'],
 ['stage1','Tahap I'],['stage2','Tahap II'],['cash','Swadaya uang'],['reused','Bahan lama']
];
const blank=()=>Object.fromEntries(columns.map(([key])=>[key,'']));
const verificationDetails=record=>{try{return JSON.parse(record.fieldVerificationDetails||'{}')}catch{return {}}};
const cpbContext=record=>{
 const source=verificationDetails(record);
 const value=(...keys)=>keys.map(key=>source[key]).find(item=>item!==undefined&&item!==null&&String(item).trim()!=='')||'—';
 const facts=[
  ['Hasil verifikasi',value('Hasil Verifikasi')||record.fieldRecommendation],
  ['Status verifikasi',value('Status Verifikasi')||record.verificationStatus],
  ['Rekomendasi BA-HV',record.bahvVerification||'—'],
  ['Konstruksi',value('Metode Konstruksi')],
  ['Penguasaan lahan',value('Status Penguasaan Lahan')],
  ['Luas rumah',value('Luas Rumah (m²)')],
  ['Jumlah penghuni',value('Jumlah Penghuni (Jiwa)')],
  ['Penghasilan per bulan',value('Penghasilan Kepala Keluarga per Bulan (Rp)')],
  ['Nilai UMP/UMK',value('Nilai UMP/UMK (Rp)')],
  ['Kondisi fondasi',value('Fondasi')],
  ['Kondisi dinding',value('Dinding')],
  ['Kondisi lantai',value('Lantai')],
  ['Kondisi penutup atap',value('Penutup Atap')],
  ['Akses air minum',value('Akses Air Minum')],
  ['Akses sanitasi',value('Akses Sanitasi')]
 ];
 return '<section class="cpb-rab-context" aria-label="Rincian CPB"><header><div><div class="cpb-kicker">Rincian Calon Penerima Bantuan</div><h1>'+esc(record.name)+'</h1><p>NIK '+esc(record.nik||'—')+' · No. KK '+esc(record.kk||'—')+' · BNBA '+esc(record.id)+'</p></div><div class="cpb-stage">Tahun '+esc(record.year)+'<small>'+esc(record.phase||'—')+'</small></div></header><div class="cpb-profile"><div><span>Lokasi</span><strong>'+esc(record.address||'—')+'</strong><small>'+esc(record.village||'—')+' · '+esc(record.district||'—')+' · '+esc(record.region||'—')+'</small></div><div><span>Pendamping verifikasi faktual RAB</span><strong>'+esc((record.facilitators||[]).join(', ')||record.fac||'—')+'</strong></div><div><span>Alur saat ini</span><strong>Verifikasi → BA-HV → Penyusunan RAB</strong><small>'+esc(record.bahvVerification||'Menunggu Berita Acara Hasil Verifikasi')+'</small></div></div><section class="cpb-verification"><div class="cpb-section-title"><h2>Hasil Verifikasi Faktual</h2><p>Data sumber verifikasi yang menjadi dasar penyusunan RAB.</p></div><div class="cpb-verification-grid">'+facts.map(([label,item])=>'<div><span>'+esc(label)+'</span><strong>'+esc(item)+'</strong></div>').join('')+'</div></section></section>';
};

export async function openRab(record){
 const dialog=document.getElementById('document'),root=document.getElementById('doc-content');
 dialog.classList.add('rab-dialog');
 dialog.addEventListener('close',()=>{dialog.classList.remove('rab-dialog');dialog.oncancel=null;},{once:true});
 root.innerHTML='<div class="modal-body">Memuat isian RAB…</div>';
 dialog.showModal();

 let response;
 try{
  const result=await fetch(`/api/rab?id=${record.id}&year=${record.year}`);
  response=await result.json();
  if(!result.ok)throw Error(response.error);
 }catch(error){
  root.innerHTML=`<div class="modal-body">${esc(error.message)}<button id="rab-close">Tutup</button></div>`;
  root.querySelector('button').onclick=()=>dialog.close();
  return;
 }

 let doc=response.document||{
  activity:'Peningkatan kualitas',place:'',date:'',group:'',chair:'',facilitator:record.fac||'',coordinator:'',notes:'',
  rows:createRabTemplate()
 };
 const input=(key,label,type='text')=>`<label>${label}<input name="${key}" type="${type}" value="${esc(doc[key])}"></label>`;
 root.innerHTML=`<div class="modal-head"><h2>Rencana Anggaran Biaya Bedah Rumah</h2><button id="rab-close">Tutup</button></div><form id="rab-form"><div class="modal-body"><div class="notice">${esc(record.name)} · BNBA ${esc(record.id)} · Tahun ${record.year}<br>${esc(record.address)} · ${esc(record.village)} · ${esc(record.region)}</div><div class="admin-grid"><label>Jenis kegiatan<select name="activity">${['Peningkatan kualitas','Renovasi','Perbaikan'].map(value=>`<option ${value===doc.activity?'selected':''}>${value}</option>`).join('')}</select></label>${input('group','Kelompok CPB')}${input('place','Tempat')}${input('date','Tanggal','date')}${input('chair','Ketua kelompok')}${input('facilitator','Tenaga Pendamping Masyarakat')}${input('coordinator','Koordinator Kabupaten/Kota')}</div><h3>A. Rincian biaya</h3><p>Format ini mengikuti Lampiran 26/KPTS/Dt/2026. Isi hanya pekerjaan, volume, harga satuan, dan sumber dana yang diperlukan untuk rumah tersebut. Harga satuan mencakup pajak dan pengiriman berdasarkan survei harga.</p><div class="table-scroll"><table id="rab-costs"><thead><tr><th>No.</th>${columns.map(([,label])=>`<th>${label}</th>`).join('')}<th>Total harga</th><th></th></tr></thead><tbody></tbody></table></div><button type="button" id="rab-add">Tambah pekerjaan</button><div id="rab-summary" aria-live="polite"></div><label>Catatan<textarea name="notes" maxlength="3000">${esc(doc.notes)}</textarea></label><div id="rab-message" role="status"></div></div><div class="modal-foot"><button type="button" id="rab-export">Export rincian Excel</button><button type="submit" class="primary">Simpan draf RAB</button></div></form>`;

 root.querySelector('#rab-form').insertAdjacentHTML('beforebegin',cpbContext(record));
 const form=root.querySelector('form'),body=root.querySelector('tbody');
 const exportButton=root.querySelector('#rab-export'),editButton=form.querySelector('[type="submit"]'),addButton=root.querySelector('#rab-add');
 exportButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H5v20h14V7l-5-5ZM14 2v6h5M8 13l4 4m0-4-4 4"/></svg><span>Export</span>';
 exportButton.title='Export rincian Excel';
 editButton.id='rab-edit';editButton.type='button';editButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/></svg><span>Edit</span>';
 let dirty=false,editing=false;
 function readRows(){
  return [...body.rows].map((tr,index)=>{
   const previous=doc.rows[index]||{};
   if(tr.dataset.section==='true')return {...previous,section:true};
   return {...previous,...Object.fromEntries([...tr.querySelectorAll('input')].map(element=>[element.dataset.key,element.value]))};
  });
 }
 function update(){
  doc.rows=readRows();
  const assessment=calculateRab(doc.rows);
  [...body.rows].forEach((tr,index)=>{
   const total=tr.querySelector('[data-total]');
   if(total)total.textContent=money(assessment.items[index].cost);
  });
  root.querySelector('#rab-summary').innerHTML=`<p><b>Total RAB: Rp${money(assessment.totals.cost)}</b> · Tahap I Rp${money(assessment.totals.stage1)} · Tahap II Rp${money(assessment.totals.stage2)} · Swadaya uang Rp${money(assessment.totals.cash)} · Bahan lama Rp${money(assessment.totals.reused)}</p>${assessment.errors.length?`<details><summary>${assessment.errors.length} isian perlu dilengkapi</summary><ul>${assessment.errors.map(value=>`<li>${esc(value)}</li>`).join('')}</ul></details>`:'<p>Rincian biaya dan sumber dana seimbang.</p>'}`;
 }
 function setEditMode(enabled){
  editing=enabled;form.dataset.editing=enabled?'true':'false';
  form.querySelectorAll('input,select,textarea').forEach(element=>element.disabled=!enabled);
  addButton.disabled=!enabled;
  body.querySelectorAll('[data-remove]').forEach(button=>button.disabled=!enabled);
  editButton.innerHTML=enabled?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h12l3 3v15H5V3Zm3 0v6h8V3m-8 18v-7h8v7"/></svg><span>Simpan</span>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/></svg><span>Edit</span>';
  editButton.setAttribute('aria-label',enabled?'Simpan RAB':'Edit RAB');
 }
 function renderRows(){
  body.innerHTML=doc.rows.map((row,index)=>{
   if(row.section===true)return `<tr class="rab-section" data-section="true"><td>${esc(row.no)}</td><td colspan="${columns.length+2}"><b>${esc(row.description)}</b></td></tr>`;
   const number=row.template===true?row.no:(row.no??index+1);
   return `<tr><td>${esc(number)}</td>${columns.map(([key,label])=>`<td><input aria-label="${label} baris ${index+1}" data-key="${key}" value="${esc(row[key])}" type="${['description','unit'].includes(key)?'text':'number'}" ${['description','unit'].includes(key)?'':'min="0" step="any"'} style="min-width:${key==='description'?200:90}px;width:100%"></td>`).join('')}<td data-total></td><td><button type="button" data-remove="${index}" aria-label="Hapus baris ${index+1}">×</button></td></tr>`;
  }).join('');
  body.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>{
   if(!editing)return;doc.rows=readRows();doc.rows.splice(Number(button.dataset.remove),1);dirty=true;renderRows();
  });
  update();setEditMode(editing);
 }

 root.querySelector('#rab-export').onclick=()=>{
  const current={...doc,...Object.fromEntries(new FormData(form)),rows:readRows()};
  const exported=rabExport(record,current);
  downloadWorkbook(exported.headers,exported.rows,`RAB_${record.year}_${record.id}.xlsx`,'Rincian RAB');
 };
 renderRows();
 form.oninput=()=>{if(editing){dirty=true;update();}};
 addButton.onclick=()=>{if(!editing)return;doc.rows=readRows();doc.rows.push(blank());dirty=true;renderRows();};
 editButton.onclick=()=>{if(editing)form.requestSubmit();else setEditMode(true);};
 root.querySelector('#rab-close').onclick=()=>{if(!dirty||confirm('Tutup tanpa menyimpan perubahan RAB?'))dialog.close();};
 dialog.oncancel=event=>{if(dirty&&!confirm('Tutup tanpa menyimpan perubahan RAB?'))event.preventDefault();};
 form.onsubmit=async event=>{
  event.preventDefault();
  const fields=Object.fromEntries(new FormData(form));
  doc={...fields,rows:readRows()};
  const button=editButton,message=root.querySelector('#rab-message');
  button.disabled=true;message.textContent='Menyimpan…';
  try{
   const result=await fetch('/api/rab',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:record.id,year:record.year,document:doc})});
   const saved=await result.json();
   if(!result.ok)throw Error(saved.error);
   dirty=false;
   message.textContent='RAB tersimpan. '+(saved.assessment.complete?'Rincian biaya seimbang.':'Lengkapi catatan pemeriksaan sebelum finalisasi.');setEditMode(false);
  }catch(error){message.textContent=error.message;}finally{button.disabled=false;}
 };
}
