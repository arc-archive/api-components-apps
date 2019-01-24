import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import 'time-elements/dist/time-elements.js';
import '@polymer/paper-styles/typography.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';

class TestListItem extends PolymerElement {
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
        width: 30%;
      }

      .item.max {
        @apply --layout-flex;
      }

      .item label {
        display: block;
        color: #757575;
        @apply --paper-font-caption;
      }

      .item > div {
        display: block;
      }

      .result-status {
        color: #2E7D32;
      }

      :host([failed]) .result-status {
        color: #F44336;
      }

      .test-status {
        text-transform: capitalize;
      }

      .source-commit {
        color: #9E9E9E;
        font-size: 12px;
        max-width: 120px;
        @apply --paper-font-common-nowrap;
      }

      .component {
        width: 120px;
        @apply --paper-font-common-nowrap;
      }

      a {
        color: currentColor;
      }

      .time-item {
        width: 120px;
        @apply --paper-font-common-nowrap;
      }

      @media (max-width: 760px) {
        .item {
          @apply --layout-vertical;
          margin: 4px 0;
          width: 100%;
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

        .item.max {
          @apply --layout-flex-none;
        }
      }
      </style>
      <div class="item-container">
        <div class="data-container">
          <div class="item time-item">
            <label>[[_computeTimeLabel(item)]]:</label>
            <relative-time datetime$="[[_computeTimeValue(item)]]"></relative-time>
          </div>

          <div class="item">
            <label>Status:</label>
            <span class="test-status">[[item.status]]</span>
          </div>

          <div class="item">
            <label>Result:</label>
            <span class="result-status">[[resultLabel]]</span>
          </div>

          <div class="item max">
            <label>Branch:</label>
            <span class="source-branch">[[item.branch]]</span>
            <template is="dom-if" if="[[item.commit]]">
              <span class="source-commit" title="Commit SHA">[[item.commit]]</span>
            </template>
          </div>
          <template is="dom-if" if="[[item.component]]">
            <div class="item max">
              <label>Component:</label>
              <span class="component">[[item.component]]</span>
            </div>
          </template>
        </div>

        <a href="#/test-details/[[item.id]]">
          <paper-button>Details</paper-button>
        </a>
      </div>
    `;
  }

  static get properties() {
    return {
      item: Object,
      isAmfBuild: {type: Boolean, computed: '_computeIsAmfBuid(item.type)'},
      isFinished: {type: Boolean, value: false, computed: '_computeIsFinished(item.status)'},
      failed: {type: Boolean, value: false, reflectToAttribute: true, computed: '_computeIsFailed(item)'},
      queued: {type: Boolean, reflectToAttribute: true, computed: '_computeIsQueued(item.status)'},
      running: {type: Boolean, reflectToAttribute: true, computed: '_computeRunning(item.status)'},
      resultLabel: {
        type: String,
        computed: '_computeResultLabel(isFinished, failed)'
      }
    };
  }

  _computeTimeLabel(item) {
    if (!item) {
      return '';
    }
    switch (item.status) {
      case 'queued': return 'Scheduled';
      case 'running': return 'Started';
      case 'finished': return 'Ended';
      default: return '';
    }
  }

  _computeTimeValue(item) {
    if (!item) {
      return;
    }
    let time;
    switch (item.status) {
      case 'queued': time = item.created; break;
      case 'running': time = item.startTime; break;
      case 'finished': time = item.endTime; break;
    }
    if (!time || isNaN(time)) {
      return;
    }
    const d = new Date(Number(time));
    return d.toISOString();
  }

  _computeResultLabel(finished, failed) {
    if (!finished) {
      return 'n/a';
    }
    return failed ? 'Failed' : 'Success';
  }

  _computeRunning() {
    return status === 'running';
  }

  _computeIsAmfBuid(type) {
    return type === 'amf-build';
  }

  _computeIsFinished(status) {
    return status === 'finished';
  }

  _computeIsQueued(status) {
    return status === 'queued';
  }

  _computeIsFailed(item) {
    if (!item) {
      return false;
    }
    if (item.status !== 'finished') {
      return false;
    }
    if (item.error) {
      return true;
    }
    if (item.failed && item.failed > 0) {
      return true;
    }
    return false;
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

  _computeSize(record) {
    const item = record && record.base;
    const size = (item && item.size) || 0;
    return size;
  }

  _computePassRatio(record) {
    const item = record && record.base;
    const passed = (item && item.passed) || 0;
    const size = (item && item.size) || 0;
    if (!passed || !size) {
      return 0;
    }
    return Math.round(passed/size * 100);
  }
}

window.customElements.define('test-list-item', TestListItem);
