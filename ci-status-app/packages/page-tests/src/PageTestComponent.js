import { html, css, LitElement } from 'lit-element';
import '@anypoint-web-components/anypoint-button/anypoint-button.js';
import '@anypoint-web-components/anypoint-item/anypoint-item.js';
import '@anypoint-web-components/anypoint-item/anypoint-item-body.js';
import '@github/time-elements/dist/time-elements.js';
import '../../apic-ci-status/app-message.js';
// import { classMap } from 'lit-html/directives/class-map.js';
import { routerLinkMixin } from 'lit-element-router/router-mixin/router-mixin.js';
import { baseStyles, headersStyles, progressCss } from '../../common-styles.js';
// import { computeIsoDate } from '../../utils.js';
import { refresh, arrowBack, deleteIcon } from '../../Icons.js';
/**
 * A screen page that lists tokens.
 */
export class PageTestComponent extends routerLinkMixin(LitElement) {
  static get styles() {
    return [
      baseStyles,
      headersStyles,
      progressCss,
      css`
      :host {
        display: block;
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
      testDetail: { type: Object }
    };
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
    const url = `${apiBase}tests/${testId}components/${componentId}`;
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
    this.testDetail = data;
  }

  async loadLogs() {
    const { apiBase, testId, componentId } = this;
    const url = `${apiBase}tests/${testId}components/${componentId}/logs`;
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
    this.logs = data.items;
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
}
