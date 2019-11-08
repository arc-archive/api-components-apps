import { html, css, LitElement } from 'lit-element';
import '@anypoint-web-components/anypoint-button/anypoint-button.js';
import '@anypoint-web-components/anypoint-item/anypoint-item.js';
import '@anypoint-web-components/anypoint-item/anypoint-item-body.js';
import '@github/time-elements/dist/time-elements.js';
import '@polymer/app-storage/app-indexeddb-mirror/app-indexeddb-mirror.js';
import '../../apic-ci-status/app-message.js';
import { classMap } from 'lit-html/directives/class-map.js';
import { routerLinkMixin } from 'lit-element-router/router-mixin/router-mixin.js';
import { baseStyles, headersStyles, progressCss, breadcrumbsStyles } from '../../common-styles.js';
import { computeIsoDate, breadcrumbsGenerator } from '../../utils.js';
import { refresh, arrowBack } from '../../Icons.js';

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
export class PageBuild extends routerLinkMixin(LitElement) {
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

      .status-value {
        text-transform: capitalize;
      }

      .lm {
        margin-left: 8px;
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
      buildId: { type: String },
      /**
       * A test details object.
       */
      buildDetail: { type: Object },
      /**
       * The test data returned from the API. It is passed to the indexeddb storage
       * for processing
       */
      _liveBuildDetail: { type: Object },
    };
  }

  get isFinished() {
    const { buildDetail } = this;
    return buildDetail.status === 'finished';
  }

  get isQueued() {
    const { buildDetail } = this;
    return buildDetail.status === 'queued';
  }

  get isRunning() {
    const { buildDetail } = this;
    return buildDetail.status === 'running';
  }

  get buildKey() {
    const { buildId } = this;
    return `builds/${buildId}`;
  }

  get renderRestart() {
    const { loggedIn, isFinished } = this;
    return !!loggedIn && isFinished;
  }

  get breadcrumbs() {
    const { buildId } = this;
    if (!buildId) {
      return null;
    }
    return [
      {
        label: 'Builds',
        href: '/builds',
        current: false,
      },
      {
        label: buildId,
        href: `/tests/${buildId}`,
        current: true,
      },
    ];
  }

  constructor() {
    super();
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
    await this.loadBuild();
    await this._initUser();
  }

  async _initUser() {
    const { userStatus } = this;
    if (!userStatus) {
      return;
    }
    if (!userStatus.loggedIn) {
      this.loading = true;
      try {
        await userStatus.getUser();
      } catch (e) {
        // ...
      }
      this.loading = false;
    }
    if (!userStatus.loggedIn) {
      return;
    }
    this.loggedIn = true;
  }

  async loadBuild() {
    const { apiBase, buildId, apiToken } = this;
    const url = `${apiBase}builds/${buildId}`;
    const init = {
      credentials: 'include'
    };
    if (apiToken) {
      init.headers = [['authorization', `Bearer ${apiToken}`]];
    }
    this.loading = true;
    let response;
    try {
      response = await fetch(url, init);
    } catch (e) {
      return;
    }
    const success = response.ok;
    const data = await response.json();
    this.loading = false;
    if (!success) {
      this.lastError = data.message;
      return;
    }
    this._liveBuildDetail = data;
  }

  /**
   * Handler for `app-indexeddb-mirror` data read event for test details
   * @param {CustomEvent} e
   */
  async _persistentBuildHandler(e) {
    const { value } = e.detail;
    await this.updateComplete;
    this.buildDetail = value;
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
    this.buildDetail = null;
    this._buildDetail = null;
    await this.loadBuild();
  }

  _restartHandler() {
    this.restartTest();
  }

  /**
   * Makes call to the API to restart the test.
   * The test cannot be restarted by unknown user or when thhe test is running.
   * @return {Promise}
   */
  async restartTest() {
    const { loggedIn, isFinished, apiBase, buildId, apiToken } = this;
    if ((!loggedIn && !apiToken) || !isFinished) {
      return;
    }
    const init = {
      method: 'PUT',
      credentials: 'include'
    };
    if (apiToken) {
      init.headers = [['authorization', `Bearer ${apiToken}`]];
    }
    this.loading = true;
    const url = `${apiBase}builds/${buildId}/restart`;
    const response = await fetch(url, init);
    if (response.status === 204) {
      this.refresh();
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
    const {
      lastError,
      loading,
      buildDetail,
      _liveBuildDetail,
      buildKey,
    } = this;
    return html`
    ${breadcrumbsGenerator(this.breadcrumbs)}
    ${lastError ? html`<app-message
      type="error"
      @close="${this.closeError}"
    >${lastError}</app-message>` : ''}

    <div class="page-header">
      <a href="/builds">
        <anypoint-icon-button
          title="Back to builds list page"
          aria-label="Activate to go back to builds list"
        >
          <span class="icon">${arrowBack}</span>
        </anypoint-icon-button>
      </a>
      <h2 class="title">Build details</h2>
      <anypoint-icon-button
        title="Refresh the list"
        aria-label="Activate to refresh the list"
        @click="${this._refreshHandler}"
      >
        <span class="icon">${refresh}</span>
      </anypoint-icon-button>
    </div>
    ${loading ? html`<progress></progress>` : ''}
    ${buildDetail ? this._buildDetailTemplate() : ''}

    <app-indexeddb-mirror
      .key="${buildKey}"
      .data="${_liveBuildDetail}"
      @persisted-data-changed="${this._persistentBuildHandler}">
    </app-indexeddb-mirror>
    `;
  }

  _buildDetailTemplate() {
    const { buildDetail, isFinished, isRunning, isQueued } = this;
    const classes = { failed: buildDetail.error, running: isRunning, queued: isQueued, finished: isFinished };
    return html`
    <section
      class=${classMap(classes)}
    >
      <h3>${buildDetail.component}</h3>
      <div class="desc">
        Status: <span class="status-value">${buildDetail.status}</span>
        ${isFinished ? html`<relative-time datetime="${computeIsoDate(buildDetail.endTime)}" class="lm"></relative-time>` : ''}
      </div>
      <div class="desc">
        Scheduled: <relative-time datetime="${computeIsoDate(buildDetail.created)}" class="lm"></relative-time>
      </div>
      <div class="desc">
        Type: ${buildDetail.type}
      </div>
      <div class="desc status">
        Target: ${buildDetail.branch}
      </div>

      ${buildDetail.error ? html`<app-message
        type="error"
        persistant
      >${buildDetail.message}</app-message>` : ''}
    </section>
    `;
  }
}
