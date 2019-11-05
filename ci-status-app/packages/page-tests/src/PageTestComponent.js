import { html, css, LitElement } from 'lit-element';
import '@anypoint-web-components/anypoint-button/anypoint-button.js';
import '@anypoint-web-components/anypoint-item/anypoint-item.js';
import '@anypoint-web-components/anypoint-item/anypoint-item-body.js';
import '@github/time-elements/dist/time-elements.js';
import '../../apic-ci-status/app-message.js';
import '../browser-execution-logs.js';
import { classMap } from 'lit-html/directives/class-map.js';
import { routerLinkMixin } from 'lit-element-router/router-mixin/router-mixin.js';
import { baseStyles, headersStyles, progressCss, breadcrumbsStyles } from '../../common-styles.js';
import { computeIsoDate, breadcrumbsGenerator } from '../../utils.js';
import { arrowBack } from '../../Icons.js';

export const resultBoxTemplate = (label, value, cls) => {
  if (value === undefined) {
    return '';
  }
  const klas = cls || '';
  return html`<div class="info-tile ${klas}">
    <label>${label}</label>
    <span class="tile-value">${value}</span>
  </div>`;
}

export const browserDetailsTemplate = (browser) => {
  const { logs } = browser;
  const hasLogs = !!(logs && logs.length);
  return html`
  <div class="desc">
    Passed: ${browser.success || 0}
  </div>
  <div class="desc">
    Failed: ${browser.failed || 0}
  </div>
  <div class="desc">
    Skipped: ${browser.skipped || 0}
  </div>
  <div class="desc">
    Total: ${browser.total || 0}
  </div>

  ${hasLogs ? html`<browser-execution-logs .logs="${logs}"></browser-execution-logs>` : ''}
  `;
}
/**
 * A screen page that lists tokens.
 */
export class PageTestComponent extends routerLinkMixin(LitElement) {
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

      .result-tiles {
        display: flex;
        align-items: center;
        flex-direction: row;
        flex-wrap: wrap;
      }

      .info-tile {
        width: 160px;
        height: 100px;
        border: 1px #e5e5e5 solid;
        border-radius: 3px;
        margin: 12px;
        padding: 8px;
        text-align: right;
      }

      .info-tile label {
        display: block;
        font-weight: 200;
      }

      .tile-value {
        display: block;
        font-size: 64px;
        line-height: 64px;
      }

      .success .tile-value {
        color: var(--success-color);
      }

      .fails .tile-value {
        color: var(--error-color);
      }

      .skips .tile-value {
        color: #607D8B;
      }

      details {
        padding: .5em;
      }

      .browser-summary {
        margin: 0 16px;
      }

      browser-execution-logs {
        margin-top: 24px;
      }

      :host([narrow]) .tile-value {
        font-size: 32px;
        line-height: 32px;
      }

      :host([narrow]) .info-tile {
        width: 64px;
        height: 60px;
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
       * Last error mesage to render to the user.
       */
      lastError: { type: String },
      /**
       * A tests id to reder details for.
       */
      testId: { type: String },
      /**
       * And ID of the component to render the info for.
       */
      componentId: { type: String },
      /**
       * A test details object.
       */
      componentDetail: { type: Object },
      /**
       * List of logs to render.
       * Each element on the list represent a browser execution logs.
       */
      logs: { type: Array },
      /**
       * The items data returned from the API. It is passed to the indexeddb storage
       * for processing
       */
      _liveLogs: { type: Array },
      /**
       * The test data returned from the API. It is passed to the indexeddb storage
       * for processing
       */
      _liveComponentDetail: { type: Object },
      /**
       * When true it renders mobile friendly view.
       */
      narrow: { type: Boolean, reflect: true },
    };
  }

  get componentKey() {
    const { testId, componentId } = this;
    return `tests/${testId}/${componentId}`;
  }

  get logsKey() {
    const { testId, componentId } = this;
    return `tests/${testId}/${componentId}/logs`;
  }

  get breadcrumbs() {
    const { testId, componentId } = this;
    if (!testId || !componentId) {
      return null;
    }
    return [
      {
        label: 'Tests',
        href: '/tests',
        current: false,
      },
      {
        label: testId,
        href: `/tests/${testId}`,
        current: false,
      },
      {
        label: componentId,
        href: `/tests/${testId}/${componentId}`,
        current: true,
      },
    ];
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
    await this.loadTest();
    await this.loadLogs();
  }

  async loadTest() {
    const { apiBase, testId, componentId } = this;
    const url = `${apiBase}tests/${testId}/components/${componentId}`;
    const init = {
      credentials: 'include'
    };
    this.loading = true;
    const response = await fetch(url, init);
    const success = response.ok;
    const data = await response.json();
    this.loading = false;
    if (!success) {
      this.lastError = data.message || 'Unknown error ocurred.';
      return;
    }
    this._liveComponentDetail = data;
  }

  /**
   * Handler for `app-indexeddb-mirror` data read event for test details
   * @param {CustomEvent} e
   */
  _persistentTestHandler(e) {
    const { value } = e.detail;
    this.componentDetail = value;
  }

  async loadLogs() {
    const { apiBase, testId, componentId } = this;
    const url = `${apiBase}tests/${testId}/components/${componentId}/logs`;
    const init = {
      credentials: 'include'
    };
    this.loading = true;
    const response = await fetch(url, init);
    const success = response.ok;
    const data = await response.json();
    this.loading = false;
    if (!success) {
      this.lastError = data.message || 'Unknown error ocurred.';
      return;
    }
    this._liveLogs = data.items;
  }

  /**
   * Handler for `app-indexeddb-mirror` data read event for items
   * @param {CustomEvent} e
   */
  async _persistentLogsHandler(e) {
    const { value } = e.detail;
    this.logs = value;
    await this.updateComplete;
    this.loading = false;
    this.requestUpdate();
  }

  /**
   * Removes `lastError` message.
   */
  closeError() {
    this.lastError = undefined;
  }

  render() {
    const {
      lastError,
      loading,
      _liveLogs,
      _liveComponentDetail,
      componentKey,
      logsKey,
      testId,
    } = this;
    const info = this.componentDetail || {};
    const title = info && info.component || 'Test results';
    return html`
    ${breadcrumbsGenerator(this.breadcrumbs)}
    ${lastError ? html`<app-message
      type="error"
      @close="${this.closeError}"
    >${lastError}</app-message>` : ''}

    <div class="page-header">
      <a href="/tests/${testId}">
        <anypoint-icon-button
          title="Back to test result page"
          aria-label="Activate to go back to test result page"
          tabindex="-1"
        >
          <span class="icon">${arrowBack}</span>
        </anypoint-icon-button>
      </a>
      <h2 class="title">${title}</h2>
    </div>
    ${loading ? html`<progress></progress>` : ''}
    ${info ? this._componentDetailTemplate() : ''}
    ${this._resultsTemplate()}

    <app-indexeddb-mirror
      .key="${componentKey}"
      .data="${_liveComponentDetail}"
      @persisted-data-changed="${this._persistentTestHandler}">
    </app-indexeddb-mirror>

    <app-indexeddb-mirror
      .key="${logsKey}"
      .data="${_liveLogs}"
      @persisted-data-changed="${this._persistentLogsHandler}">
    </app-indexeddb-mirror>
    `;
  }

  _componentDetailTemplate() {
    const { componentDetail: info } = this;
    if (!info) {
      return '';
    }
    return html`
    <section class="result-tiles">
    ${resultBoxTemplate('Total', info.total)}
    ${resultBoxTemplate('Success', info.success, 'success')}
    ${resultBoxTemplate('Fails', info.failed, 'fails')}
    ${resultBoxTemplate('Skipped', info.skipped, 'skips')}
    </section>
    `;
  }

  _resultsTemplate() {
    const { logs } = this;
    if (!logs) {
      return '';
    }
    return logs.map((browser) => html`<details open>
      <summary>${browser.browser}</summary>
      <div class="${classMap({'browser-summary': true, error: browser.error})}">
        <div class="desc">
          Test ended: <relative-time datetime="${computeIsoDate(browser.endTime)}"></relative-time>
        </div>
        ${browser.error ? html`<app-message
          type="error"
          persistant
        >${browser.message}</app-message>` : browserDetailsTemplate(browser)}
      </div>
    </details>`);
  }
}
