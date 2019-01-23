import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import 'time-elements/dist/time-elements.js';
import '@polymer/paper-styles/typography.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';

class TokenListItem extends PolymerElement {
  static get template() {
    return html`
      <style>
      :host {
        display: block;
        padding: 4px 8px;
        @apply --paper-font-body1;
      }

      :host([expired]),
      :host([revoked]) {
        color: #9E9E9E;
      }

      .details {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .description {
        @apply --layout-flex;
      }

      .value {
        display: block;
      }

      .toggle-button {
        outline: none;
        color: rgba(0, 0, 0, 0.74);
        transition: color 0.25s ease-in-out, transform 0.24s ease-in-out;
        transform: rotateZ(0deg);
      }

      .toggle-button:hover {
        color: rgba(0, 0, 0, 0.88);
      }

      .toggle-button[opened] {
        transform: rotateZ(-180deg);
      }

      .token-value {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .token-render {
        @apply --layout-flex;
        word-break: break-all;
        margin: 0 8px;
      }

      @media (max-width: 420px) {
        .value {
          font-size: 16px;
          margin-bottom: 0.7em;
        }
      }
      </style>
      <div class="details">
        <div class="description">
          <template is="dom-if" if="[[token.name]]">
            <span class="value"><b>[[token.name]]</b></span>
          </template>
          <span class="value">Added: <relative-time datetime$="[[computeIsoDate(token.created)]]"></relative-time></span>
          <template is="dom-if" if="[[!revoked]]">
            <template is="dom-if" if="[[token.expires]]">
              <span class="value">[[_computeExpiresLabel(expired)]]: <relative-time datetime$="[[computeIsoDate(token.expires)]]"></relative-time></span>
            </template>
            <template is="dom-if" if="[[!token.expires]]">
              <span class="value">Never expires</span>
            </template>
          </template>
          <template is="dom-if" if="[[revoked]]">
            <span class="value">Token has been revoked</span>
          </template>
        </div>
        <slot name="actions"></slot>
        <paper-icon-button icon="apic:details" on-click="toggleDetails" title="Toggle token details" class="toggle-button" opened$="[[detailsOpened]]"></paper-icon-button>
      </div>
      <template is="dom-if" if="[[detailsOpened]]" restamp>
        <div class="hidden-info">
          <span class="value">Scopes: [[computeScopes(token.scopes)]]</span>
          <div class="token-value">
            <label>Token:</label>
            <span class="token-render">[[token.token]]</span>
            <paper-icon-button icon="apic:content-copy" on-click="_copy" title="Copy to clipboard"></paper-icon-button>
          </div>
        </div>
      </template>
    `;
  }

  static get properties() {
    return {
      token: Object,
      expired: {
        type: Boolean,
        value: false,
        computed: '_computeExpired(token.expired)',
        reflectToAttribute: true
      },
      revoked: {
        type: Boolean,
        value: false,
        computed: '_computeRevoked(token.revoked)',
        reflectToAttribute: true
      },
      detailsOpened: Boolean
    };
  }

  _computeExpired(expired) {
    return !!expired;
  }

  _computeRevoked(revoked) {
    return !!revoked;
  }

  computeIsoDate(time) {
    if (!time || isNaN(time)) {
      return;
    }
    const d = new Date(Number(time));
    return d.toISOString();
  }

  toggleDetails() {
    this.detailsOpened = !this.detailsOpened;
  }

  _computeExpiresLabel(expired) {
    return expired ? 'Expired' : 'Expires';
  }

  computeScopes(scopes) {
    if (!scopes) {
      return '';
    }
    return scopes.join(', ');
  }

  _copy() {
    const range = document.createRange();
    range.selectNode(this.shadowRoot.querySelector('.token-render'));
    window.getSelection().addRange(range);
    try {
      document.execCommand('copy');
    } catch (_) {
      // Copy command is not available
    }
    window.getSelection().removeAllRanges();
  }
}

window.customElements.define('token-list-item', TokenListItem);
