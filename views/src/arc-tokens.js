import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-toast/paper-toast.js';
import './tokens-data-factory.js';

class ArcTokens extends PolymerElement {
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
      </style>
      <tokens-data-factory api-base="[[apiBase]]" list="{{tokens}}" has-more="{{hasMore}}" loading="{{Loading}}"></tokens-data-factory>
      <header>
        <a href="#/">
          <paper-icon-button icon="apic:arrow-back" title="Return to tests list"></paper-icon-button>
        </a>
        <h1>Access tokens</h1>
      </header>
      
    `;
  }

  static get properties() {
    return {
      /**
       * API base URI.
       */
      apiBase: String,
      tokens: Array,
      hasMore: Boolean,
      Loading: {type: Boolean, notify: true}
    };
  }
}
window.customElements.define('arc-tokens', ArcTokens);
