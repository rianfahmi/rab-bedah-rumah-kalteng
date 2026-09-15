import {env} from 'cloudflare:workers';
import seed from './seed.json';
import sourceInfo from './source-info.json';
import {mergeSources,recordKey,auditSources,kinds} from '../public/import-model.js';

export const datasetVersion=sourceInfo.version+':replace-v1';
type SourceRecord=Record<string,unknown>;
type AuditIssue={key:string,parameter:string};

export const db=()=>{
 const binding=(env as unknown as {DB:D1Database}).DB;
 if(!binding)throw new Error('Penyimpanan data belum tersedia.');
 return binding;
};
export async function revision(){
 const result=await db().prepare('SELECT version FROM app_state WHERE id = 1').first<{version:number}>();
 return result?.version||0;
}
export async function getSources():Promise<Record<string,SourceRecord[]>>{
 const stored=await db().prepare("SELECT s.kind,s.record_key,s.payload,i.completed_at FROM source_records s JOIN imports i ON i.id=s.import_id WHERE i.status='complete'").all<{kind:string,record_key:string,payload:string,completed_at:string}>();
 const replacements=await db().prepare("SELECT kind,MAX(completed_at) AS cutoff FROM imports WHERE status='complete' AND json_extract(summary,'$.mode')='replace' GROUP BY kind").all<{kind:string,cutoff:string}>();
 const sources:Record<string,SourceRecord[]>={};
 for(const kind of Object.keys(kinds)){
  const rows=(seed as Record<string,SourceRecord[]>)[kind]||[];
  const replacement=replacements.results.find(result=>result.kind===kind)?.cutoff||'';
  const useReplacement=replacement>((sourceInfo.cutoffs as Record<string,string>)[kind]||'');
  const map=new Map<string,SourceRecord>((useReplacement?[]:rows).map(row=>[recordKey(row),row]));
  for(const storedRow of stored.results.filter(result=>result.kind===kind&&(!useReplacement||result.completed_at>=replacement)&&result.completed_at>((sourceInfo.cutoffs as Record<string,string>)[kind]||''))){
   map.set(storedRow.record_key,JSON.parse(storedRow.payload) as SourceRecord);
  }
  sources[kind]=[...map.values()];
 }
 return sources;
}
export async function getData(includeDetails=false){
 const sources=await getSources();
 const issues=auditSources(sources) as AuditIssue[];
 const issuesByKey=new Map<string,AuditIssue[]>();
 for(const issue of issues){
  if(!issuesByKey.has(issue.key))issuesByKey.set(issue.key,[]);
  issuesByKey.get(issue.key)!.push(issue);
 }
 const assessments=await db().prepare('SELECT * FROM verification_assessments').all<{record_key:string,housing_status:string,recommendation:string,criteria:string,notes:string,updated_at:string}>();
 const assessmentByKey=new Map(assessments.results.map(assessment=>[assessment.record_key,{housingStatus:assessment.housing_status,recommendation:assessment.recommendation,criteria:JSON.parse(assessment.criteria||'{}'),notes:assessment.notes,updatedAt:assessment.updated_at}]));
 const fullRecords=mergeSources(sources).map(record=>{
  const {sources:recordSources,...merged}=record;
  const assessment=assessmentByKey.get(recordKey(merged));
  return {...merged,issueCount:(issuesByKey.get(recordKey(merged))||[]).length,issue:(issuesByKey.get(recordKey(merged))||[]).map(issue=>issue.parameter).join(' · '),verification:recordSources.field?.verification||'',verificationStatus:recordSources.field?.verificationStatus||'',reason:recordSources.field?.reason||'',assessment,legacyFilled:recordSources.legacy?.filled??null,legacyTotal:recordSources.legacy?.total??null,legacyPB:recordSources.legacy?.legacyPB||''};
 });
 const records=includeDetails?fullRecords:fullRecords.map(record=>{
  const listRecord={...record};
  delete listRecord.fieldVerificationDetails;
  delete listRecord.letters;
  delete listRecord.reason;
  delete listRecord.assessment;
  delete listRecord.legacyFilled;
  delete listRecord.legacyTotal;
  delete listRecord.legacyPB;
  return listRecord;
 });
 const history=await db().prepare("SELECT id,kind,filename,count,completed_at,summary FROM imports WHERE status = 'complete' ORDER BY completed_at DESC LIMIT 20").all();
 return {records,issues,sourceInfo,counts:Object.fromEntries(Object.entries(sources).map(([kind,rows])=>[kind,rows.length])),history:history.results,revision:await revision()};
}
export const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});