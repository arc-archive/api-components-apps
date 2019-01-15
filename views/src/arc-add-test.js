import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/iron-form/iron-form.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-toast/paper-toast.js';
import './tests-data-factory.js';
import './apic-icons.js';

class ArcAddTest extends PolymerElement {
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
        background-color: #FF5722;
        color: #fff;
      }

      .submit {
        background-color: var(--accent-color);
        color: var(--accent-text-color);
      }
      </style>
      <header>
        <a href="#/">
          <paper-icon-button icon="apic:arrow-back" title="Return to tests list"></paper-icon-button>
        </a>
        <h1>Schedule a test</h1>
      </header>
      <iron-form on-iron-form-response="_handleResponse" on-iron-form-error="_handleError" id="iform">
        <form id="form" method="POST" action="[[apiBase]]tests" enctype="application/json">
          <paper-dropdown-menu label="Test type" name="type" required>
            <paper-listbox slot="dropdown-content" selected="{{selectedType}}">
              <paper-item>amf-build</paper-item>
              <paper-item>bottom-up</paper-item>
            </paper-listbox>
          </paper-dropdown-menu>
          <template is="dom-if" if="[[isBottomUp]]">
            <paper-input label="Source component" name="component" disabled="[[!isBottomUp]]" required auto-validate></paper-input>
          </template>
          <paper-input label="Source branch" name="branch" required auto-validate></paper-input>
          <paper-input label="Commit sha (optional)" name="commit"></paper-input>
          <paper-button class="submit" on-click="submit" raised>Save</paper-button>
        </form>
      </iron-form>
      <tests-data-factory id="model" api-base="[[apiBase]]"></tests-data-factory>
      <paper-toast class="error-toast" id="err" duration="7000"></paper-toast>
    `;
  }

  static get properties() {
    return {
      /**
       * API base URI.
       */
      apiBase: String,
      selectedType: Number,
      isBottomUp: {
        type: Boolean,
        computed: '_computeIsBottomUp(selectedType)'
      }
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
    const {id} = e.detail.response;
    if (!id) {
      this._renderError('Something went wrong. Unexpected response.');
      return;
    }
    this.$.model.refreshTest(id);
    this.loading = false;
    this.$.form.reset();
    this.dispatchEvent(new CustomEvent('navigate', {
      composed: true,
      bubbles: true,
      detail: {
        path: '/status'
      }
    }));
  }
}
window.customElements.define('arc-add-test', ArcAddTest);
