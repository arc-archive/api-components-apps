import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import {afterNextRender} from '@polymer/polymer/lib/utils/render-status.js';
import '@polymer/paper-styles/typography.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-toast/paper-toast.js';
import 'time-elements/dist/time-elements.js';
import './models/test-model.js';
import './test-components-data-factory.js';
import './list-items/test-component-list-item.js';
import './apic-icons.js';

class ArcTestDetails extends PolymerElement {
  static get template() {
    return html`
      <style>
      :host {
        display: block;
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

      .li {
        border: 1px #E0E0E0 solid;
        border-radius: 3px;
        margin: 8px 0;
      }

      .desc > span.passed-count,
      .desc > span.result-value[passing] {
        color: #2E7D32;
      }

      .desc > span.failed-count,
      .desc > span.result-value {
        color: #F44336;
      }

      .error-message {
        color: #F44336;
        margin: 24px 0;
        padding: 8px;
        background-color: #ECEFF1;
      }

      .result-value {
        margin-right: 8px;
      }

      .status-value {
        text-transform: capitalize;
      }

      .desc {
        color: #616161;
        font-size: 18px;
        line-height: 24px;
        letter-spacing: 0.011em;
      }

      .desc > span {
        color: #212121;
      }

      .queue-empty-state {
        @apply --layout-horizontal;
        @apply --layout-center;
        margin: 40px auto;
        max-width: 800px;
      }

      .circle {
        border-radius: 50%;
        border: solid 12px #E0E0E0;
        width: 80px;
        height: 80px;
        color: #9E9E9E;
        font-size: 16px;
        @apply --layout-vertical;
        @apply --layout-center-center;
      }

      .circle.ready {
        border-color: #2196f3;
        color: #212121;
      }

      .graph-line {
        flex: 1;
        height: 4px;
        border: 4px #E0E0E0 solid;
        margin: 0 24px;
      }

      a {
        color: currentColor;
      }

      .delete-test {
        background-color: var(--accent-color);
        color: var(--accent-text-color);
      }

      .test-actions {
        margin: 24px 0;
      }

      .error-toast {
        background-color: #FF5722;
        color: #fff;
      }

      .reset-test-container {
        margin: 12px 0;
      }

      .restart-button {
        background-color: var(--accent-color);
        color: var(--accent-text-color);
      }

      @media (max-width: 1248px) {
        :host {
          margin: 0 24px 24px 24px;
        };
      }

      @media (max-width: 762px) {
        .queue-empty-state {
          @apply --layout-vertical;
        };

        .graph-line {
          margin: 8px 0;
        };
      }

      @media (max-width: 420px) {
        :host {
          margin: 0 12px 12px 12px;
        };
      }
      </style>
      <header>
        <a href="#/">
          <paper-icon-button icon="apic:arrow-back" title="Return to tests list"></paper-icon-button>
        </a>
        <h1>Test details</h1>
        <template is="dom-if" if="[[canCreate]]">
          <paper-icon-button icon="apic:delete" title="Delete this test" on-click="removeTest"></paper-icon-button>
        </template>
        <paper-icon-button icon="apic:refresh" title="Refresh the view" on-click="refresh"></paper-icon-button>
      </header>

      <div class="details">
        <div class="desc status">
          Status: <span class="status-value">[[testDetail.status]]</span>
        </div>
        <template is="dom-if" if="[[finished]]">
          <div class="desc result">
            Result: <span class="result-value" passing$=[[testPassed]]>[[_computeTestResult(testPassed)]]</span> (<span class="passed-count">[[passed]]</span>/<span class="failed-count">[[failed]]</span>)
          </div>
        </template>
        <template is="dom-if" if="[[isAmfTest]]">
          <div class="desc type">
            AMF: <span class="branch-value">[[testDetail.branch]]</span>
          </div>
        </template>
        <template is="dom-if" if="[[!isAmfTest]]">
          <div class="desc type">
            [[testDetail.component]]: <span class="branch-value">[[testDetail.branch]]</span>
          </div>
        </template>
      <div>

      <template is="dom-if" if="[[testDetail.error]]">
        <p class="error-message">[[testDetail.message]]</p>
      </template>

      <template is="dom-if" if="[[renderRestart]]">
        <div class="reset-test-container">
          <paper-button on-click="restartTest" class="restart-button" raised>Restart test</paper-button>
        </div>
      </template>

      <template is="dom-repeat" items="[[componentsList]]">
        <test-component-list-item class="li" item="[[item]]" test-id="[[testId]]" api-base="[[apiBase]]"></test-component-list-item>
      </template>
      <template is="dom-if" if="[[hasMore]]">
        <div class="more-container">
          <paper-button on-click="loadNext" class="more-button" raised>Load more</paper-button>
        </div>
      </template>

      <template is="dom-if" if="[[isQueued]]">
        <div class="queue-empty-state">
          <div class="circle ready">Queued</div>
          <div class="graph-line"></div>
          <div class="circle">Executed</div>
          <div class="graph-line"></div>
          <div class="circle">Results</div>
        </div>
      </template>

      <template is="dom-if" if="[[startedRunning]]">
        <div class="queue-empty-state">
          <div class="circle ready">Queued</div>
          <div class="graph-line"></div>
          <div class="circle ready">Executing</div>
          <div class="graph-line"></div>
          <div class="circle">Results</div>
        </div>
      </template>

      <test-model id="testModel" api-base="[[apiBase]]" test-id="[[testId]]" api-token="[[apiToken]]" result="{{testDetail}}" on-error="_testFetchError"></test-model>
      <test-components-data-factory
        id="request"
        api-base="[[apiBase]]"
        test-id="[[testId]]"
        list="{{componentsList}}"
        has-more="{{hasMore}}"
        loading="{{loading}}"></test-components-data-factory>
      <paper-toast class="error-toast" id="err" duration="7000"></paper-toast>
    `;
  }

  static get properties() {
    return {
      apiBase: String,
      testId: String,
      opened: Boolean,
      testsList: Array,
      componentsList: Array,
      loading: {type: Boolean, notify: true},
      apiToken: String,
      testDetail: {
        type: Object
      },
      finished: {
        type: Boolean,
        computed: '_computeFinished(testDetail.status)'
      },
      isQueued: {
        type: Boolean,
        computed: '_computeTestQueued(testDetail.status)'
      },
      isRunning: {
        type: Boolean,
        computed: '_computeTestRunning(testDetail.status)'
      },
      testPassed: {
        type: Boolean,
        computed: '_computeTestPassed(finished, testDetail)'
      },
      isAmfTest: {
        type: Boolean,
        computed: '_computeIsAmf(testDetail.type)'
      },
      passed: {
        type: Number,
        computed: '_computeNumberValue(testDetail.passed)'
      },
      failed: {
        type: Number,
        computed: '_computeNumberValue(testDetail.failed)'
      },
      hasMore: Boolean,

      canCreate: Boolean,

      startedRunning: {
        type: Boolean,
        computed: '_computeStartedRunning(isRunning, componentsList)'
      },

      renderRestart: {
        type: Boolean,
        computed: '_computeRenderRestart(canCreate, finished)'
      }
    };
  }

  static get observers() {
    return [
      '_requestDataObserver(opened, hasMore, testId)'
    ];
  }

  _testFetchError(e) {
    this._renderError(e.detail.message);
  }

  _requestDataObserver(opened, hasMore, testId) {
    if (!opened || hasMore === false || !testId || this.loading) {
      return;
    }
    afterNextRender(this, () => {
      if (!this.componentsList && !this.loading) {
        this.$.request.loadNext();
      }
    });
  }

  _computeTestPassed(finished, test) {
    if (!finished || !test) {
      return true;
    }
    return test.failed === 0 && test.passed > 0;
  }

  _computeTestResult(testPassed) {
    return testPassed ? 'Passed' : 'Failed';
  }

  _computeIsAmf(type) {
    return type === 'amf-build';
  }

  _computeFinished(status) {
    return status === 'finished';
  }

  _computeTestQueued(status) {
    return status === 'queued';
  }

  _computeTestRunning(status) {
    return status === 'running';
  }

  _computeStartedRunning(isRunning, testsList) {
    return !!(isRunning && (!testsList || !testsList.length));
  }

  _computeNumberValue(value) {
    if (!value || isNaN(value)) {
      return 0;
    }
    return Number(value);
  }

  _computeRenderRestart(canCreate, finished) {
    return !!(canCreate && finished);
  }

  refresh() {
    this.hasMore = false;
    this.$.request.clean();
    this.$.request.loadNext();
    this.$.testModel.get();
  }

  loadNext() {
    this.$.request.loadNext();
  }

  _renderError(message) {
    this.$.err.text = message;
    this.$.err.opened = true;
  }

  removeTest() {
    return this.$.testModel.delete()
    .then(() => {
      this.dispatchEvent(new CustomEvent('navigate', {
        composed: true,
        bubbles: true,
        detail: {
          path: '/status'
        }
      }));
    })
    .catch(() => {});
  }

  restartTest() {
    return this.$.testModel.restart()
    .then(() => {
      this.componentsList = undefined;
      return this.$.testModel.get();
    })
    .catch(() => {});
  }
}
window.customElements.define('arc-test-details', ArcTestDetails);
