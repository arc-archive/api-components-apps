import { html, css, LitElement } from 'lit-element';
import '@anypoint-web-components/anypoint-button/anypoint-button.js';
import '@anypoint-web-components/anypoint-item/anypoint-item.js';
import '@anypoint-web-components/anypoint-item/anypoint-item-body.js';
import '@github/time-elements/dist/time-elements.js';
import '@anypoint-web-components/anypoint-button/anypoint-icon-button.js';
import { classMap } from 'lit-html/directives/class-map.js';
import { baseStyles, headersStyles, progressCss } from '../../common-styles.js';
import unauthorizedView from '../../UnauthorizedToast.js';
import { computeIsoDate, scopeToLabel } from '../../utils.js';
import { expandMore, refresh, add } from '../../Icons.js';
import '../../apic-ci-status/app-message.js';
/**
 * Computes label value for "expires" in the tokens list
 * @param {Boolean} expired Flag for token expired state.
 * @return {String} A label to render.
 */
export const expiredLabel = (expired) => expired ? 'Expired' : 'Expires';
/**
 * Creates a template for a token that did not expire.
 * @param {Object} token Token object.
 * @return {TemplateResult}
 */
export const expiresBody = (token) => {
  return html`
  <anypoint-item-body threeline>
    <div class="token-name">${token.name}</div>
    <div secondary>
      Added <relative-time datetime="${computeIsoDate(token.created)}"></relative-time>
    </div>
    <div secondary>
      ${expiredLabel(token.expired)}
      ${token.expires ? html`<relative-time datetime="${computeIsoDate(token.expires)}"></relative-time>` : 'Never expires'}
    </div>
  </anypoint-item-body>
  `;
}
/**
 * Creates a template for a token that expired.
 * @param {String} name Token name.
 * @param {Number} created Token created timestamp.
 * @return {TemplateResult}
 */
export const revokedBody = (name, created) => {
  return html`
  <anypoint-item-body threeline>
    <div class="token-name">${name}</div>
    <div secondary>
      Added <relative-time datetime="${computeIsoDate(created)}"></relative-time>
    </div>
    <div secondary>Token has been revoked</div>
  </anypoint-item-body>`;
}
/**
 * Creates a template for token details.
 * @param {Object} token Token object.
 * @return {TemplateResult}
 */
export const detailsTemplate = (token) => {
  const scopes = token.scopes || [];
  const classes = {'token-details': true, revoked: token.revoked};
  return html`<div
    class=${classMap(classes)}
  >
    <div class="scopes">
      <b>Scopes</b>
      <ul>
      ${scopes.map((scope) => html`<li>${scopeToLabel(scope)}</li>`)}
      </ul>
    </div>
    <div class="token-value">
      <b>Token</b>
      <pre>${token.token}</pre>
    </div>
  </div>`;
};
/**
 * A screen page that lists tokens.
 */
export class PageTokens extends LitElement {
  static get styles() {
    return [
      baseStyles,
      headersStyles,
      progressCss,
      css`
      :host {
        display: block;
      }

      anypoint-item,
      .token-details {
        padding-bottom: 12px;
        padding-top: 12px;
        border-bottom: 1px #e5e5e5 dashed;
      }

      anypoint-item.details {
        border-bottom: none;
        background-color: #E3F2FD;
      }

      anypoint-item.revoked {
        color: #9e9e9e;
        background-color: #FAFAFA;
      }

      [secondary],
      .token-details {
        font-size: 13px;
        color: #616161;
      }

      anypoint-item.revoked [secondary] {
        color: #9e9e9e;
      }

      .token-details {
        padding: 0px 12px;
        background-color: #E3F2FD;
      }

      .token-details.revoked {
        background-color: #FAFAFA;
      }

      .token-details pre {
        word-break: break-all;
        white-space: pre-wrap;
        line-height: 1em;
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
       * The list of registered user tokens.
       */
      tokens: { type: Array },
      /**
       * An API token to be used to create / delete requests.
       */
      apiToken: { type: String },
      /**
       * Last error mesage to render to the user.
       */
      lastError: { type: String },
    };
  }

  /**
   * @return {Boolean} True when `tokens` are set.
   */
  get hasTokens() {
    const { tokens } = this;
    return !!(tokens && tokens.length)
  }

  constructor() {
    super();
    this.loggedIn = false;
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
    await this.loadNextResults();
  }

  /**
   * Creates token list request URL that includes pagination parameters.
   * @return {String} Token request URL
   */
  getRequestUrl() {
    const { pageToken, apiBase } = this;
    let url = `${apiBase}me/tokens`;
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
    if (!response.ok) {
      this.loading = false;
      return;
    }
    const data = await response.json();
    const pageToken = data.nextPageToken;
    this.pageToken = pageToken;

    const { hasMore } = this;

    if (pageToken && !hasMore) {
      this.hasMore = true;
    } else if (!pageToken && hasMore) {
      this.hasMore = false;
    }
    let tokens = this.tokens || [];
    tokens = tokens.concat(data.items);
    this.tokens = tokens;
    this.loading = false;
    this.requestUpdate();
  }

  /**
   * Refreshes current list of tokens.
   * If `pageToken` and `tokens` are set then they are cleared.
   * @return {Promise}
   */
  async refresh() {
    this.pageToken = null;
    this.tokens = null;
    await this.loadNextResults();
  }

  /**
   * Removes `lastError` message.
   */
  closeError() {
    this.lastError = undefined;
  }

  /**
   * Click handle on the refresh list button.
   * @param {Event} e
   */
  _refreshHandler() {
    this.refresh();
  }

  /**
   * Click handlee on the revoke token button.
   * @param {Event} e
   */
  _revokeHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    const index = Number(e.currentTarget.dataset.index);
    const item = this.tokens[index];
    this.revokeToken(item.id);
  }

  /**
   * Makes a request to the API to revoke a token.
   * @param {String} id An id of the token to revoke.
   * @return {Promise}
   */
  async revokeToken(id) {
    const { apiToken, apiBase } = this;
    const init = {
      method: 'POST',
      credentials: 'include'
    };
    if (apiToken) {
      init.headers = [['authorization', `bearer ${apiToken}`]];
    }
    const url = `${apiBase}me/tokens/${id}/revoke`;
    const response = await fetch(url, init);
    if (response.status === 204) {
      this._setTokenRevoked(id);
      return;
    }
    const error = await response.json();
    this.lastError = error.message || 'Request to the API failed.';
  }

  /**
   * Updates token model to set revoked state.
   * @param {String} id Token ID
   */
  _setTokenRevoked(id) {
    const tokens = this.tokens || [];
    const index = tokens.findIndex((item) => item.id === id);
    if (index === -1) {
      return;
    }
    const item = tokens[index];
    item.revoked = true;
    this.requestUpdate();
  }

  /**
   * Toggles token details on the list for an item associated with
   * event target.
   * @param {Event} e An event calling the handler.
   */
  _toggleDetails(e) {
    e.preventDefault();
    e.stopPropagation();
    const index = Number(e.currentTarget.dataset.index);
    const opened = this.__detailsOpened || [];
    const arrIndex = opened.indexOf(index);
    if (arrIndex === -1) {
      opened.push(index);
    } else {
      opened.splice(arrIndex, 1);
    }
    this.__detailsOpened = opened;
    this.requestUpdate();
  }

  render() {
    const { loggedIn, lastError } = this;
    return html`
    ${lastError ? html`<app-message
      type="error"
      @close="${this.closeError}"
    >${lastError}</app-message>` : ''}
    ${!loggedIn ? unauthorizedView : this._tokensPage()}
    `;
  }

  _tokensPage() {
    const { loading, hasTokens } = this;
    return html`
    ${loading ? html`<progress></progress>` : ''}
    ${hasTokens ? this._tokensListTemplate() : this._noDataTemplate()}
    `;
  }

  _tokensListTemplate() {
    const { tokens } = this;
    return html`
    <div class="page-header">
      <h2 class="title">Your tokens</h2>
      <anypoint-icon-button
        title="Refresh the list"
        aria-label="Activate to refresh the list"
        @click="${this._refreshHandler}"
      >
        <span class="icon">${refresh}</span>
      </anypoint-icon-button>
      <a href="/tokens/add"><anypoint-icon-button
        title="Add a new token"
        aria-label="Activate to add a new token"
      >
        <span class="icon">${add}</span>
      </anypoint-icon-button></a>
    </div>
    ${tokens.map((item, index) => this._tokenItemTemplate(item, index))}
    `;
  }

  _tokenItemTemplate(token, index) {
    const { revoked } = token;
    const detailsOpened = this.__detailsOpened || [];
    const isOpened = detailsOpened.indexOf(index) !== -1;
    const classes = { details: isOpened, revoked };
    return html`
    <anypoint-item
      data-index="${index}"
      class=${classMap(classes)}
      @click="${this._toggleDetails}"
    >
      ${revoked ? revokedBody(token.name, token.created) : expiresBody(token)}
      ${revoked ? '' : this._revokeButtonTemplate(index)}
      <anypoint-icon-button
        data-index="${index}"
        @click="${this._toggleDetails}"
        title="Toggle token details"
        aria-label="Activate to toggle token details"
      >
        <span class="icon">${expandMore}</span>
      </anypoint-icon-button>
    </anypoint-item>
    ${isOpened ? detailsTemplate(token) : ''}
    `;
  }

  _revokeButtonTemplate(index) {
    return html`
    <anypoint-button
      emphasis="low"
      data-index="${index}"
      @click="${this._revokeHandler}"
      title="Revokes this token."
    >Revoke</anypoint-button>
    `;
  }


  _noDataTemplate() {
    return html`
      <p>There are no access tokens generated for this account.</p>
      <anypoint-button
        emphasis="high"
        @click="${this.add}"
      >Create a token</anypoint-button>
    `;
  }
}
