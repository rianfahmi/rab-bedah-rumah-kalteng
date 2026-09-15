import {calculateRab} from './rab-model.js';
export function rabExport(record,doc){
 const assessment=calculateRab(doc.rows);
 const headers=['BNBA','Tahun','Nama CPB','Kabupaten/Kota','Kecamatan','Desa/Kelurahan','Jenis kegiatan','No.','Uraian pekerjaan','Satuan','Volume','Harga satuan (Rp)','Total harga (Rp)','Tahap I (Rp)','Tahap II (Rp)','Swadaya uang (Rp)','Bahan lama (Rp)','Selisih alokasi (Rp)'];
 const rows=assessment.items.map((r,i)=>[record.id,record.year,record.name,record.region,record.district,record.village,doc.activity,i+1,r.description,r.unit,r.volume,r.price,r.cost,r.stage1,r.stage2,r.cash,r.reused,r.cost===null?null:Math.round((r.cost-r.allocated)*100)/100]);
 return {headers,rows,assessment};
}
