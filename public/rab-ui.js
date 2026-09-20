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
const technicalTemplate=[
 ['house-size','Ukuran rumah','m²'],['foundation','Pondasi','m³'],['sloof','Sloof','m³'],['column','Kolom/tiang','m³'],['ring-beam','Ring balok','m³'],['roof-frame','Kerangka atap','m²'],['roof-cover','Penutup atap','m²'],['wall','Dinding pengisi','m²'],['openings','Kusen, daun pintu, & jendela','m²'],['floor','Lantai','m²'],['lighting','Pencahayaan','%'],['ventilation','Penghawaan','%'],['sanitation','Ketersediaan akses sanitasi',''],['water','Ketersediaan akses air minum',''],['coordinate','Titik koordinat','']
];
const drpbMaterialTemplate=[{description:'',unit:'',volume:'',price:''},{description:'',unit:'',volume:'',price:''},{description:'',unit:'',volume:'',price:''}];
const drpbLaborTemplate=[{description:'',amount:''},{description:'',amount:''}];
const technicalRows=doc=>technicalTemplate.map(([key,label,unit])=>{const saved=(doc.technicalRows||[]).find(row=>row.key===key)||{};return {key,label,unit,existingType:saved.existingType||'',existingVolume:saved.existingVolume||'',proposedType:saved.proposedType||'',proposedVolume:saved.proposedVolume||''};});
const drpbRows=(doc,key,template)=>Array.isArray(doc[key])&&doc[key].length?doc[key].map(row=>({...row})):template.map(row=>({...row}));
const numeric=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?n:0;};
const officialCostHead='<thead><tr><th rowspan="3">No.</th><th rowspan="3">Uraian pekerjaan</th><th rowspan="3">Satuan</th><th rowspan="3">Volume</th><th rowspan="3">Harga satuan (Rp)</th><th rowspan="3">Total harga (Rp)</th><th colspan="4">Sumber dana/bahan (Rp)</th><th rowspan="3"></th></tr><tr><th colspan="2">Rencana pemanfaatan dana</th><th colspan="2">Swadaya</th></tr><tr><th>Tahap I</th><th>Tahap II</th><th>Uang</th><th>Memakai bahan bangunan lama</th></tr></thead>';
const technicalTable=rows=>'<div class="table-scroll"><table class="technical-comparison"><thead><tr><th colspan="4">Kondisi awal (eksisting)</th><th colspan="4">Rencana usulan</th></tr><tr><th>Komponen</th><th>Jenis konstruksi</th><th>Volume/luas total</th><th>Satuan</th><th>Komponen</th><th>Jenis konstruksi</th><th>Volume/luas total</th><th>Satuan</th></tr></thead><tbody>'+rows.map(row=>`<tr><th>${esc(row.label)}</th><td><input data-technical="${row.key}" data-side="existingType" value="${esc(row.existingType)}" aria-label="${esc(row.label)} kondisi awal"></td><td><input data-technical="${row.key}" data-side="existingVolume" value="${esc(row.existingVolume)}" aria-label="${esc(row.label)} volume kondisi awal"></td><td>${esc(row.unit)}</td><th>${esc(row.label)}</th><td><input data-technical="${row.key}" data-side="proposedType" value="${esc(row.proposedType)}" aria-label="${esc(row.label)} rencana usulan"></td><td><input data-technical="${row.key}" data-side="proposedVolume" value="${esc(row.proposedVolume)}" aria-label="${esc(row.label)} volume rencana usulan"></td><td>${esc(row.unit)}</td></tr>`).join('')+'</tbody></table></div>';
const materialTable=rows=>'<div class="table-scroll"><table class="drpb-materials"><thead><tr><th>No.</th><th>Jenis bahan bangunan</th><th>Volume</th><th>Satuan</th><th>Harga satuan (Rp)</th><th>Jumlah harga (Rp)</th><th></th></tr></thead><tbody>'+rows.map((row,index)=>`<tr><td>${index+1}</td><td><input data-drpb-material="description" data-index="${index}" value="${esc(row.description)}" aria-label="Jenis bahan bangunan ${index+1}"></td><td><input data-drpb-material="volume" data-index="${index}" value="${esc(row.volume)}" type="number" min="0" step="any" aria-label="Volume bahan ${index+1}"></td><td><input data-drpb-material="unit" data-index="${index}" value="${esc(row.unit)}" aria-label="Satuan bahan ${index+1}"></td><td><input data-drpb-material="price" data-index="${index}" value="${esc(row.price)}" type="number" min="0" step="any" aria-label="Harga satuan bahan ${index+1}"></td><td data-drpb-material-total="${index}">0</td><td><button type="button" data-remove-drpb-material="${index}" aria-label="Hapus bahan ${index+1}">×</button></td></tr>`).join('')+'</tbody><tfoot><tr><th colspan="5">Total harga pembelian (A)</th><th id="drpb-material-total">Rp0</th><th></th></tr></tfoot></table></div>';
const laborTable=rows=>'<div class="table-scroll"><table class="drpb-labor"><thead><tr><th>No.</th><th>Uraian</th><th>Jumlah harga (Rp)</th><th></th></tr></thead><tbody>'+rows.map((row,index)=>`<tr><td>${index+1}</td><td><input data-drpb-labor="description" data-index="${index}" value="${esc(row.description)}" aria-label="Uraian upah ${index+1}"></td><td><input data-drpb-labor="amount" data-index="${index}" value="${esc(row.amount)}" type="number" min="0" step="any" aria-label="Jumlah harga upah ${index+1}"></td><td><button type="button" data-remove-drpb-labor="${index}" aria-label="Hapus upah ${index+1}">×</button></td></tr>`).join('')+'</tbody><tfoot><tr><th colspan="2">Total tarik tunai (B)</th><th id="drpb-labor-total">Rp0</th><th></th></tr></tfoot></table></div>';
const verificationDetails=record=>{try{return JSON.parse(record.fieldVerificationDetails||'{}')}catch{return {}}};
const cpbContext=record=>{
 const source=verificationDetails(record);
 const value=(...keys)=>keys.map(key=>source[key]).find(item=>item!==undefined&&item!==null&&String(item).trim()!=='')||'—';
 const cell=([label,item])=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(item)+'</dd></div>';
 const section=(title,rows)=>'<section class="cpb-detail-section"><h3>'+esc(title)+'</h3><dl>'+rows.map(cell).join('')+'</dl></section>';
 const structure=[['Fondasi',value('Fondasi','Pondasi')],['Sloof',value('Sloof')],['Kolom',value('Kolom')],['Ring balok',value('Ring Balok')],['Rangka atap',value('Rangka Atap')]];
 const nonStructure=[['Dinding',value('Dinding')],['Jenis dinding terluas',value('Jenis Dinding Terluas')],['Lantai',value('Lantai')],['Jenis lantai terluas',value('Jenis Lantai Terluas')],['Penutup atap',value('Penutup Atap')],['Jenis penutup atap terluas',value('Jenis Atap Terluas')]];
 const health=[['Akses air minum',value('Akses Air Minum')],['Sumber air minum',value('Sumber Air Minum')],['Akses sanitasi',value('Akses Sanitasi')],['Fasilitas sanitasi',value('Fasilitas Sanitasi')],['Pencahayaan',value('Pencahayaan')],['Penghawaan',value('Penghawaan')],['Kecukupan luas ruang',value('Kecukupan Luas Ruang')]];
 const house=[['Luas rumah',value('Luas Rumah (m²)','Luas Rumah (m�)')],['Jumlah penghuni',value('Jumlah Penghuni (Jiwa)')],['Lama menghuni rumah',value('Lama Menghuni Rumah (Tahun)')]];
 const eligibility=[['Penghasilan per bulan',value('Penghasilan Kepala Keluarga per Bulan (Rp)')],['Nilai UMP/UMK',value('Nilai UMP/UMK (Rp)')],['Memiliki aset rumah lain',value('Memiliki Aset Rumah Lainnya')],['Pernah menerima bantuan',value('Pernah Memperoleh BSPS')],['Kesediaan mengikuti program',value('Bersedia Mengikuti Ketentuan BSPS')]];
 const result=[['Tahap verifikasi',value('Status','Status Verifikasi')],['Hasil rekomendasi',value('Hasil Verifikasi')],['Rekomendasi BA-HV',record.bahvVerification||'—'],['Jenis konstruksi',value('Metode Konstruksi')],['Status penguasaan lahan',value('Status Penguasaan Lahan')],['Dokumen bukti hak',value('Jenis Dokumen Kepemilikan Lahan')]];
 return '<section class="cpb-rab-context" aria-label="Rincian CPB"><header><div><div class="cpb-kicker">Rincian Calon Penerima Bantuan</div><h1>Rincian Calon Penerima Bantuan (CPB)</h1><p>Profil, verifikasi faktual lapangan, dan dasar penyusunan RAB.</p></div><div class="cpb-stage">Tahun '+esc(record.year)+'<small>'+esc(record.phase||'—')+'</small></div></header><div class="cpb-identity"><div><h2>'+esc(record.name)+'</h2><p>NIK '+esc(record.nik||'—')+' · No. KK '+esc(record.kk||'—')+' · BNBA '+esc(record.id)+'</p></div><div><span>Lokasi</span><strong>'+esc(record.address||'—')+'</strong><small>'+esc(record.village||'—')+' · '+esc(record.district||'—')+' · '+esc(record.region||'—')+'</small></div><div><span>Pendamping verifikasi faktual RAB</span><strong>'+esc((record.facilitators||[]).join(', ')||record.fac||'—')+'</strong></div></div><section class="cpb-process"><h2>Alur &amp; Tahapan Pelaksanaan</h2><ol><li><strong>Verifikasi faktual</strong><span>'+esc(value('Status','Status Verifikasi'))+'</span></li><li><strong>Berita Acara Hasil Verifikasi</strong><span>'+esc(record.bahvVerification||'Belum tersedia')+'</span></li><li><strong>Penetapan CPB</strong><span>'+esc(record.letters?.cpb||'Belum tersedia')+'</span></li><li><strong>RAB</strong><span>'+esc(record.status||'Belum ada progres RAB')+'</span></li></ol></section><section class="cpb-verification"><div class="cpb-section-title"><h2>Hasil Verifikasi Faktual</h2><p>Rincian sumber yang menjadi dasar penyusunan RAB.</p></div><div class="cpb-details-grid">'+section('Struktur bangunan',structure)+section('Non-struktur',nonStructure)+section('Kesehatan & kecukupan luas',health)+section('Hasil verifikasi faktual',result)+section('Data rumah & penghunian',house)+section('Data kelayakan',eligibility)+'</div></section></section>';
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
  'technical-method':'',technicalRows:[],technicalPhotos:{},drpbMaterials:[],drpbLabor:[],
  'drpb-date':'','drpb-store':'','drpb-store-address':'','drpb-store-account':'','drpb-bank-account':'',
  rows:createRabTemplate()
 };
 doc={...doc,technicalRows:technicalRows(doc),drpbMaterials:drpbRows(doc,'drpbMaterials',drpbMaterialTemplate),drpbLabor:drpbRows(doc,'drpbLabor',drpbLaborTemplate),technicalPhotos:doc.technicalPhotos||{}};
 const input=(key,label,type='text')=>`<label>${label}<input name="${key}" type="${type}" value="${esc(doc[key])}"></label>`;
 root.innerHTML=`<div class="modal-head"><h2>Rencana Anggaran Biaya Bedah Rumah</h2><button id="rab-close">Tutup</button></div><form id="rab-form"><div class="modal-body"><div class="notice">${esc(record.name)} · BNBA ${esc(record.id)} · Tahun ${record.year}<br>${esc(record.address)} · ${esc(record.village)} · ${esc(record.region)}</div><div class="admin-grid"><label>Jenis kegiatan<select name="activity">${['Peningkatan kualitas','Renovasi','Perbaikan'].map(value=>`<option ${value===doc.activity?'selected':''}>${value}</option>`).join('')}</select></label>${input('group','Kelompok CPB')}${input('place','Tempat')}${input('date','Tanggal','date')}${input('chair','Ketua kelompok')}${input('facilitator','Tenaga Pendamping Masyarakat')}${input('coordinator','Koordinator Kabupaten/Kota')}</div><nav class="rab-tabs" role="tablist" aria-label="Komponen RAB"><button type="button" class="active" data-rab-tab="cost" role="tab" aria-selected="true">Rincian Biaya</button><button type="button" data-rab-tab="technical" role="tab" aria-selected="false">Rencana Teknis</button><button type="button" data-rab-tab="drpb" role="tab" aria-selected="false">Daftar Rencana Pemanfaatan Bantuan (DRPB)</button></nav><section class="rab-tab-panel" data-rab-panel="cost"><h3>A. Rincian biaya</h3><p>Format Lampiran 26/KPTS/Dt/2026. Uraian dapat disesuaikan dengan kebutuhan rumah; harga satuan sudah termasuk pajak dan biaya pengiriman.</p><div class="table-scroll"><table id="rab-costs">${officialCostHead}<tbody></tbody></table></div><button type="button" id="rab-add">Tambah pekerjaan</button><div id="rab-summary" aria-live="polite"></div><label>Catatan<textarea name="notes" maxlength="3000">${esc(doc.notes)}</textarea></label><div id="rab-message" role="status"></div></section><section class="rab-tab-panel" data-rab-panel="technical" hidden><h3>B. Gambar Rencana Teknis</h3><p>Bandingkan kondisi awal rumah dengan rencana usulan. Isi jenis konstruksi serta volume atau luas total setiap komponen.</p><div class="admin-grid rab-detail-grid"><label>Jenis kegiatan<select name="technical-method"><option value="">Pilih jenis kegiatan</option>${['Peningkatan kualitas','Renovasi','Perbaikan'].map(value=>`<option value="${value}" ${doc['technical-method']===value?'selected':''}>${value}</option>`).join('')}</select></label></div><div class="technical-photo-grid"><label>Foto perspektif kondisi awal<textarea data-technical-photo="perspective" aria-label="Foto perspektif kondisi awal">${esc(doc.technicalPhotos.perspective||'')}</textarea></label><label>Gambar teknis / denah<textarea data-technical-photo="plan" aria-label="Gambar teknis atau denah">${esc(doc.technicalPhotos.plan||'')}</textarea></label><label>Foto komponen yang akan diperbaiki<textarea data-technical-photo="component" aria-label="Foto komponen yang akan diperbaiki">${esc(doc.technicalPhotos.component||'')}</textarea></label></div>${technicalTable(doc.technicalRows)}<label class="rab-wide-field">Catatan rencana teknis<textarea name="technical-notes" maxlength="3000">${esc(doc['technical-notes']||'')}</textarea></label></section><section class="rab-tab-panel" data-rab-panel="drpb" hidden><h3>C. Daftar Rencana Pemanfaatan Bantuan (DRPB)</h3><p>Rencana pembelian bahan bangunan dan tarik tunai upah kerja, sesuai format Lampiran 26/KPTS/Dt/2026.</p><div class="admin-grid rab-detail-grid">${input('drpb-date','Tanggal / Tahap I atau II')}${input('drpb-bank-account','Nomor rekening PB')}${input('drpb-store','Nama toko/penyedia bahan bangunan')}${input('drpb-store-address','Alamat toko/penyedia bahan bangunan')}${input('drpb-store-account','Nomor rekening bank toko/penyedia')}</div><h4>1. Dana yang ditransfer ke toko/penyedia bahan bangunan (A)</h4><div id="drpb-material-table">${materialTable(doc.drpbMaterials)}</div><button type="button" id="drpb-add-material">Tambah bahan bangunan</button><h4>2. Dana yang ditarik tunai untuk upah kerja (B)</h4><div id="drpb-labor-table">${laborTable(doc.drpbLabor)}</div><button type="button" id="drpb-add-labor">Tambah upah kerja</button><table class="drpb-grand-total"><tbody><tr><th>Total dana yang ditarik (A + B)</th><td id="drpb-grand-total">Rp0</td></tr></tbody></table><label class="rab-wide-field">Keterangan DRPB<textarea name="drpb-notes" maxlength="3000">${esc(doc['drpb-notes']||'')}</textarea></label></section><div class="modal-foot"><button type="button" id="rab-export">Export rincian Excel</button><button type="submit" class="primary">Simpan draf RAB</button></div></form>`;

 root.querySelector('#rab-form').insertAdjacentHTML('beforebegin',cpbContext(record));

 const form=root.querySelector('form'),body=root.querySelector('tbody');
 const readTechnicalRows=()=>technicalTemplate.map(([key,label,unit])=>{const values={key,label,unit};root.querySelectorAll('[data-technical="'+key+'"]').forEach(input=>{values[input.dataset.side]=input.value});return values;});
 const readTechnicalPhotos=()=>Object.fromEntries([...root.querySelectorAll('[data-technical-photo]')].map(input=>[input.dataset.technicalPhoto,input.value]));
 const readDrpbRows=kind=>{const attribute=kind==='material'?'data-drpb-material':'data-drpb-labor';const rows=[];root.querySelectorAll('['+attribute+']').forEach(input=>{const index=Number(input.dataset.index);rows[index]??={};rows[index][input.dataset[kind==='material'?'drpbMaterial':'drpbLabor']]=input.value});return rows;};
 function updateDrpbTotals(){const materials=readDrpbRows('material'),labor=readDrpbRows('labor');let materialTotal=0,laborTotal=0;materials.forEach((row,index)=>{const total=numeric(row.volume)*numeric(row.price);materialTotal+=total;const cell=root.querySelector('[data-drpb-material-total="'+index+'"]');if(cell)cell.textContent='Rp'+money(total)});labor.forEach(row=>laborTotal+=numeric(row.amount));const materialCell=root.querySelector('#drpb-material-total'),laborCell=root.querySelector('#drpb-labor-total'),grand=root.querySelector('#drpb-grand-total');if(materialCell)materialCell.textContent='Rp'+money(materialTotal);if(laborCell)laborCell.textContent='Rp'+money(laborTotal);if(grand)grand.textContent='Rp'+money(materialTotal+laborTotal);}
 function wireDrpb(){root.querySelectorAll('[data-remove-drpb-material]').forEach(button=>button.onclick=()=>{if(!editing)return;doc.drpbMaterials=readDrpbRows('material');doc.drpbMaterials.splice(Number(button.dataset.removeDrpbMaterial),1);dirty=true;renderDrpb();});root.querySelectorAll('[data-remove-drpb-labor]').forEach(button=>button.onclick=()=>{if(!editing)return;doc.drpbLabor=readDrpbRows('labor');doc.drpbLabor.splice(Number(button.dataset.removeDrpbLabor),1);dirty=true;renderDrpb();});root.querySelector('#drpb-add-material').onclick=()=>{if(!editing)return;doc.drpbMaterials=readDrpbRows('material');doc.drpbMaterials.push({description:'',unit:'',volume:'',price:''});dirty=true;renderDrpb();};root.querySelector('#drpb-add-labor').onclick=()=>{if(!editing)return;doc.drpbLabor=readDrpbRows('labor');doc.drpbLabor.push({description:'',amount:''});dirty=true;renderDrpb();};}
 function renderDrpb(){root.querySelector('#drpb-material-table').innerHTML=materialTable(doc.drpbMaterials);root.querySelector('#drpb-labor-table').innerHTML=laborTable(doc.drpbLabor);wireDrpb();updateDrpbTotals();setEditMode(editing);}

 const selectRabTab=name=>{root.querySelectorAll('[data-rab-tab]').forEach(button=>{const active=button.dataset.rabTab===name;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});root.querySelectorAll('[data-rab-panel]').forEach(panel=>panel.hidden=panel.dataset.rabPanel!==name);};
 root.querySelectorAll('[data-rab-tab]').forEach(button=>button.onclick=()=>selectRabTab(button.dataset.rabTab));
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
  updateDrpbTotals();
  root.querySelector('#rab-summary').innerHTML=`<p><b>Total RAB: Rp${money(assessment.totals.cost)}</b> · Tahap I Rp${money(assessment.totals.stage1)} · Tahap II Rp${money(assessment.totals.stage2)} · Swadaya uang Rp${money(assessment.totals.cash)} · Bahan lama Rp${money(assessment.totals.reused)}</p>${assessment.errors.length?`<details><summary>${assessment.errors.length} isian perlu dilengkapi</summary><ul>${assessment.errors.map(value=>`<li>${esc(value)}</li>`).join('')}</ul></details>`:'<p>Rincian biaya dan sumber dana seimbang.</p>'}`;
 }
 function setEditMode(enabled){
  editing=enabled;form.dataset.editing=enabled?'true':'false';
  form.querySelectorAll('input,select,textarea').forEach(element=>element.disabled=!enabled);
  addButton.disabled=!enabled;
  root.querySelectorAll('[data-remove],[data-remove-drpb-material],[data-remove-drpb-labor],#drpb-add-material,#drpb-add-labor').forEach(button=>button.disabled=!enabled);
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
 renderDrpb();
 form.oninput=()=>{if(editing){dirty=true;update();}};
 addButton.onclick=()=>{if(!editing)return;doc.rows=readRows();doc.rows.push(blank());dirty=true;renderRows();};
 editButton.onclick=()=>{if(editing)form.requestSubmit();else setEditMode(true);};
 root.querySelector('#rab-close').onclick=()=>{if(!dirty||confirm('Tutup tanpa menyimpan perubahan RAB?'))dialog.close();};
 dialog.oncancel=event=>{if(dirty&&!confirm('Tutup tanpa menyimpan perubahan RAB?'))event.preventDefault();};
 form.onsubmit=async event=>{
  event.preventDefault();
  const fields=Object.fromEntries(new FormData(form));
  doc={...fields,rows:readRows(),technicalRows:readTechnicalRows(),technicalPhotos:readTechnicalPhotos(),drpbMaterials:readDrpbRows('material'),drpbLabor:readDrpbRows('labor')};
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
