import {getData,json} from '../../../lib/data';
export async function GET(){try{return json(await getData())}catch(e){console.error('Load RAB data failed',e);return json({error:'Data belum dapat dimuat. Silakan coba lagi.'},503)}}
