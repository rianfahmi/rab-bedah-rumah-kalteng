export const fundingKeys=['stage1','stage2','cash','reused'];
export function calculateRab(rows){
 const errors=[],totals={cost:0,stage1:0,stage2:0,cash:0,reused:0};
 if(!rows.length)errors.push('Tambahkan minimal satu baris pekerjaan.');
 const items=rows.map((row,i)=>{
  const values={};
  for(const key of ['volume','price',...fundingKeys]){
   const v=row[key];values[key]=v===''||v===null||v===undefined?null:Number(v);
   if(values[key]!==null&&(!Number.isFinite(values[key])||values[key]<0))errors.push(`Baris ${i+1}: ${key} harus angka tidak negatif.`);
  }
  if(!String(row.description||'').trim())errors.push(`Baris ${i+1}: uraian pekerjaan wajib diisi.`);
  if(!String(row.unit||'').trim())errors.push(`Baris ${i+1}: satuan wajib diisi.`);
  if(values.volume===null||values.price===null)errors.push(`Baris ${i+1}: volume dan harga satuan wajib diisi.`);
  const cost=values.volume===null||values.price===null?null:Math.round(values.volume*values.price*100)/100;
  if(cost!==null&&!Number.isFinite(cost))errors.push(`Baris ${i+1}: total biaya melebihi batas angka.`);
  const allocated=fundingKeys.reduce((sum,k)=>sum+(values[k]||0),0);
  if(cost!==null&&Math.abs(cost-allocated)>0.01)errors.push(`Baris ${i+1}: sumber dana/bahan belum sama dengan total harga.`);
  totals.cost+=Number.isFinite(cost)?cost:0;
  for(const key of fundingKeys)totals[key]+=Number.isFinite(values[key])?values[key]:0;
  return {...row,...values,cost,allocated};
 });
 return {items,totals,errors,complete:rows.length>0&&errors.length===0};
}
