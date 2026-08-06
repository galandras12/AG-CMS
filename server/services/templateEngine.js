/**
 * Minimalis, fuggoseg nelkuli sablon motor a temak HTML sablonjaihoz.
 * Tamogatott szintaxis:
 *   {{key}}         - HTML-escapelt ertek (pl. {{site.name}}, {{post.title}})
 *   {{{key}}}       - nyers (nem escapelt) ertek, pl. mar renderelt HTML-hez
 *   {{#each path}}...{{/each}}  - tomb bejarasa, a blokkon belul {{this.x}} vagy {{x}}
 *   {{#if path}}...{{/if}}      - feltetel (truthy ellenorzes)
 * Nem tamogat egymasba agyazott #each/#if blokkokat - a temaknak ez eleg.
 */

function get(obj, path) {
  return path.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderEach(template, context) {
  return template.replace(/{{#each\s+([\w.]+)\s*}}([\s\S]*?){{\/each}}/g, (match, path, inner) => {
    const arr = get(context, path);
    if (!Array.isArray(arr)) return '';
    return arr
      .map((item) => render(inner, { ...context, this: item, ...(typeof item === 'object' && item !== null ? item : {}) }))
      .join('');
  });
}

function renderIf(template, context) {
  return template.replace(/{{#if\s+([\w.]+)\s*}}([\s\S]*?){{\/if}}/g, (match, path, inner) => {
    return get(context, path) ? render(inner, context) : '';
  });
}

function renderVars(template, context) {
  return template
    .replace(/{{{\s*([\w.]+)\s*}}}/g, (m, path) => get(context, path) ?? '')
    .replace(/{{\s*([\w.]+)\s*}}/g, (m, path) => escapeHtml(get(context, path)));
}

function render(template, context) {
  let out = renderEach(template, context);
  out = renderIf(out, context);
  out = renderVars(out, context);
  return out;
}

module.exports = { render, get, escapeHtml };
