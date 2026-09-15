import assert from 'node:assert/strict';
import {importedNumber,importVerification} from '../public/verification-import.js';
for(const [value,expected] of [['24,00','24'],['3.000.000','3000000'],['3.909.005','3909005'],['36.5','36.5'],['Rp 1.250,50','1250.5'],['0','0'],['tidak diketahui',null]])assert.equal(importedNumber(value),expected);
const result=importVerification({'Luas Rumah (m²)':'24,00','Penghasilan Kepala Keluarga per Bulan (Rp)':'3.000.000','Nilai UMP/UMK (Rp)':'3.909.005'});
assert.equal(result.criteria['field-house-area'],'24');assert.equal(result.criteria['field-income'],'3000000');assert.equal(result.criteria['field-ump'],'3909005');
console.log('Indonesian Excel numbers preserved in numeric form fields');
