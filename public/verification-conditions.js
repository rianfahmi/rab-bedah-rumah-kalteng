export function conditionalFields(values) {
 const states = {
  'field-help-type': values['field-prior-help'] === 'Ya',
  'field-help-year': values['field-prior-help'] === 'Ya',
 };
 for (const key of Object.keys(values)) {
  if (!/^(material-used|material-new|money|labor)-\d+-available$/.test(key)) continue;
  const prefix = key.slice(0, -10), enabled = values[key] === 'Ada';
  for (const suffix of ['value', 'name', 'photo']) states[prefix + '-' + suffix] = enabled;
 }
 return states;
}
// Include disabled controls so a temporary choice change never erases entered facts.
const normalizeNumber=value=>{const text=String(value??'').trim().replace(/[^0-9,.-]/g,'');if(!text)return '';const normalized=text.includes(',')?text.replace(/\./g,'').replace(',','.'):text.replace(/\./g,'');const number=Number(normalized);return Number.isFinite(number)&&number>=0?String(number):''};
export function readFactualFields(form) {
 const values = {};
 for (const element of form.elements) {
  if (!element.name || ['submit', 'button'].includes(element.type)) continue;
  if (['radio', 'checkbox'].includes(element.type) && !element.checked) continue;
  const raw=element.value;
  const normalized=element.dataset.numberFormat?normalizeNumber(raw):raw;
  values[element.name] = normalized;
 }
 return values;
}
export function updateConditionalFields(form) {
 const states = conditionalFields(readFactualFields(form));
 for (const element of form.elements) {
  if (!(element.name in states)) continue;
  element.disabled = !states[element.name];
  element.title = element.disabled ? (element.name.startsWith('field-help-') ? 'Aktif jika pernah menerima bantuan dipilih Ya.' : 'Aktif jika ketersediaan dipilih Ada.') : '';
 }
}
