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
export function readFactualFields(form) {
 const values = {};
 for (const element of form.elements) {
  if (!element.name || ['submit', 'button'].includes(element.type)) continue;
  if (['radio', 'checkbox'].includes(element.type) && !element.checked) continue;
  values[element.name] = element.value;
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
