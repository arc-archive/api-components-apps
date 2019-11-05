import { html, css, LitElement } from 'lit-element';
import '@anypoint-web-components/anypoint-button/anypoint-button.js';
import '@anypoint-web-components/anypoint-item/anypoint-item.js';
import '@anypoint-web-components/anypoint-item/anypoint-item-body.js';
import '@github/time-elements/dist/time-elements.js';
import '../../apic-ci-status/app-message.js';
import { classMap } from 'lit-html/directives/class-map.js';
import { routerLinkMixin } from 'lit-element-router/router-mixin/router-mixin.js';
import { baseStyles, headersStyles, progressCss } from '../../common-styles.js';
import { computeIsoDate } from '../../utils.js';
import { refresh, arrowBack, deleteIcon } from '../../Icons.js';

export const computeTestResult = (status) => status ? 'Passed' : 'Failed';

export const amfTypeDetailsTemplate = (test) => {
  return html`
    <div class="desc type">Test type: <span class="branch-value">AMF</span></div>
    <div class="desc type">Branch: <span class="branch-value">${test.branch}</span></div>
  `;
};
export const bottomUpTypeDetailsTemplate = (test) => {
  return html`
    <div class="desc type">Test type: <span class="branch-value">bottom-up</span></div>
    <div class="desc type">Component: <span class="branch-value">${test.component}</span></div>
    <div class="desc type">Branch: <span class="branch-value">${test.branch}</span></div>
  `;
};

export const testTypeDetails = (test) => {
  switch (test.type) {
    case 'amf-build': return amfTypeDetailsTemplate(test);
    case 'bottom-up': return bottomUpTypeDetailsTemplate(test);
    default: return '';
  }
};
/**
 * A screen page that lists tokens.
 */
export class PageTest extends routerLinkMixin(LitElement) {
  static get styles() {
    return [
      baseStyles,
      headersStyles,
      progressCss,
      css`
      :host {
        display: block;
      }

      .result-value {
        color: #F44336;
      }

      .passed .result-value {
        color: #2E7D32;
      }

      .result-list {
        margin: 40px 0;
      }

      .item-status {
        width: 80px;
        text-transform: capitalize;
        color: #F44336;
      }

      .passed .item-status {
        color: #2E7D32;
      }

      .running .item-status {
        color: #2196F3;
      }

      .item-name {
        flex: 1;
      }

      anypoint-button,
      a {
        text-decoration: none;
      }
    `];
  }

  static get properties() {
    return {
      /**
       * An instance of `UserStatus` class.
       */
      userStatus: { type: Object },
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
       * List of items to render.
       */
      items: { type: Array },
      /**
       * True when the user is logged in
       */
      loggedIn: { type: Boolean },
      /**
       * Last error mesage to render to the user.
       */
      lastError: { type: String },
      /**
       * A tests id to reder details for.
       */
      testId: { type: String },
      /**
       * A test details object.
       */
      testDetail: { type: Object }
    };
  }

  /**
   * @return {Boolean} True when `items` are set.
   */
  get hasResult() {
    const { items } = this;
    return !!(items && items.length);
  }

  get isFinished() {
    const { testDetail } = this;
    return testDetail.status === 'finished';
  }

  get isQueued() {
    const { testDetail } = this;
    return testDetail.status === 'queued';
  }

  get isRunning() {
    const { testDetail } = this;
    return testDetail.status === 'running';
  }

  get isPassed() {
    const { testDetail } = this;
    return testDetail.status === 'finished' && !testDetail.failed;
  }

  constructor() {
    super();
    this.hasMore = true;
    this.loggedIn = false;
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
    await this.loadNextResults();
    await this._initUser();
  }

  async _initUser() {
    const { userStatus } = this;
    if (!userStatus) {
      return;
    }
    if (!userStatus.loggedIn) {
      this.loading = true;
      await userStatus.getUser();
      this.loading = false;
    }
    if (!userStatus.loggedIn) {
      return;
    }
    this.loggedIn = true;
  }

  async loadTest() {
    const { apiBase, testId } = this;
    const url = `${apiBase}tests/${testId}`;
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
    this.testDetail = data;
  }

  /**
   * Creates token list request URL that includes pagination parameters.
   * @return {String} Token request URL
   */
  getRequestUrl() {
    const { apiBase, testId } = this;
    let url = `${apiBase}tests/${testId}/components`;
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
    let items = this.items || [];
    items = items.concat(data.items);
    this.items = items;
    this.requestUpdate();
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
    this.testDetail = null;
    await this.loadTest();
    await this.loadNextResults();
  }

  /**
   * Click handle on the delete test button.
   * @param {Event} e
   */
  _deleteHandler() {
    this.deleteTest();
  }

  async deleteTest() {
    const init = {
      method: 'DELETE',
      credentials: 'include'
    };
    this.loading = true;
    const { testId, apiBase } = this;
    const url = `${apiBase}tests/${testId}`;
    const response = await fetch(url, init);
    if (response.status === 204) {
      const href = new URL('/tests', window.location.href);
      this.navigate(href.toString());
      return;
    }
    try {
      const data = await response.json();
      this.lastError = data.message || 'Invalid request';
    } catch (e) {
      this.lastError = 'Invalid response from the API';
    }
  }

  /**
   * Removes `lastError` message.
   */
  closeError() {
    this.lastError = undefined;
  }

  render() {
    const { lastError, hasResult, loading, testDetail, loggedIn } = this;
    return html`
    ${lastError ? html`<app-message
      type="error"
      @close="${this.closeError}"
    >${lastError}</app-message>` : ''}

    <div class="page-header">
      <a href="/tests">
        <anypoint-icon-button
          title="Back to tests list page"
          aria-label="Activate to go back to tests list"
        >
          <span class="icon">${arrowBack}</span>
        </anypoint-icon-button>
      </a>
      <h3 class="title">Test details</h3>
      <anypoint-icon-button
        title="Refresh the list"
        aria-label="Activate to refresh the list"
        @click="${this._refreshHandler}"
      >
        <span class="icon">${refresh}</span>
      </anypoint-icon-button>

      ${loggedIn ? html`<anypoint-icon-button
        title="Delete the test and the results"
        aria-label="Activate to delete the test and the results"
        @click="${this._deleteHandler}"
      >
        <span class="icon">${deleteIcon}</span>
      </anypoint-icon-button>` : ''}
    </div>
    ${loading ? html`<progress></progress>` : ''}
    ${testDetail ? this._testDetailTemplate() : ''}
    ${hasResult ? this._resultsTemplate() : ''}
    `;
  }

  _testDetailTemplate() {
    const { testDetail, isFinished, isPassed } = this;
    const classes = { passed: isPassed, details: true };
    return html`
    <section
      class=${classMap(classes)}
    >
      <div class="desc status">
        Status: <span class="status-value">${testDetail.status}</span>
      </div>
      ${isFinished ? html`
      <div class="desc result">
        Result:
        <span
          class="result-value"
        >${computeTestResult(isPassed)}</span> (<span
          class="passed-count"
          >${testDetail.passed || 0}</span
        >/<span class="failed-count">${testDetail.failed || 0}</span>)
      </div>` : ''}
      ${testTypeDetails(testDetail)}
      ${testDetail.endTime ? html`<div class="desc end-time">
        Test ended: <relative-time datetime="${computeIsoDate(testDetail.endTime)}"></relative-time>
      </div>` : ''}
    </section>
    `;
  }

  _resultsTemplate() {
    const items = this.items || [];
    return html`
    <section class="result-list">
      <h4>Components</h4>
      ${items.map((item) => this._componentListItem(item))}
    </section>
    `;
  }

  _componentListItem(item) {
    const { testDetail } = this;
    const classes = { passed: item.status === 'passed', running: item.status === 'running' };
    return html`
    <anypoint-item class=${classMap(classes)}>
      <div class="item-status">${item.status}</div>
      <div class="item-name">${item.component}</div>
      ${item.hasLogs ? html`<a href="/tests/${testDetail.id}/${item.id}">
        <anypoint-button>Details</anypoint-button>
      </a>` : ''}
    </anypoint-item>`;
  }
}
