import { html, css, LitElement } from 'lit-element';
import '@anypoint-web-components/anypoint-button/anypoint-button.js';
import '@anypoint-web-components/anypoint-item/anypoint-item.js';
import '@anypoint-web-components/anypoint-item/anypoint-item-body.js';
import '@github/time-elements/dist/time-elements.js';
import '@polymer/app-storage/app-indexeddb-mirror/app-indexeddb-mirror.js';
import '../../apic-ci-status/app-message.js';
import { classMap } from 'lit-html/directives/class-map.js';
import { baseStyles, headersStyles, progressCss, breadcrumbsStyles } from '../../common-styles.js';
import { computeIsoDate, breadcrumbsGenerator } from '../../utils.js';
import { refresh } from '../../Icons.js';

const typeLabel = (type) => {
  switch (type) {
    case 'master-build': return 'Mater branch build';
    case 'stage-build': return 'Stage branch build';
    case 'tag-build': return 'Tag build';
    default: return type;
  }
}

const testItemTemplate = (item, index) => {
  const { status, type, error, component, id } = item;
  const isRunning = status === 'running';
  const isQueued = status === 'queued';
  const isFinished = status === 'finished';
  const classes = { failed: error, running: isRunning, queued: isQueued, finished: isFinished };
  return html`<anypoint-item
    data-index="${index}"
    class=${classMap(classes)}
    role="listitem"
  >
    <anypoint-item-body threeline>
      <div class="cmp-name">
        ${component}
      </div>
      <div secondary class="status-line">
        Status: ${status}
        ${isFinished ? html`<relative-time datetime="${computeIsoDate(item.endTime)}" class="lm"></relative-time>` : ''}
      </div>
      <div secondary class="test-result">
        Type: ${typeLabel(type)}
      </div>
      ${error ? html`<app-message
        type="error"
        persistant
      >${item.message}</app-message>` : ''}
    </anypoint-item-body>
    <a href="/builds/${id}">
      <anypoint-button>Details</anypoint-button>
    </a>
  </anypoint-item>

  `;
}

const breadcrumbs = [
  {
    label: 'Builds',
    href: '/builds',
    current: true,
  },
];
/**
 * A screen page that lists builds status list.
 */
export class PageBuilds extends LitElement {
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

      [secondary] {
        font-size: 0.88rem;
        color: var(--secondary-text-color);
      }

      .rm {
        margin-right: 8px;
      }

      .lm {
        margin-left: 8px;
      }

      .failed .cmp-name {
        color: var(--error-color);
      }

      .running .test-result {
        color: var(--info-color);
      }

      .queued .test-result {
        color: var(--success-color);
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
       * Tests pagination `pageToken`.
       * This is returned by the API and used in subsequent requests
       * to get next page of results.
       */
      pageToken: { type: String },
      /**
       * When set to `false` it means that the API won't return more results.
       */
      hasMore: { type: Boolean },
      /**
       * List of items to render.
       */
      items: { type: Array },
      /**
       * Last error mesage to render to the user.
       */
      lastError: { type: String },
      /**
       * The data returned from the API. It is passed to the indexeddb storage
       * for processing
       */
      _liveItems: { type: Array },
    };
  }

  /**
   * @return {Boolean} True when `items` are set.
   */
  get hasResult() {
    const { items } = this;
    return !!(items && items.length);
  }

  constructor() {
    super();
    this.hasMore = true;
  }

  connectedCallback() {
    super.connectedCallback();
    this._initialize();
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
    const { apiBase } = this;
    let url = `${apiBase}builds`;
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
    const response = await fetch(url, init);
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
    let items = this._liveItems || [];
    items = items.concat(data.items);
    this._liveItems = items;
    this.requestUpdate();
  }

  /**
   * Handler for `app-indexeddb-mirror` data read event
   * @param {CustomEvent} e
   */
  async _persistentItemsHandler(e) {
    const { value } = e.detail;
    await this.updateComplete;
    this.loading = false;
    this.items = value;
  }

  /**
   * Click handle on the refresh list button.
   * @param {Event} e
   */
  _refreshHandler() {
    this.refresh();
  }

  /**
   * Refreshes current list of tokens.
   * If `pageToken` and `tokens` are set then they are cleared.
   * @return {Promise}
   */
  async refresh() {
    this.pageToken = null;
    this.items = null;
    this._liveItems = null;
    await this.loadNextResults();
  }

  /**
   * Removes `lastError` message.
   */
  closeError() {
    this.lastError = undefined;
  }

  render() {
    const { lastError, hasResult, loading, _liveItems } = this;
    return html`
    ${breadcrumbsGenerator(breadcrumbs)}
    ${lastError ? html`<app-message
      type="error"
      @close="${this.closeError}"
    >${lastError}</app-message>` : ''}

    <div class="page-header">
      <h2 class="title">API components builds</h2>
      <anypoint-icon-button
        title="Refresh the list"
        aria-label="Activate to refresh the list"
        @click="${this._refreshHandler}"
      >
        <span class="icon">${refresh}</span>
      </anypoint-icon-button>
    </div>
    ${loading ? html`<progress></progress>` : ''}
    ${hasResult ? this._resultsTemplate() : ''}
    <app-indexeddb-mirror
      key="builds"
      .data="${_liveItems}"
      @persisted-data-changed="${this._persistentItemsHandler}">
    </app-indexeddb-mirror>
    `;
  }

  _resultsTemplate() {
    const { items, hasMore } = this;
    return html`<section class="results" role="list">
    ${items.map((item, index) => testItemTemplate(item, index))}
    </section>
    ${hasMore ? html`<div class="more-container">
      <anypoint-button
        @click="${this.loadNextResults}"
        class="more-button"
        emphasis="medium"
      >Load more</anypoint-button>
    </div>` : ''}`;
  }
}
