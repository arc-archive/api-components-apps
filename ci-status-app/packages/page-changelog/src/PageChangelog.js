import { html, css, LitElement } from 'lit-element';
import '@anypoint-web-components/anypoint-button/anypoint-button.js';
import '@anypoint-web-components/anypoint-chip-input/anypoint-chip-input.js';
import '@anypoint-web-components/anypoint-input/anypoint-input.js';
import '@github/time-elements/dist/time-elements.js';
import '@advanced-rest-client/arc-marked/arc-marked.js';
import '../../apic-ci-status/app-message.js';
import { baseStyles, headersStyles, progressCss, breadcrumbsStyles } from '../../common-styles.js';
import { computeIsoDate, breadcrumbsGenerator } from '../../utils.js';

const breadcrumbs = [
  {
    label: 'Changelog',
    href: '/changelog',
    current: true,
  },
];

export const changelogTemplate = (item) => {
  const created = computeIsoDate(item.created);
  const hasTags = !!item.tags;
  return html`<div class="changelog-item card">
    <h3>${item.name} v${item.id}</h3>
    <div class="description-line">
      <label>Published</label
      ><relative-time class="value" datetime="${created}"></relative-time>
    </div>
    <div class="description-line">
      <label>Component group:</label>
      <span class="value">${item.group}</span>
    </div>
    ${hasTags ? html`<div class="description-line">
      <label>Tags:</label>
      <span class="value">${item.tags.join(', ')}</span>
    </div>` : ''}
    ${item.changelog ? html`
    <details>
      <summary>Change log</summary>
      <arc-marked .markdown="${item.changelog}">
        <div slot="markdown-html" class="markdown-html"></div>
      </arc-marked>
    </details>
    ` : ''}
  </div>`;
}

const defaultTags = [
  'amf', 'arc', 'apic'
];
/**
 * A screen page that lists tokens.
 */
export class PageChangelog extends LitElement {
  static get styles() {
    return [
      baseStyles,
      headersStyles,
      progressCss,
      breadcrumbsStyles,
      css`
      :host {
        display: block;
      }

      anypoint-input {
        width: 320px;
      }

      .card {
        padding: 12px;
        border: 1px #e5e5e5 solid;
        margin: 12px 0;
      }

      arc-marked {
        background-color: var(--code-background-color);
        padding: 4px;
      }

      relative-time {
        margin-left: 8px;
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
       * When set to `false` it means that the API won't return more results.
       */
      hasMore: { type: Boolean },
      /**
       * The value of "since" field input
       */
      since: { type: String },
      /**
       * The value of "since" field input
       */
      until: { type: String },
      /**
       * List of items to render.
       */
      items: { type: Array },
      /**
       * Current list of tag filters.
       */
      tags: { type: Array },
      /**
       * Last error messsage to render.
       */
      lastError: { type: String }
    };
  }

  /**
   * @return {Boolean} True when `items` are set.
   */
  get hasResult() {
    const { items } = this;
    return !!(items && items.length);
  }

  /**
   * @return {Boolean} True when `items` are set.
   */
  get noResults() {
    const { hasResult, loading } = this;
    return !hasResult && !loading;
  }

  constructor() {
    super();
    this.hasMore = true;
    this.tags = [];
  }

  /**
   * Initializes the page.
   * It ensures the user is authorized and then requests token list.
   * @return {Promise}
   */
  async _initialize() {
    await this.loadNextResults();
  }

  /**
   * Creates token list request URL that includes pagination parameters.
   * @return {String} Token request URL
   */
  getRequestUrl() {
    const { apiBase, since, until, tags } = this;
    let url = `${apiBase}components/versions?skip-docs=true`;
    if (since) {
      const d = new Date(since).getTime();
      url += `&since=${d}`;
    }
    if (until) {
      const d = new Date(until).getTime();
      url += `&until=${d}`;
    }
    tags.forEach((tag) => {
      const value = encodeURIComponent(tag);
      url += `&tags=${value}`;
    });
    if (this._lastBaseQuery !== url) {
      this.pageToken = null;
      this.items = [];
    }
    this._lastBaseQuery = url;
    const { pageToken } = this;
    if (pageToken) {
      url += `?nextPageToken=${pageToken}`;
    }
    return url;
  }

  /**
   * Loads next page of tokens and updates `tokens` array.
   * @return {Promise}
   */
  async loadNextResults() {
    const url = this.getRequestUrl();
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
      this.lastError = data.message;
      return;
    }

    const pageToken = data.nextPageToken;
    this.pageToken = pageToken;

    const { hasMore } = this;

    if (pageToken && !hasMore) {
      this.hasMore = true;
    } else if (!pageToken && hasMore) {
      this.hasMore = false;
    }
    if (!data.items) {
      return;
    }
    let items = this.items || [];
    items = items.concat(data.items);
    this.items = items;
    this.requestUpdate();
  }

  async search() {
    this.pageToken = null;
    this.items = [];
    this.hasMore = true;
    await this.loadNextResults();
  }

  /**
   * Removes `lastError` message.
   */
  closeError() {
    this.lastError = undefined;
  }

  _inputHandler(e) {
    const { name, value } = e.target;
    this[name] = value;
  }

  _tagsHandler(e) {
    const { value } = e.detail;
    this.tags = value;
  }

  render() {
    const { lastError, hasResult, loading } = this;
    return html`
    ${breadcrumbsGenerator(breadcrumbs)}
    ${this._formTemplate()}
    ${loading ? html`<progress></progress>` : ''}
    ${lastError ? html`<app-message
      type="error"
      @close="${this.closeError}"
    >${lastError}</app-message>` : ''}

    ${hasResult ? this._resultsTemplate() : ''}
    `;
  }

  _formTemplate() {
    const { since, until, tags } = this;
    return html`<section class="config card">
      <h2>Search options</h2>
      <p>All fields are optional</p>
      <div class="time-row">
        <anypoint-input
          type="datetime-local"
          name="since"
          .value="${since}"
          @input="${this._inputHandler}"
        >
          <label slot="label">Since</label>
        </anypoint-input>
        <anypoint-input
          type="datetime-local"
          name="until"
          .value="${until}"
          @input="${this._inputHandler}"
        >
          <label slot="label">Until</label>
        </anypoint-input>
      </div>
      <div class="tags-container">
        <anypoint-chip-input
          .source="${defaultTags}"
          name="tags"
          .chipsValue="${tags}"
          @chips-changed="${this._tagsHandler}"
          infoMessage="Use tags to limit number of results. Start typing to open suggestions."
        >
          <label slot="label">Tags</label>
        </anypoint-chip-input>
      </div>
      <div class="search-action">
        <anypoint-button class="search-button" @click="${this.search}">Search</anypoint-button>
      </div>
    </section>`;
  }

  _resultsTemplate() {
    const {
      hasMore,
    } = this;
    const items = this.items || [];
    return html`
    ${items.map((changelog) => changelogTemplate(changelog))}

    ${hasMore ? html`<div class="more-container">
      <anypoint-button
        @click="${this.loadNextResults}"
        class="more-button"
        emphasis="medium"
      >Load more</anypoint-button>
    </div>` : ''}
    `;
  }
}
