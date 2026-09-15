import assert from 'node:assert/strict';
const origin='http://localhost:3100';
const data=await(await fetch(origin+'/api/data')).json();
const record=data.records.find(r=>r.id==='62010003');
const {importVerification}=await import('../public/verification-import.js');
const criteria=importVerification(JSON.parse(record.fieldVerificationDetails)).criteria;
const body={id:record.id,year:record.year,criteria,notes:record.assessment?.notes||'',draft:true};
const send=b=>fetch(origin+'/api/verifications',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(b)});
const saved=await send(body);assert.equal(saved.status,200,await saved.text());
const reread=(await(await fetch(origin+'/api/data')).json()).records.find(r=>r.id===record.id).assessment;
assert.equal(reread.recommendation,'Draf');assert.equal(reread.criteria['field-income'],'3000000');assert.equal(reread.criteria['condition-structure-0'],criteria['condition-structure-0']);
const rejected=await send({...body,draft:false});assert.equal(rejected.status,400);assert.match(await rejected.text(),/Lengkapi/);
const absent=await send({...body,id:'999999999999'});assert.equal(absent.status,400);assert.match(await absent.text(),/BNBA tidak ditemukan/);
console.log('Local API: incomplete draft saved and read back; incomplete final and missing BNBA rejected.');

