export const componentGroups=[
 ['Struktur',[
  ...['Pondasi','Sloof','Kolom','Ring Balok','Rangka Atap'].map((label,i)=>({key:`structure-${i}`,label,options:['Ada, kondisi baik, kokoh','Ada, sebagian rapuh, tidak kokoh','Tidak ada, seluruhnya rapuh']}))]],
 ['Non-struktur',[
  {key:'wall',label:'Dinding',options:['Tembok/setengah tembok diplester, papan kayu berkualitas, bahan dinding kokoh dan kedap air','Tembok sebagian besar retak, papan atau bahan lain kurang kokoh dan tidak kedap air','Anyaman bambu tipis, triplek, papan, tembok, atau bahan lain rapuh dan tidak kedap air']},
  {key:'floor',label:'Lantai',options:['Plester/ubin/keramik/papan/bahan lain kondisi baik, kedap air','Papan atau bahan lain rusak, plester sebagian besar pecah','Tanah, papan, atau bahan lain rapuh dan tidak kedap air']},
  {key:'roof',label:'Penutup Atap',options:['Genteng/seng/spandek/bahan tradisional (ijuk/rumbia)/bahan lain kokoh, tidak bocor','Genteng/seng/spandek/bahan tradisional (ijuk/rumbia)/bahan lain sebagian rusak, bocor jika hujan lebat','Asbes, bahan non-asbes rusak berat, sering bocor jika hujan, rawan ambruk']}]],
 ['Kesehatan & kecukupan luas',[
  {key:'water',label:'Akses Air Minum',options:['Ada',null,'Tidak ada']},
  {key:'sanitation',label:'Akses Sanitasi',options:['Ada, septic tank, kamar mandi berfungsi','Ada, septic tank, kamar mandi rusak, kurang berfungsi','Tidak ada']},
  {key:'light',label:'Pencahayaan',options:['Terang, dapat digunakan membaca dengan normal tanpa pencahayaan buatan pada siang hari','Kurang terang, kurang jelas untuk membaca dengan normal, memerlukan pencahayaan buatan pada siang hari','Gelap, tidak dapat digunakan untuk membaca tanpa pencahayaan buatan pada siang hari']},
  {key:'ventilation',label:'Penghawaan',options:['Cukup ventilasi, sirkulasi udara baik','Ventilasi kurang, agak pengap','Tidak ada ventilasi, pengap, lembab']},
  {key:'area',label:'Kecukupan luas ruang',options:['Luas rumah dibagi jumlah penghuni lebih atau sama dengan 7,2 m²','Luas rumah dibagi jumlah penghuni kurang dari 7,2 m²','Luas rumah dibagi jumlah penghuni kurang dari 7,2 m²']}]],
 ['Status lahan',[
  {key:'land',label:'Status lahan',options:['Milik sendiri, ada bukti sah','Penguasaan lahan (pakai/izin tinggal/menumpang), ada bukti (keterangan)','Tanpa bukti sah/keterangan']}]]
];
export const familyOptions=[
 'Suami tinggal serumah dengan istri','Suami tinggal serumah dengan istri dan anak','Suami tinggal serumah dengan anak','Istri tinggal serumah dengan anak','Perseorangan tinggal serumah dengan kakak dan/atau adik','Perseorangan tinggal serumah dengan keponakan, sepupu, dan/atau cucu','Perseorangan tinggal serumah dengan anggota keluarga meskipun tanpa hubungan darah','Perseorangan penyandang disabilitas','Perseorangan lansia','Perseorangan duda/janda'
];
const number=v=>v===undefined||v===''?null:Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
export function assessVerification(v,year){
 const missing=[],reasons=[],triggers=[];
 const requireChoice=(key,label,options)=>{if(!options.includes(v[key]))missing.push(label);return v[key]};
 for(const [group,components] of componentGroups){for(const c of components){const value=requireChoice('condition-'+c.key,c.label,c.options.flatMap((o,i)=>o?['ABC'[i]]:[]));if(group==='Struktur'&&value==='C')triggers.push(`${c.label}: C`);if(group==='Non-struktur'&&['B','C'].includes(value))triggers.push(`${c.label}: ${value}`);if(group==='Kesehatan & kecukupan luas'&&value==='C')triggers.push(`${c.label}: C`);}}
 const housingComplete=componentGroups.slice(0,3).flatMap(g=>g[1]).every(c=>c.options['ABC'.indexOf(v['condition-'+c.key])]);
 const housingStatus=triggers.length?'Rumah Tidak Layak Huni':housingComplete?'Layak Huni':'Belum dinilai';
 if(housingStatus==='Layak Huni')reasons.push('Rumah layak huni/rusak ringan');
 if(requireChoice('field-wni','Kewarganegaraan',['Ya','Tidak'])==='Tidak')reasons.push('Bukan WNI');
 const family=requireChoice('field-family','Kategori keluarga',[...familyOptions,'Tidak termasuk kategori']);if(family==='Tidak termasuk kategori')reasons.push('Tidak memenuhi kategori keluarga penerima bantuan');
 if(requireChoice('field-own-kk','Kepemilikan KK sendiri',['Ya','Tidak'])==='Tidak')reasons.push('Belum memiliki KK sendiri');
 if(requireChoice('field-other-home','Aset rumah lainnya',['Ya','Tidak'])==='Ya')reasons.push('Memiliki rumah lebih dari satu');
 const years=number(v['field-occupancy-years']);if(years===null)missing.push('Lama menghuni rumah');else if(years<1)reasons.push('Rumah yang ditinggali kurang dari 1 tahun');
 if(v['condition-land']==='C')reasons.push('Tanpa bukti sah kepemilikan/penguasaan tanah');
 if(requireChoice('field-dispute','Sengketa tanah',['Ya','Tidak'])==='Ya')reasons.push('Tanah bersengketa');
 const desil=number(v['field-desil']),income=number(v['field-income']),wage=number(v['field-ump']);
 const validDesil=desil!==null&&Number.isInteger(desil)&&desil>=1&&desil<=10;
 if(!(validDesil&&desil<=4)&&!(income!==null&&wage!==null&&wage>0&&income<=wage)){
  if(income!==null&&wage!==null&&wage>0&&validDesil)reasons.push('Di luar desil 1–4 DTSEN dan penghasilan melebihi UMP/UMK');
  else missing.push('Desil DTSEN atau penghasilan dan UMP/UMK');
 }
 const prior=requireChoice('field-prior-help','Riwayat bantuan',['Ya','Tidak']);
 if(prior==='Ya'){const received=number(v['field-help-year']);if(received===null||!Number.isInteger(received)||received<1900||received>Number(year))missing.push('Tahun menerima bantuan yang valid');else if(Number(year)-received<5)reasons.push('Menerima bantuan perumahan dalam 5 tahun terakhir');}
 if(requireChoice('field-program-agree','Kesediaan mengikuti program',['Ya','Tidak'])==='Tidak')reasons.push('Tidak bersedia mengikuti ketentuan program');
 const occupancy=requireChoice('field-occupancy-status','Status penghuni',['Dihuni','Rumah tidak ditinggali/pindah rumah','Meninggal dunia','Pindah domisili']);
 if(occupancy&&occupancy!=='Dihuni')reasons.push(occupancy);
 if(v['field-other-program']==='Ya')reasons.push('Memilih program lain');
 if(v['field-other-reason']?.trim())reasons.push(v['field-other-reason'].trim());
 const complete=missing.length===0;
 return {housingStatus,recommendation:complete?(reasons.length?'Tidak Direkomendasikan':'Direkomendasikan'):'Belum lengkap',complete,missing:[...new Set(missing)],reasons,triggers,priority:validDesil&&desil<=2?'Prioritas desil 1–2 DTSEN':''};
}
