import { PolymerElement, html } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-styles/typography.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '../apic-icons.js';
import '../component-logs-viewer.js';
class TestComponentListItem extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
          @apply --paper-font-body1;
        }

        .item-container,
        .data-container {
          @apply --layout-horizontal;
          @apply --layout-center;
        }

        .data-container {
          @apply --layout-flex;
        }

        .item:first-child {
          margin-left: 0;
        }

        .item:last-of-type {
          margin-right: 0;
        }

        .item {
          @apply --layout-vertical;
          padding: 4px 8px;
          margin: 4px 24px;
        }

        .item.max {
          @apply --layout-flex;
        }

        .item.numbers {
          width: 70px;
        }

        .item label {
          display: block;
          color: #757575;
          @apply --paper-font-caption;
        }

        .item > div {
          display: block;
        }

        .ratio-counter,
        .failed-counter,
        .passed-counter {
          font-size: 18px;
        }

        .passed-counter {
          color: #2e7d32;
        }

        :host([failed]) .failed-counter,
        .error {
          color: #f44336;
        }

        .component {
          @apply --paper-font-common-nowrap;
        }

        .cmp-message {
          margin: 1em 8px;
          font-size: 16px;
          color: #f44336;
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

        .viewer {
          margin: 0 8px;
        }

        .item.narrow {
          display: none;
        }

        @media (max-width: 760px) {
          .component {
            max-width: 180px;
          }

          .item {
            @apply --layout-vertical;
            margin: 4px 0;
          }

          .item.detail-result {
            display: none !important;
          }

          .item.narrow {
            @apply --layout-vertical;
          }

          .data-container {
            @apply --layout-vertical;
            @apply --layout-start;
            width: 100%;
          }
        }

        @media (max-width: 400px) {
          .component {
            max-width: 220px;
          }
        }
      </style>
      <div class="item-container">
        <div class="data-container">
          <div class="item max">
            <label>Component:</label>
            <span class="component">[[item.component]]</span>
          </div>

          <template is="dom-if" if="[[item.error]]">
            <div class="item numbers">
              <label>Result:</label>
              <span class="error">Test error</span>
            </div>
          </template>

          <template is="dom-if" if="[[!item.error]]">
            <div class="item narrow">
              <label>Result:</label>
              <span class="narrow-result">[[_computeResult(item.status)]]</span>
            </div>

            <div class="item numbers detail-result">
              <label>Passed:</label>
              <span class="passed-counter">[[_computePassed(item.*)]]</span>
            </div>

            <div class="item numbers detail-result">
              <label>Failed:</label>
              <span class="failed-counter">[[_computeFailed(item.*)]]</span>
            </div>

            <div class="item numbers detail-result">
              <label>Ratio:</label>
              <span class="ratio-counter">[[_computePassRatio(item.*)]]%</span>
            </div>
          </template>
        </div>

        <paper-icon-button
          icon="apic:details"
          on-click="toggleDetails"
          title="Toggle execution logs"
          class="toggle-button"
          opened$="[[detailsOpened]]"
        ></paper-icon-button>
      </div>
      <template is="dom-if" if="[[detailsOpened]]" restamp>
        <template is="dom-if" if="[[item.message]]">
          <p class="cmp-message">[[item.message]]</p>
        </template>
        <template is="dom-if" if="[[item.hasLogs]]">
          <component-logs-viewer
            test-id="[[testId]]"
            component-name="[[item.component]]"
            api-base="[[apiBase]]"
            class="viewer"
          ></component-logs-viewer>
        </template>
      </template>
    `;
  }

  static get properties() {
    return {
      item: String,
      failed: { type: Boolean, value: false, reflectToAttribute: true, computed: '_computeIsFailed(item)' },
      detailsOpened: Boolean,
      testId: String
    };
  }

  _computeIsFailed(item) {
    if (!item) {
      return false;
    }
    return item.status === 'failed';
  }

  _computePassed(record) {
    const item = record && record.base;
    const passed = item && item.passed;
    return passed || '0';
  }

  _computeFailed(record) {
    const item = record && record.base;
    const failed = item && item.failed;
    return failed || '0';
  }

  _computePassRatio(record) {
    const item = record && record.base;
    const passed = (item && item.passed) || 0;
    const failed = (item && item.failed) || 0;
    const size = passed + failed;
    if (!passed || !size) {
      return 0;
    }
    return Math.round((passed / size) * 100);
  }

  toggleDetails() {
    this.detailsOpened = !this.detailsOpened;
  }

  _computeResult(status) {
    switch (status) {
      case 'passed':
      case 'failed':
        return status;
      default:
        return 'Unknown';
    }
  }
}

window.customElements.define('test-component-list-item', TestComponentListItem);
