import { html, css, LitElement } from 'lit-element';
import '@anypoint-web-components/anypoint-button/anypoint-button.js';
import '@anypoint-web-components/anypoint-input/anypoint-input.js';
import '@anypoint-web-components/anypoint-switch/anypoint-switch.js';
import '@anypoint-web-components/anypoint-dropdown-menu/anypoint-dropdown-menu.js';
import '@anypoint-web-components/anypoint-listbox/anypoint-listbox.js';
import '@anypoint-web-components/anypoint-item/anypoint-item.js';
import '@anypoint-web-components/anypoint-checkbox/anypoint-checkbox.js';
import '@anypoint-web-components/anypoint-button/anypoint-icon-button.js';
import { baseStyles, headersStyles, progressCss, breadcrumbsStyles } from '../../common-styles.js';
import unauthorizedView from '../../UnauthorizedToast.js';
import { arrowBack } from '../../Icons.js';
import { scopeToLabel, scopes, breadcrumbsGenerator } from '../../utils.js';
import '../../apic-ci-status/app-message.js';

const breadcrumbs = [
  {
    label: 'Tokens',
    href: '/tokens',
    current: false,
  },
  {
    label: 'Add',
    href: '/tokens/aff',
    current: true,
  },
];

/**
 * A screen page that lists tokens.
 */
export class PageAddToken extends LitElement {
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

      anypoint-checkbox {
        display: block;
      }

      .time-settings-row {
        display: flex;
        flex-direction: row;
        align-items: center;
      }

      :host([narrow]) .time-settings-row {
        display: block;
      }

      :host([narrow]) anypoint-input {
        width: auto;
      }

      .token-label {
        font-weight: 500;
        display: block;
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
       * An API token to be used to create / delete requests.
       */
      apiToken: { type: String },
      /**
       * Last error mesage to render to the user.
       */
      lastError: { type: String },
      /**
       * Special case when "all" scope is selected.
       * It disables other scopes.
       */
      allScopesSelected: { type: Boolean },
      /**
       * When set the token is set to expire.
       */
      expiresEnabled: { type: Boolean },
      /**
       * Ignores rendering success message when set.
       */
      ignoreSuccessInfo: { type: Boolean },
      /**
       * When true it renders mobile friendly view.
       */
      narrow: { type: Boolean, reflect: true },
    };
  }

  get formAction() {
    const { apiBase } = this;
    return `${apiBase}me/tokens`;
  }

  get formControls() {
    let selector = 'form anypoint-input,';
    selector += 'form anypoint-checkbox,';
    selector += 'form anypoint-dropdown-menu';
    return this.shadowRoot.querySelectorAll(selector);
  }

  connectedCallback() {
    super.connectedCallback();
    this._initialize();
  }

  closeError() {
    this.lastError = null;
  }

  _closeSuccessInfo() {
    this.ignoreSuccessInfo = true;
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
  }

  _scopeChangeHandler(e) {
    const { value, checked } = e.target;
    if (value === 'all') {
      this.allScopesSelected = checked;
    }
  }

  _tokenExpiresHandler(e) {
    const { checked } = e.target;
    this.expiresEnabled = checked;
  }

  _addHandler() {
    const valid = this.validate();
    if (!valid) {
      return;
    }
    const values = this.serializeForm();
    this.createToken(values);
  }

  validate() {
    const { formControls } = this;
    const invalid = Array.from(formControls).some((node) => {
      return !node.validate();
    });
    return !invalid;
  }

  serializeForm() {
    const { formControls } = this;
    const values = {};
    Array.from(formControls).forEach((node) => {
      const { name, checked, disabled, type } = node;
      if (checked === false || disabled) {
        return;
      }
      let { value } = node;
      if (name === 'scopes') {
        if (!values[name]) {
          values[name] = [];
        }
        values[name].push(value);
      } else if (value) {
        if (type === 'number') {
          value = Number(value);
        }
        values[name] = value;
      }
      // console.log(name, value, checked);
    });
    if (this.expiresEnabled) {
      values.expiresIn = values.ei + values.tu;
      delete values.ei;
      delete values.tu;
    }
    return values;
  }

  async createToken(body) {
    this.ignoreSuccessInfo = false;
    this.tokenInfo = null;
    const form = this.shadowRoot.querySelector('form');
    const url = form.action;
    const init = {
      credentials: 'include',
      headers: [['content-type', 'application/json']],
      body: JSON.stringify(body),
      method: 'POST'
    };
    this.loading = true;
    const response = await fetch(url, init);
    const data = await response.json();
    this.loading = false;
    if (data.error) {
      this.lastError = data.message;
      return;
    }
    this.tokenInfo = data;
  }

  render() {
    const { loggedIn, lastError } = this;
    return html`
    ${breadcrumbsGenerator(breadcrumbs)}
    ${lastError ? html`<app-message
      type="error"
      @close="${this.closeError}"
    >${lastError}</app-message>` : ''}
    ${!loggedIn ? unauthorizedView : this._addPageTemplate()}
    `;
  }

  _addPageTemplate() {
    const { tokenInfo } = this;
    return html`
    <div class="page-header">
      <a href="/tokens">
        <anypoint-icon-button
          title="Back to tokens list page"
          aria-label="Activate to go back to tokens list"
        >
          <span class="icon">${arrowBack}</span>
        </anypoint-icon-button>
      </a>
      <h2 class="title">Create API token</h2>
    </div>

    ${tokenInfo ? this._tokenInfoTemplate(tokenInfo) : this._formTemplate()}
    `;
  }

  _formTemplate() {
    const {
      formAction,
      allScopesSelected,
      loading
    } = this;
    return html`
    <form
      method="POST"
      action="${formAction}"
      enctype="application/json"
    >
      <anypoint-input name="name">
        <label slot="label">Toke name (optional)</label>
      </anypoint-input>
      <div class="scopes-selector">
        <label id="scopes-tabel">Scopes</label>
        ${scopes.map((scope) => this._scopeTemplate(scope, allScopesSelected))}
      </div>
      ${this._expirationTemplate()}
      <anypoint-button
        emphasis="high"
        @click="${this._addHandler}"
        ?disabled="${loading}"
      >Add token</anypoint-button>
    </form>
    `;
  }

  _scopeTemplate(scope, allScopesSelected) {
    const disabled = !!(scope !== 'all' && allScopesSelected);
    return html`<anypoint-checkbox
      name="scopes"
      value="${scope}"
      ?disabled="${disabled}"
      @change="${this._scopeChangeHandler}"
    >${scopeToLabel(scope)}</anypoint-checkbox>`;
  }

  _expirationTemplate() {
    const {
      expiresEnabled
    } = this;
    return html`
    <anypoint-switch
      name="tokenExpires"
      .checked="${expiresEnabled}"
      @change="${this._tokenExpiresHandler}"
      title="Token has an expiration date (recommended)"
    >Token expires</anypoint-switch>
    <div class="time-settings-row">
      <anypoint-input
        name="ei"
        type="number"
        value="1"
        min="1"
        required
        autovalidate
        invalidmessage="Expiration value is required"
        ?disabled="${!expiresEnabled}"
      >
        <label slot="label">Expires in</label>
      </anypoint-input>
      <anypoint-dropdown-menu
        name="tu"
        required
        ?disabled="${!expiresEnabled}"
      >
        <label slot="label">Time unit</label>
        <anypoint-listbox slot="dropdown-content" selected="0">
          <anypoint-item value="y">years</anypoint-item>
          <anypoint-item value="M">months</anypoint-item>
          <anypoint-item value="d">days</anypoint-item>
          <anypoint-item value="h">hours</anypoint-item>
          <anypoint-item value="m">minutes</anypoint-item>
        </anypoint-listbox>
      </anypoint-dropdown-menu>
    </div>
    `;
  }

  _tokenInfoTemplate(tokenInfo) {
    const { ignoreSuccessInfo } = this;
    return html`
    ${ignoreSuccessInfo ? '' : html`<app-message
      type="success"
      @close="${this._closeSuccessInfo}"
    >The token has been created</app-message>`}

    <app-message
      type="info"
      persistant
    >
      <label class="token-label">API token</label>
      ${tokenInfo.token}
    </app-message>`;
  }
}
