import { html } from 'lit-element';
/**
 * Creates ISO date string from a timestamp
 * @param {Number} time A timestamp to process
 * @return {String|null}
 */
export const computeIsoDate = (time) => {
  if (!time || Number.isNaN(time)) {
    return null;
  }
  const d = new Date(Number(time));
  return d.toISOString();
}
/**
 * Translates token value to a corresponding label.
 * @param {String} scope Scope value
 * @return {String} Label to render.
 */
export const scopeToLabel = (scope) => {
  switch (scope) {
    case 'all': return 'Full access';
    case 'create-test': return 'Create test';
    case 'delete-test': return 'Delete test';
    case 'create-message': return 'Create ARC message';
    case 'delete-message': return 'Delete ARC message';
    case 'schedule-component-build': return 'Schedule component build process';
    default: return scope;
  }
};
/**
 * List of all available scopes.
 * @type {Array}
 */
export const scopes = [
  'all', 'create-test', 'delete-test', 'create-message', 'delete-message',
  'schedule-component-build'
];

export const breadcrumbsGenerator = (items) => {
  if (!items) {
    return '';
  }
  return html`<nav class="breadcrumbs" role="navigation" aria-label="Breadcrumbs">
  <ol typeof="BreadcrumbList" vocab="https://schema.org/" aria-label="Breadcrumbs">
    ${items.map((item, index) => html`
    <li property="itemListElement" typeof="ListItem">
      <a href="${item.href}" class="breadcrumb-${item.current ? 'current' : 'chevron'}" property="item" typeof="WebPage">
        <span property="name">${item.label}</span>
      </a>
      <meta property="position" content="${index + 1}">
    </li>`)}
  </nav>`;
};
