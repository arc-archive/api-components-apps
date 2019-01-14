import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import 'time-elements/dist/time-elements.js';
import '@polymer/paper-styles/typography.js';
import '@polymer/paper-styles/shadow.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';

class TestListItem extends PolymerElement {
  static get template() {
    return html`
      <style>
      :host {
        display: block;
        @apply --paper-font-body1;
      }

      .item-container {
        @apply --layout-horizontal;
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

      .item label {
        display: block;
        color: #757575;
        @apply --paper-font-caption;
      }

      .item > div {
        display: block;
      }

      .ration-counter,
      .failed-counter,
      .size-counter,
      .passed-counter {
        font-size: 18px;
      }

      .passed-counter {
        color: #2E7D32;
      }

      :host([failed]) .failed-counter {
        color: #F44336;
      }

      .source-commit {
        color: #9E9E9E;
        font-size: 12px;
        @apply --paper-font-common-nowrap;
      }

      .component {
        @apply --paper-font-common-nowrap;
      }
      </style>
      <div class="item-container">
        <div class="item">
          <template is="dom-if" if="[[!item.isFinished]]">
            <label>Scheduled:</label>
            <relative-time datetime$="[[computeIsoDate(item.startTime)]]"></relative-time>
          </template>
          <template is="dom-if" if="[[item.isFinished]]">
            <label>Ended:</label>
            <relative-time datetime$="[[computeIsoDate(item.endTime)]]"></relative-time>
          </template>
        </div>

        <div class="item">
          <label>Status:</label>
          <span class="test-status">[[item.status]]</span>
        </div>

        <div class="item">
          <label>Passed:</label>
          <span class="passed-counter">[[_computePassed(item.*)]]</span>
        </div>

        <div class="item">
          <label>Failed:</label>
          <span class="failed-counter">[[_computeFailed(item.*)]]</span>
        </div>

        <div class="item">
          <label>Tested:</label>
          <span class="size-counter">[[_computeSize(item.*)]]</span>
        </div>

        <div class="item">
          <label>Ratio:</label>
          <span class="ration-counter">[[_computePassRatio(item.*)]]</span>
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
    `;
  }

  static get properties() {
    return {
      item: String,
      isAmfBuild: {type: Boolean, computed: '_computeIsAmfBuid(item.type)'},
      isFinished: {type: Boolean, value: false, computed: '_computeIsFinished(item.status)'},
      failed: {type: Boolean, value: false, reflectToAttribute: true, computed: '_computeIsFailed(item)'}
    };
  }

  _computeIsAmfBuid(type) {
    return type === 'amf-build';
  }

  _computeIsFinished(status) {
    return status === 'finished';
  }

  _computeIsFailed(item) {
    if (!item) {
      return false;
    }
    if (item.status !== 'finished') {
      return false;
    }
    if (item.failed && item.failed > 0) {
      return true;
    }
    return false;
  }

  computeIsoDate(time) {
    if (!time || isNaN(time)) {
      return;
    }
    const d = new Date(Number(time));
    return d.toISOString();
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
