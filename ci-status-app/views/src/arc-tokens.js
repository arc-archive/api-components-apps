import { PolymerElement, html } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-toast/paper-toast.js';
import 'time-elements/dist/time-elements.js';
import './tokens-data-factory.js';
import './list-items/token-list-item.js';

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
          background-color: #ff5722;
          color: #fff;
        }

        .add-button {
          background-color: var(--accent-color);
          color: var(--accent-text-color);
        }

        .token-details {
          @apply --layout-horizontal;
          @apply --layout-center;
        }

        .token-value {
          color: rgba(0, 0, 0, 0.72);
          text-overflow: ellipsis;
          overflow: hidden;
          @apply --layout-flex;
        }

        #copy {
          display: inline-block;
          width: 0;
          height: 0;
          border: none;
          overflow: hidden;
        }

        #copy[copying] {
          display: inline;
        }

        .li {
          border: 1px #e0e0e0 solid;
          border-radius: 3px;
          margin: 8px 0;
          border-left: 2px #2e7d32 solid;
        }

        .li[expired],
        .li[revoked] {
          border-left: 2px #9e9e9e solid;
        }

        .error-toast {
          background-color: #ff5722;
          color: #fff;
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
      <tokens-data-factory
        id="request"
        api-base="[[apiBase]]"
        list="{{tokens}}"
        has-more="{{hasMore}}"
        loading="{{loading}}"
        api-token="[[apiToken]]"
      ></tokens-data-factory>
      <header>
        <a href="#/">
          <paper-icon-button icon="apic:arrow-back" title="Return to tests list"></paper-icon-button>
        </a>
        <h1>Access tokens</h1>
        <paper-icon-button icon="apic:refresh" title="Refresh the view" on-click="refresh"></paper-icon-button>
        <paper-button class="add-button" on-click="_newTokenHandler">New token</paper-button>
      </header>

      <template is="dom-if" if="[[hasTokens]]">
        <template is="dom-repeat" items="[[tokens]]">
          <token-list-item class="li" token="[[item]]">
            <template is="dom-if" if="[[_computeCanRevoke(item.expired, item.revoked)]]">
              <paper-button class="delete-button" slot="actions" on-click="_revokeTokenHandler">Revoke</paper-button>
            </template>
          </token-list-item>
        </template>
      </template>

      <template is="dom-if" if="[[!hasTokens]]">
        <p>You do not have generated API tokens</p>
      </template>

      <paper-toast class="error-toast" id="err" duration="7000"></paper-toast>
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
      loading: { type: Boolean, notify: true },
      apiToken: String,
      hasTokens: {
        type: Boolean,
        computed: '_computeHasTokens(tokens)'
      }
    };
  }

  _newTokenHandler() {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        composed: true,
        bubbles: true,
        detail: {
          path: '/add-token'
        }
      })
    );
  }

  refresh() {
    this.$.request.clean();
    this.$.request.loadNext();
  }

  _computeHasTokens(tokens) {
    return !!(tokens && tokens.length);
  }

  _revokeTokenHandler(e) {
    const id = e.model.get('item.id');
    const index = e.model.get('index');
    const init = {
      method: 'POST',
      credentials: 'include'
    };
    if (this.apiToken) {
      init.headers = [['authorization', 'bearer ' + this.apiToken]];
    }
    return fetch(this.apiBase + 'me/tokens/' + id + '/revoke', init)
      .then((response) => {
        if (response.status === 204) {
          this.set(`tokens.${index}.revoked`, true);
        } else {
          return response.json();
        }
      })
      .then((error) => {
        if (error) {
          this._renderError(error.message || 'Request to the API failed.');
        }
      })
      .catch((cause) => {
        this._renderError(cause.message || 'Unable to connect to the API.');
      });
  }

  _renderError(message) {
    this.$.err.text = message;
    this.$.err.opened = true;
  }

  _computeCanRevoke(expired, revoked) {
    return !expired && !revoked;
  }
}
window.customElements.define('arc-tokens', ArcTokens);
