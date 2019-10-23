import { PolymerElement, html } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/iron-form/iron-form.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-toast/paper-toast.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-toggle-button/paper-toggle-button.js';
import './apic-icons.js';

class ArcAddToken extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
          position: relative;
          max-width: 1200px;
          margin: 24px auto;
        }

        header {
          @apply --layout-horizontal;
          @apply --layout-center;
        }

        h1 {
          @apply --paper-font-headline;
          @apply --layout-flex;
        }

        a {
          color: currentColor;
        }

        .error-toast {
          background-color: #ff5722;
          color: #fff;
        }

        .submit {
          background-color: var(--accent-color);
          color: var(--accent-text-color);
        }

        .scopes-selector,
        .time-selector {
          @apply --layout-vertical;
          margin: 12px 0;
        }

        .scopes-selector paper-checkbox {
          margin: 8px 0;
        }

        .time-settings-row {
          @apply --layout-horizontal;
        }

        @media (max-width: 1248px) {
          :host {
            margin: 0 24px 24px 24px;
          }
        }

        @media (max-width: 420px) {
          :host {
            margin: 0 12px 12px 12px;
          }
        }
      </style>
      <header>
        <a href="#/tokens">
          <paper-icon-button icon="apic:arrow-back" title="Return to tests list"></paper-icon-button>
        </a>
        <h1>Create API token</h1>
      </header>
      <iron-form
        on-iron-form-response="_handleResponse"
        on-iron-form-error="_handleError"
        on-iron-form-presubmit="_presubmitHandler"
        id="iform"
        with-credentials
      >
        <form id="form" method="POST" action="[[apiBase]]me/tokens" enctype="application/json">
          <paper-input label="Token name (optional)" name="name"></paper-input>

          <div class="scopes-selector">
            <label>Scopes</label>
            <paper-checkbox name="scopes" value="all" checked="{{allScopes}}">All</paper-checkbox>
            <paper-checkbox name="scopes" value="create-test" disabled="[[allScopes]]">create-test</paper-checkbox>
            <paper-checkbox name="scopes" value="delete-test" disabled="[[allScopes]]">delete-test</paper-checkbox>
            <paper-checkbox name="scopes" value="create-message" disabled="[[allScopes]]"
              >create-message</paper-checkbox
            >
            <paper-checkbox name="scopes" value="delete-message" disabled="[[allScopes]]"
              >delete-message</paper-checkbox
            >
            <paper-checkbox name="scopes" value="schedule-component-build" disabled="[[allScopes]]"
              >schedule-component-build</paper-checkbox
            >
          </div>

          <div class="time-selector">
            <paper-toggle-button checked="{{expiresEnabled}}">Token expires</paper-toggle-button>
            <div class="time-settings-row">
              <paper-input
                label="Expires in"
                name="ei"
                type="number"
                value="1"
                required
                auto-validate
                disabled="[[!expiresEnabled]]"
              ></paper-input>
              <paper-dropdown-menu label="Time unit" name="tu" required disabled="[[!expiresEnabled]]">
                <paper-listbox slot="dropdown-content" selected="0">
                  <paper-item role="option" label="y">years</paper-item>
                  <paper-item role="option" label="M">months</paper-item>
                  <paper-item role="option" label="d">days</paper-item>
                  <paper-item role="option" label="h">hours</paper-item>
                  <paper-item role="option" label="m">minutes</paper-item>
                </paper-listbox>
              </paper-dropdown-menu>
            </div>
          </div>
          <paper-button class="submit" on-click="submit" raised>Add token</paper-button>
        </form>
      </iron-form>
      <paper-toast class="error-toast" id="err" duration="7000"></paper-toast>
    `;
  }

  static get properties() {
    return {
      /**
       * API base URI.
       */
      apiBase: String,
      expiresEnabled: Boolean,
      allScopes: Boolean,
      apiToken: String
    };
  }

  _computeIsBottomUp(selectedType) {
    return selectedType === 1;
  }

  submit() {
    if (this.$.iform.validate()) {
      this.loading = true;
      this.$.iform.submit();
    }
  }

  _handleError(e) {
    this.loading = false;
    const message = e.detail.error.message.split('\n')[0];
    this._renderError(message);
  }

  _renderError(message) {
    this.$.err.text = message;
    this.$.err.opened = true;
  }

  _handleResponse(e) {
    const { id } = e.detail.response;
    if (!id) {
      this._renderError('Something went wrong. Unexpected response.');
      return;
    }
    this.loading = false;
    this.$.form.reset();
    this.dispatchEvent(
      new CustomEvent('navigate', {
        composed: true,
        bubbles: true,
        detail: {
          path: '/tokens'
        }
      })
    );
    this.dispatchEvent(
      new CustomEvent('data-model-refresh-tokens', {
        composed: true,
        bubbles: true
      })
    );
  }

  _presubmitHandler(e) {
    const body = e.target.request.body;
    if (!body.scopes) {
      this._renderError('Scope is required');
      return;
    }
    if (typeof body.scopes === 'string') {
      body.scopes = [body.scopes];
    }
    if (this.expiresEnabled) {
      body.expiresIn = body.ei + body.tu;
      delete body.ei;
      delete body.tu;
    }

    if (this.apiToken) {
      e.target.request.headers.authorization = 'bearer ' + this.apiToken;
    }
  }
}
window.customElements.define('arc-add-token', ArcAddToken);
