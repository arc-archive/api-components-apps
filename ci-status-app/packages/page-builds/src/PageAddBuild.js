import { html, css, LitElement } from 'lit-element';
import '@anypoint-web-components/anypoint-button/anypoint-button.js';
import '@anypoint-web-components/anypoint-input/anypoint-input.js';
import '../../apic-ci-status/app-message.js';
import { baseStyles, headersStyles, breadcrumbsStyles } from '../../common-styles.js';
import { arrowBack } from '../../Icons.js';
import unauthorizedView from '../../UnauthorizedToast.js';
import { breadcrumbsGenerator } from '../../utils.js';

const breadcrumbs = [
  {
    label: 'Builds',
    href: '/builds',
    current: false,
  },
  {
    label: 'Add',
    href: '/builds/add',
    current: true,
  },
];
/**
 * A screen page that lists tokens.
 */
export class PageAddBuild extends LitElement {
  static get styles() {
    return [
      baseStyles,
      headersStyles,
      breadcrumbsStyles,
      css`
      :host {
        display: block;
      }

      anypoint-input {
        width: auto;
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
       * Ignores rendering success message when set.
       */
      ignoreSuccessInfo: { type: Boolean },
      /**
       * True when the build has been scheduled.
       */
      buidScheduled: { type: Boolean },
    };
  }

  get formAction() {
    const { apiBase } = this;
    return `${apiBase}github/manual/stage`;
  }

  get formControls() {
    const selector = 'form anypoint-input';
    return this.shadowRoot.querySelectorAll(selector);
  }

  connectedCallback() {
    super.connectedCallback();
    this._initialize();
  }

  /**
   * Removes `lastError` message.
   */
  closeError() {
    this.lastError = undefined;
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

  _scheduleHandler() {
    const valid = this.validate();
    if (!valid) {
      return;
    }
    const values = this.serializeForm();
    this.scheduleBuild(values);
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
      const { name, value } = node;
      if (value === undefined) {
        return;
      }
      values[name] = value;
    });
    return values;
  }

  async scheduleBuild(body) {
    this.ignoreSuccessInfo = false;
    this.buidScheduled = false;

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
    this.loading = false;
    if (response.status !== 201) {
      const data = await response.json();
      this.lastError = data.message;
      return;
    }
    this.buidScheduled = true;
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
    const { buidScheduled } = this;
    return html`
    <div class="page-header">
      <a href="/builds">
        <anypoint-icon-button
          title="Back to builds list page"
          aria-label="Activate to go back to builds list"
        >
          <span class="icon">${arrowBack}</span>
        </anypoint-icon-button>
      </a>
      <h2 class="title">Schedule a sage build</h2>
    </div>

    ${buidScheduled ? this._buildInfoTemplate() : this._formTemplate()}
    `;
  }

  _formTemplate() {
    const {
      formAction,
      loading,
    } = this;
    return html`
    <form
      method="POST"
      action="${formAction}"
      enctype="application/json"
      autocomplete="on"
    >
      <anypoint-input name="org" value="advanced-rest-client" autocomplete="on">
        <label slot="label">Organization</label>
      </anypoint-input>
      <anypoint-input name="component" value="" autocomplete="on">
        <label slot="label">Component name</label>
      </anypoint-input>
      <anypoint-input name="sshUrl" value="git@github.com:advanced-rest-client/COMPONENT.git" autocomplete="on">
        <label slot="label">SSH URL</label>
      </anypoint-input>
      <anypoint-input name="commit" value="" autocomplete="on">
        <label slot="label">Commit SHA (optional)</label>
      </anypoint-input>

      <div class="action-button">
        <anypoint-button
          emphasis="high"
          @click="${this._scheduleHandler}"
          ?disabled="${loading}"
        >Schedule</anypoint-button>
        </div>
    </form>
    `;
  }

  _buildInfoTemplate() {
    const { ignoreSuccessInfo } = this;
    return html`
    ${ignoreSuccessInfo ? '' : html`<app-message
      type="success"
      @close="${this._closeSuccessInfo}"
    >The build has been schedulted</app-message>`}
    <a href="/builds">
      <anypoint-button>Go back</anypoint-button>
    </a>
    `;
  }
}
