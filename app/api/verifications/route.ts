import {db,json} from '../../../lib/data';
import {assessVerification} from '../../../public/verification-rules.js';

const allowedHousing=new Set(['Layak Huni','Rumah Tidak Layak Huni']);
const allowedRecommendation=new Set(['Direkomendasikan','Tidak Direkomendasikan']);

export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Asal permintaan tidak sesuai.'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Format permintaan tidak sesuai.'},415);
  try{
    const body=await request.json();
    if(typeof body.id!=='string'||!/^\d{6,20}$/.test(body.id)||typeof body.year!=='string'||!/^20\d{2}$/.test(body.year))throw new Error('Nomor BNBA dan tahun tidak valid.');
    if(!body.criteria||typeof body.criteria!=='object'||Array.isArray(body.criteria)||Object.keys(body.criteria).length>250||Object.values(body.criteria).some(v=>typeof v!=='string'||v.length>2000))throw new Error('Isian formulir tidak valid.');
    const result=assessVerification(body.criteria,body.year);
    if(!result.complete)throw new Error('Lengkapi: '+result.missing.join(', '));
    body.housingStatus=result.housingStatus;
    body.recommendation=result.recommendation;
    if(result.recommendation==='Direkomendasikan'&&!['Konvensional','Ferosemen (untuk rumah tembok tanpa perkuatan)'].includes(body.criteria['field-construction']))throw new Error('Pilih jenis penanganan.');
    if(typeof body.notes!=='string'||body.notes.length>2000)throw new Error('Catatan tidak valid.');
    const key=`${body.year}:${body.id}`;
    const updatedAt=new Date().toISOString();
    await db().prepare('INSERT INTO verification_assessments (record_key,housing_status,recommendation,criteria,notes,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(record_key) DO UPDATE SET housing_status=excluded.housing_status,recommendation=excluded.recommendation,criteria=excluded.criteria,notes=excluded.notes,updated_at=excluded.updated_at').bind(key,body.housingStatus,body.recommendation,JSON.stringify(body.criteria),body.notes.trim(),updatedAt).run();
    return json({ok:true,updatedAt});
  }catch(e){return json({error:e instanceof Error?e.message:'Penilaian belum tersimpan.'},400)}
}
