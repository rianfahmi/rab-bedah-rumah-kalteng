import assert from 'node:assert/strict';
import {createRabTemplate} from '../public/rab-template.js';
import {calculateRab} from '../public/rab-model.js';
import {rabExport} from '../public/rab-export.js';

const rows=createRabTemplate();
assert.equal(rows.length,97,'Template tidak memasukkan baris jumlah yang dihitung otomatis.');
assert.ok(rows.some(row=>row.section&&row.no==='II'&&row.description==='Pekerjaan Pondasi'));
assert.equal(rows.filter(row=>row.section).length,20,'Judul bagian dari format baku harus tetap ada.');
assert.equal(calculateRab(rows).errors.length,0,'Baris template kosong tidak boleh dianggap sebagai kesalahan.');

const filled=rows.map(row=>({...row}));
const excavation=filled.find(row=>row.description==='Galian Tanah Pondasi');
Object.assign(excavation,{volume:'2',price:'10000',stage1:'15000',stage2:'5000'});
const assessment=calculateRab(filled);
assert.equal(assessment.totals.cost,20000);
assert.equal(assessment.errors.length,0);

excavation.stage2='';
assert.ok(calculateRab(filled).errors.some(error=>error.includes('sumber dana/bahan belum sama')));
const exported=rabExport({id:'62080009',year:'2026',name:'Uji',region:'Kabupaten',district:'Kecamatan',village:'Desa'}, {activity:'Peningkatan kualitas',rows});
assert.ok(exported.rows.some(row=>row[7]==='II'&&row[8]==='Pekerjaan Pondasi'));
assert.ok(exported.rows.some(row=>row[7]===''&&row[8]==='Bongkar Rumah Lama'),'Nomor kosong dari lampiran harus tetap kosong.');
console.log('RAB template checks passed');
