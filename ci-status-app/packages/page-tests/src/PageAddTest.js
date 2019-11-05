import { html, css, LitElement } from 'lit-element';
import '@anypoint-web-components/anypoint-button/anypoint-button.js';
import '@anypoint-web-components/anypoint-checkbox/anypoint-checkbox.js';
import '@anypoint-web-components/anypoint-switch/anypoint-switch.js';
import '@anypoint-web-components/anypoint-dropdown-menu/anypoint-dropdown-menu.js';
import '@anypoint-web-components/anypoint-listbox/anypoint-listbox.js';
import '@anypoint-web-components/anypoint-item/anypoint-item.js';
import '../../apic-ci-status/app-message.js';
import { baseStyles, headersStyles, progressCss } from '../../common-styles.js';
import { arrowBack } from '../../Icons.js';
import unauthorizedView from '../../UnauthorizedToast.js';

const sourceComponentInputTemplate = () => html`<anypoint-input name="component" required autovalidate>
  <label slot="label">Source component</label>
</anypoint-input>`;
const sourceInputTemplate = () => html`<anypoint-input name="branch" required autovalidate>
  <label slot="label">Source branch</label>
</anypoint-input>`;
const commitInputTemplate = () => html`<anypoint-input name="commit">
  <label slot="label">Commit SHA (optional)</label>
</anypoint-input>`;
const includeDevInputTemplate = () => html`<div class="dev-option">
  <anypoint-checkbox name="includeDev">Inlcude dev dependencies</anypoint-checkbox>
</div>`;
const amfFormItems = () => {
  return html`
  ${sourceInputTemplate()}
  ${commitInputTemplate()}
  ${includeDevInputTemplate()}
  `;
}
const bottomUpFormItems = () => {
  return html`
  ${sourceComponentInputTemplate()}
  ${sourceInputTemplate()}
  ${commitInputTemplate()}
  ${includeDevInputTemplate()}
  `;
}
/**
 * A screen page that lists tokens.
 */
export class PageAddTest extends LitElement {
  static get styles() {
    return [
      baseStyles,
      headersStyles,
      progressCss,
      css`
      :host {
        display: block;
      }

      anypoint-checkbox {
        display: block;
      }

      anypoint-input {
        width: auto;
      }

      .action-button {
        margin-top: 20px;
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
       * True when the user is logged in
       */
      loggedIn: { type: Boolean },
      /**
       * Last error mesage to render to the user.
       */
      lastError: { type: String },
      /**
       * Selected test type.
       * It corresponds to the item index in the type dropdown
       */
      type: { type: Number },
      /**
       * Ignores rendering success message when set.
       */
      ignoreSuccessInfo: { type: Boolean },
    };
  }


  get formAction() {
    const { apiBase } = this;
    return `${apiBase}tests`;
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

  _typeHandler(e) {
    this.type = e.detail.value;
  }

  _scheduleHandler() {
    const form = this.shadowRoot.querySelector('form');
    const button = document.createElement('button');
    button.type = 'submit';
    form.appendChild(button);
    button.click();
    form.removeChild(button);
  }

  _formSubmitHandler(e) {
    e.preventDefault();
    const valid = this.validate();
    if (!valid) {
      return;
    }
    const values = this.serializeForm();
    this.scheduleTest(values);
  }

  validate() {
    if (Number.isNaN(this.type)) {
      return false;
    }
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
      const { name, checked, disabled } = node;
      let { value } = node;
      if (checked === false || disabled || value === undefined) {
        return;
      }
      if (name === 'type') {
        value = node.selectedItem.getAttribute('value');
      }
      if (name === 'includeDev') {
        value = value === 'on';
      }
      values[name] = value;
    });
    return values;
  }

  async scheduleTest(body) {
    this.ignoreSuccessInfo = false;
    this.testInfo = null;

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
    this.testInfo = data;
  }

  render() {
    const { loggedIn, lastError } = this;
    return html`
    ${lastError ? html`<app-message
      type="error"
      @close="${this.closeError}"
    >${lastError}</app-message>` : ''}
    ${!loggedIn ? unauthorizedView : this._addPageTemplate()}
    `;
  }

  _addPageTemplate() {
    const { testInfo } = this;
    return html`
    <div class="page-header">
      <a href="/tests">
        <anypoint-icon-button
          title="Back to tests list page"
          aria-label="Activate to go back to tests list"
        >
          <span class="icon">${arrowBack}</span>
        </anypoint-icon-button>
      </a>
      <h3 class="title">Schedule a test</h3>
    </div>

    ${testInfo ? this._testInfoTemplate(testInfo) : this._formTemplate()}
    `;
  }

  _formTemplate() {
    const {
      formAction,
      loading,
      type
    } = this;
    const noType = type === undefined;
    return html`
    <form
      method="POST"
      action="${formAction}"
      enctype="application/json"
      @submit="${this._formSubmitHandler}"
    >
      ${this._typeSelectorTemplate()}
      ${this._typeFormItems()}
      <div class="action-button">
        <anypoint-button
          emphasis="high"
          @click="${this._scheduleHandler}"
          ?disabled="${loading || noType}"
        >Schedule</anypoint-button>
        </div>
    </form>
    `;
  }

  _typeSelectorTemplate() {
    const {
      selectedType
    } = this;
    return html`
    <anypoint-dropdown-menu
      name="type"
      required
    >
      <label slot="label">Test type</label>
      <anypoint-listbox
        slot="dropdown-content"
        .selected="${selectedType}"
        @selected-changed="${this._typeHandler}"
      >
        <anypoint-item value="amf-build">AMF build</anypoint-item>
        <anypoint-item value="bottom-up">Bottom-up</anypoint-item>
      </anypoint-listbox>
    </anypoint-dropdown-menu>`;
  }

  _typeFormItems() {
    const { type } = this;
    switch (type) {
      case 0: return amfFormItems();
      case 1: return bottomUpFormItems();
      default: return '';
    }
  }

  _testInfoTemplate(info) {
    const { ignoreSuccessInfo } = this;
    return html`
    ${ignoreSuccessInfo ? '' : html`<app-message
      type="success"
      @close="${this._closeSuccessInfo}"
    >The test has been schedulted</app-message>`}
    <a href="/tests/${info.id}">
      <anypoint-button>Test details</anypoint-button>
    </a>
    `;
  }
}
