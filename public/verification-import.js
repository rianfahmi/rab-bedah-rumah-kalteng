import {componentGroups} from './verification-rules.js';
import {assessVerification} from './verification-rules.js';
const clean=v=>String(v??'').trim();
const normalized=v=>clean(v).toLowerCase().replace(/[^a-z0-9]/g,'');
const columns={'field-own-kk':'Memiliki KK Sendiri','field-house-area':'Luas Rumah (m²)','field-occupants':'Jumlah Penghuni (Jiwa)','field-occupancy-years':'Lama Menghuni Rumah (Tahun)','field-income':'Penghasilan Kepala Keluarga per Bulan (Rp)','field-ump':'Nilai UMP/UMK (Rp)','field-other-home':'Memiliki Aset Rumah Lainnya','field-prior-help':'Pernah Memperoleh BSPS','field-help-year':'Tahun Dapat BSPS','field-program-agree':'Bersedia Mengikuti Ketentuan BSPS'};
const numericFields=new Set(['field-house-area','field-occupants','field-occupancy-years','field-income','field-ump','field-help-year']);
export function importedNumber(value){
 let text=clean(value).replace(/^Rp\s*/i,'').replace(/\s/g,'');
 if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(text))text=text.replace(/\./g,'');
 if(/^\d+(,\d+)?$/.test(text))text=text.replace(',','.');
 return /^\d+(\.\d+)?$/.test(text)&&Number.isFinite(Number(text))?String(Number(text)):null;
}
// Import observations only. Source recommendations never determine form results.
export function importVerification(details){
 const criteria={},unmapped=[];
 for(const [key,column] of Object.entries(columns)){const value=clean(details[column]??(key==='field-house-area'?details['Luas Rumah (m�)']:''));if(value&&value!=='-'){const parsed=numericFields.has(key)?importedNumber(value):value;if(parsed===null)unmapped.push({column,value});else criteria[key]=parsed;}}
 for(const [,components] of componentGroups)for(const c of components){
  const column=c.key==='land'?'Status Penguasaan Lahan':c.label==='Kecukupan luas ruang'?'Kecukupan Luas Ruang':c.label;
  const value=clean(details[column]);if(!value||value==='-')continue;
  let index=c.options.findIndex(o=>o&&normalized(o)===normalized(value));
  if(/^[ABC]$/i.test(value))index='ABC'.indexOf(value.toUpperCase());
  if(index<0){
   const lower=value.toLowerCase();
   if(c.key==='water')index=lower==='ya'?0:lower==='tidak'?2:-1;
   if(c.key==='light'&&lower.startsWith('kurang terang'))index=1;
   if(c.key==='wall')index=lower.includes('sebagian besar retak')?1:lower.includes('anyaman bambu')?2:lower.includes('papan kayu berkualitas')?0:-1;
   if(c.key==='floor')index=lower.includes('sebagian besar pecah')?1:lower.includes('rapuh')?2:lower.includes('kondisi baik')?0:-1;
   if(c.key==='roof')index=lower.includes('rawan ambruk')?2:lower.includes('rusak sebagian')?1:lower.includes('tidak bocor')?0:-1;
   if(c.key==='land'&&lower.startsWith('penguasaan lahan'))index=1;
   if(c.key==='area'&&/lebih atau sama/.test(lower))index=0;
  }
  if(index>=0&&c.options[index])criteria['condition-'+c.key]='ABC'[index];
  else unmapped.push({column,value});
 }
 const desilMatch=clean(details.Keterangan).match(/\bdesil\s*(10|[1-9])\b/i);
 if(desilMatch)criteria['field-desil']=desilMatch[1];
 if(Number(criteria['field-occupants'])>0)criteria['field-occupancy-status']='Dihuni';
 const method=clean(details['Metode Konstruksi']);
 if(method==='Konvensional')criteria['field-construction']=method;
 if(method==='Ferosemen')criteria['field-construction']='Ferosemen (untuk rumah tembok tanpa perkuatan)';
 const latitude=clean(details.Latitude),longitude=clean(details.Longitude);
 if(latitude&&latitude!=='-'&&longitude&&longitude!=='-')criteria['field-coordinate']=`${latitude}, ${longitude}`;
 const resources=[
  ['Material Eksisting (ringkasan)','material-used',['Kayu','Balok Kayu','Kusen','Daun Pintu','Jendela','Genteng','Batu Bata']],
  ['Material Baru (ringkasan)','material-new',['Kayu','Genteng','Batu Bata','Pasir','Kerikil']],
  ['Dana Keswadayaan (ringkasan)','money',['Tabungan','Hasil Panen/Ternak','Bantuan Keluarga/Kerabat']]
 ];
 for(const [column,prefix,names] of resources){
  const value=clean(details[column]);if(!value||value==='-')continue;
  for(const part of value.split(';')){
   const separator=part.indexOf(':');if(separator<0){unmapped.push({column,value:part.trim()});continue;}
   const name=part.slice(0,separator).trim(),amount=part.slice(separator+1).trim();
   const index=names.findIndex(n=>normalized(n)===normalized(name));
   if(index<0){unmapped.push({column,value:part.trim()});continue;}
   const amountValue=prefix==='money'?amount.replace(/^Rp\s*/i,'').replace(/\./g,'').replace(',','.'):amount;
   if(!amountValue||(prefix==='money'&&!/^\d+(\.\d+)?$/.test(amountValue))){unmapped.push({column,value:part.trim()});continue;}
   const key=`${prefix}-${index}`;
   if(criteria[key+'-value']){unmapped.push({column,value:part.trim()});continue;}
   criteria[key+'-available']='Ada';criteria[key+'-value']=amountValue;
  }
 }
 return {criteria,unmapped};
}

// Values unchanged since the previous import follow the new snapshot;
// deliberate local edits are retained and conflicts are surfaced for review.
export function syncVerification(imported,saved={},previous={}){
 const criteria={...imported},conflicts=[];
 for(const [key,value] of Object.entries(saved)){
  if(!(key in previous)||value!==previous[key]){
   criteria[key]=value;
   if(key in imported&&key in previous&&imported[key]!==previous[key]&&value!==imported[key])conflicts.push(key);
  }
 }
 return {criteria,conflicts};
}

// Only imported keys represent a source value. Form-only fields are not marked
// as changes, so the comparison remains meaningful to a verifier.
export function sourceChanges(baseline={},current={}){
 const changes={};
 for(const [key,before] of Object.entries(baseline)){
  if(key==='import-baseline'||key==='field-save-state')continue;
  const after=current[key]??'';
  if(String(before??'')!==String(after??''))changes[key]={before:String(before??''),after:String(after??'')};
 }
 return changes;
}

export function currentVerification(record){
 let details={},previous={};
 try{details=JSON.parse(record.fieldVerificationDetails||'{}')}catch{}
 const mapped=importVerification(details),saved={...(record.assessment?.criteria||{})};
 try{previous=JSON.parse(saved['import-baseline']||'{}')}catch{}
 delete saved['import-baseline'];
 const synced=syncVerification(mapped.criteria,saved,previous);
 const result=assessVerification(synced.criteria,record.year);
 return {...result,recommendation:saved['field-save-state']==='Draf'?'Draf — '+result.recommendation:result.recommendation,unmapped:mapped.unmapped,conflicts:synced.conflicts};
}
