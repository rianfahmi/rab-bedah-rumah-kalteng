import {db,json,getSources} from '../../../lib/data';
import {calculateRab} from '../../../public/rab-model.js';
const validKey=(id:unknown,year:unknown)=>typeof id==='string'&&/^\d{6,20}$/.test(id)&&typeof year==='string'&&/^20\d{2}$/.test(year);
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,id=p.get('id'),year=p.get('year');
 if(!validKey(id,year))return json({error:'BNBA dan tahun tidak valid.'},400);
 const row=await db().prepare('SELECT payload,updated_at FROM rab_documents WHERE record_key=?').bind(`${year}:${id}`).first<{payload:string,updated_at:string}>();
 return json({document:row?JSON.parse(row.payload):null,updatedAt:row?.updated_at||null});
}
export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin'),host=request.headers.get('x-forwarded-host')||request.headers.get('host')||new URL(request.url).host;
  if(!origin||new URL(origin).host!==host)return json({error:'Asal permintaan tidak sesuai.'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Format tidak sesuai.'},415);
  const text=await request.text();if(text.length>300000)return json({error:'Dokumen terlalu besar.'},413);
  const body=JSON.parse(text);
  if(!validKey(body.id,body.year))return json({error:'BNBA dan tahun tidak valid.'},400);
  const d=body.document;
  if(!d||!Array.isArray(d.rows)||d.rows.length>500)return json({error:'Maksimal 500 baris pekerjaan.'},400);
  if(!['Peningkatan kualitas','Renovasi','Perbaikan'].includes(d.activity))return json({error:'Pilih jenis kegiatan.'},400);
  const fields=['place','date','group','chair','facilitator','coordinator','notes'];
  if(fields.some(k=>typeof d[k]!=='string'||d[k].length>3000))return json({error:'Isian administrasi tidak valid.'},400);
  for(const row of d.rows){if(!row||['description','unit'].some(k=>typeof row[k]!=='string'||row[k].length>500)||['volume','price','stage1','stage2','cash','reused'].some(k=>typeof row[k]!=='string'||row[k].length>30||(row[k]!==''&&(!Number.isFinite(Number(row[k]))||Number(row[k])<0))))return json({error:'Baris biaya tidak valid.'},400);}
  const sources=await getSources();if(!Object.values(sources).some((rows:any)=>rows.some((r:any)=>r.id===body.id&&r.year===body.year)))return json({error:'BNBA tidak ditemukan.'},400);
  const document=Object.fromEntries(['activity','rows',...fields].map(k=>[k,d[k]]));
  const assessment=calculateRab(d.rows),updatedAt=new Date().toISOString();
  await db().prepare('INSERT INTO rab_documents(record_key,payload,updated_at) VALUES(?,?,?) ON CONFLICT(record_key) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(`${body.year}:${body.id}`,JSON.stringify(document),updatedAt).run();
  return json({ok:true,updatedAt,assessment});
 }catch(e){return json({error:e instanceof Error?e.message:'RAB belum tersimpan.'},400);}
}
