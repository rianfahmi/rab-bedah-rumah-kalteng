import {db,json,getSources} from '../../../lib/data';
import {assessVerification} from '../../../public/verification-rules.js';



export async function POST(request:Request){
  const origin=request.headers.get('origin');
  const host=request.headers.get('x-forwarded-host')||request.headers.get('host')||new URL(request.url).host;
  if(!origin||new URL(origin).host!==host)return json({error:'Asal permintaan tidak sesuai.'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Format permintaan tidak sesuai.'},415);
  try{
    const body=await request.json();
    if(typeof body.id!=='string'||!/^\d{6,20}$/.test(body.id)||typeof body.year!=='string'||!/^20\d{2}$/.test(body.year))throw new Error('Nomor BNBA dan tahun tidak valid.');
    if(!body.criteria||typeof body.criteria!=='object'||Array.isArray(body.criteria)||Object.keys(body.criteria).length>250||Object.entries(body.criteria).some(([k,v])=>typeof v!=='string'||v.length>(k==='import-baseline'?15000:2000)))throw new Error('Isian formulir tidak valid.');
    if(body.draft!==undefined&&typeof body.draft!=='boolean')throw new Error('Mode simpan tidak valid.');
    const sources=await getSources();
    if(!Object.values(sources).some((rows:any)=>rows.some((r:any)=>r.id===body.id&&r.year===body.year)))throw new Error('BNBA tidak ditemukan.');
    body.criteria['field-save-state']=body.draft?'Draf':'Lengkap';
    const result=assessVerification(body.criteria,body.year);
    if(!body.draft&&!result.complete)throw new Error('Lengkapi: '+result.missing.join(', '));
    body.housingStatus=result.housingStatus;
    body.recommendation=body.draft?'Draf':result.recommendation;
    if(!body.draft&&result.recommendation==='Direkomendasikan'&&!['Konvensional','Ferosemen (untuk rumah tembok tanpa perkuatan)'].includes(body.criteria['field-construction']))throw new Error('Pilih jenis penanganan.');
    if(typeof body.notes!=='string'||body.notes.length>2000)throw new Error('Catatan tidak valid.');
    const key=`${body.year}:${body.id}`;
    const updatedAt=new Date().toISOString();
    await db().prepare('INSERT INTO verification_assessments (record_key,housing_status,recommendation,criteria,notes,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(record_key) DO UPDATE SET housing_status=excluded.housing_status,recommendation=excluded.recommendation,criteria=excluded.criteria,notes=excluded.notes,updated_at=excluded.updated_at').bind(key,body.housingStatus,body.recommendation,JSON.stringify(body.criteria),body.notes.trim(),updatedAt).run();
    return json({ok:true,updatedAt});
  }catch(e){return json({error:e instanceof Error?e.message:'Penilaian belum tersimpan.'},400)}
}
