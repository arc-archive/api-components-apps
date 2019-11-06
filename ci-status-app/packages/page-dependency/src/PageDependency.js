import { html, css, LitElement } from 'lit-element';
import '@anypoint-web-components/anypoint-button/anypoint-button.js';
import '@anypoint-web-components/anypoint-dropdown-menu/anypoint-dropdown-menu.js';
import '@anypoint-web-components/anypoint-listbox/anypoint-listbox.js';
import '@anypoint-web-components/anypoint-item/anypoint-item.js';
import '@anypoint-web-components/anypoint-input/anypoint-input.js';
import { baseStyles, headersStyles, progressCss, breadcrumbsStyles } from '../../common-styles.js';
import { breadcrumbsGenerator } from '../../utils.js';
import '../../apic-ci-status/app-message.js';

const breadcrumbs = [
  {
    label: 'Dependency',
    href: '/dependency',
    current: true,
  },
];
/**
 * A screen page that lists tokens.
 */
export class PageDependency extends LitElement {
  static get styles() {
    return [
      baseStyles,
      headersStyles,
      progressCss,
      breadcrumbsStyles,
      css`
      :host {
        display: block;
        position: relative;
      }

      anypoint-item {
        padding-bottom: 12px;
        padding-top: 12px;
        border-bottom: 1px #e5e5e5 dashed;
      }

      .inline-row {
        display: flex;
        align-items: center;
        flex-direction: row;
        flex-wrap: wrap;
      }

      .card {
        padding: 12px;
        border: 1px #e5e5e5 solid;
        margin: 12px 0;
      }

      anypoint-item .type {
        margin-right: 12px;
      }

      .type.prod {
        color: var(--info-color);
      }

      .type.dev {
        color: var(--warning-color);
      }
    `];
  }

  static get properties() {
    return {
      /**
       * Current loading state.
       */
      loading: { type: Boolean },
      /**
       * API base URI
       */
      apiBase: { type: String },
      /**
       * Tokens pagination `pageToken`.
       * This is returned by the API and used in subsequent requests
       * to get next page of results.
       */
      pageToken: { type: String },
      /**
       * The list of dependencies for current element.
       */
      items: { type: Array },
      /**
       * An API token to be used to create / delete requests.
       */
      apiToken: { type: String },
      /**
       * Last error mesage to render to the user.
       */
      lastError: { type: String },
      /**
       * Current component name
       */
      component: { type: String },
      /**
       * Current component scope
       */
      scope: { type: String },
      /**
       * Describes whether it searches for dependencies (0) or of dependees (1)
       * of the component.
       */
      searchType: { type: Number },
    };
  }

  /**
   * @return {Boolean} True when `tokens` are set.
   */
  get hasItems() {
    const { items } = this;
    return !!(items && items.length)
  }

  constructor() {
    super();
    this.searchType = 0;
    this.scope = 'advanced-rest-client';
    this.component = 'arc-icons';
  }

  _inputHandler(e) {
    const { name, value } = e.target;
    this[name] = value;
  }

  _selectionHandler(e) {
    const { selected } = e.target;
    const { name } = e.target.parentElement;
    this[name] = selected;
  }

  async search() {
    const { component, scope, searchType, apiBase } = this;
    if (!component || !scope) {
      return;
    }
    let type;
    switch (searchType) {
      case 0: type = 'dependencies'; break;
      case 1: type = 'dependees'; break;
      default: return;
    }
    const url = `${apiBase}components/${scope}/${component}/${type}`;
    const init = {
      credentials: 'include'
    };
    this.loading = true;
    let response;
    try {
      response = await fetch(url, init);
    } catch (e) {
      this.lastError = `${e.message}. Check your internet connection.`;
      return;
    }
    const success = response.ok;
    const data = await response.json();
    this.loading = false;
    if (!success) {
      this.lastError = data.message || 'Unknown error ocurred';
      return;
    }
    this.items = data.items;
  }

  /**
   * Removes `lastError` message.
   */
  closeError() {
    this.lastError = undefined;
  }

  render() {
    const { lastError, hasItems, loading } = this;
    return html`
    ${breadcrumbsGenerator(breadcrumbs)}
    ${lastError ? html`<app-message
      type="error"
      @close="${this.closeError}"
    >${lastError}</app-message>` : ''}

    ${this._formTemplate()}
    ${loading ? html`<progress></progress>` : ''}
    ${hasItems ? this._listItems() : ''}
    `;
  }

  _formTemplate() {
    const { component, searchType, scope } = this;
    return html`<section class="config card">
      <h2>Search options</h2>

      <div class="inline-row">
        Search for a
        <anypoint-dropdown-menu
          name="searchType"
          required
        >
          <label slot="label">Search type</label>
          <anypoint-listbox
            slot="dropdown-content"
            .selected="${searchType}"
            @selected-changed="${this._selectionHandler}"
          >
            <anypoint-item>dependencies</anypoint-item>
            <anypoint-item>dependees</anypoint-item>
          </anypoint-listbox>
        </anypoint-dropdown-menu>
        of
        <anypoint-input
          name="scope"
          .value="${scope}"
          @input="${this._inputHandler}"
          required
          autovalidate
          infoMessage="NPM scope name"
        >
          <label slot="label">Component scope</label>
          <span slot="prefix">@</span>
        </anypoint-input>
        <anypoint-input
          name="component"
          .value="${component}"
          @input="${this._inputHandler}"
          infoMessage="NPM package name"
        >
          <label slot="label">Component name</label>
        </anypoint-input>
      </div>

      <div class="search-action">
        <anypoint-button class="search-button" @click="${this.search}">Search</anypoint-button>
      </div>
    </section>`;
  }

  _listItems() {
    const { items } = this;
    return html`<section role="list">
    ${items.map((item) => html`<anypoint-item>
      ${item.production ? html`<span class="type prod">PRD</span>` : ''}
      ${item.development ? html`<span class="type dev">DEV</span>` : ''}
      ${item.name}
    </anypoint-item>`)}
    </section>`;
  }
}
