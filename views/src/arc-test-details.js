import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import {afterNextRender} from '@polymer/polymer/lib/utils/render-status.js';
import '@polymer/paper-styles/typography.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import 'time-elements/dist/time-elements.js';
import './tests-data-factory.js';
import './test-components-data-factory.js';
import './test-component-list-item.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
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

      .passed-count,
      .result-value[passing] {
        color: #2E7D32;
      }

      .failed-count,
      .result-value {
        color: #F44336;
      }

      .result-value {
        margin-right: 8px;
      }

      .desc {
        color: #616161;
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
        height: 16px;
        border: 4px #E0E0E0 solid;
        margin: 0 24px;
      }

      a {
        color: currentColor;
      }
      </style>
      <header>
        <a href="#/">
          <paper-icon-button icon="apic:arrow-back" title="Return to tests list"></paper-icon-button>
        </a>
        <h1>Test details</h1>
        <paper-icon-button icon="apic:refresh" title="Refresh the view" on-click="refresh"></paper-icon-button>
      </header>

      <div class="details">
        <div class="desc status">
          Status: <span class="status-value">[[testDetail.status]]</span>
        </div>
        <template is="dom-if" if="[[testFinished]]">
          <div class="desc result">
            Result: <span class="result-value" passing$=[[testPassed]]>[[_computeTestResult(testPassed)]]</span> (<span class="passed-count">[[testDetail.passed]]</span>/<span class="failed-count">[[testDetail.failed]]</span>)
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
      <template is="dom-repeat" items="[[componentsList]]">
        <test-component-list-item class="li" item="[[item]]"></test-component-list-item>
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

      <tests-data-factory id="testFactory" api-base="[[apiBase]]" list="{{testsList}}"></tests-data-factory>
      <test-components-data-factory
        id="request"
        api-base="[[apiBase]]"
        test-id="[[testId]]"
        list="{{componentsList}}"
        loading="{{loading}}"></test-components-data-factory>
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
      testDetail: {
        type: Object,
        computed: '_computeTestDetail(testsList, testId, opened)',
        notify: true
      },
      testPassed: {
        type: Boolean,
        computed: '_computeTestPassed(testFinished, testDetail)'
      },
      testFinished: {
        type: Boolean,
        computed: '_computeTestFinished(testDetail.status)'
      },
      isAmfTest: {
        type: Boolean,
        computed: '_computeIsAmf(testDetail.type)'
      },
      hasMore: Boolean,
      isQueued: {
        type: Boolean,
        computed: '_computeTestQueued(testDetail.status)'
      }
    };
  }

  static get observers() {
    return [
      '_requestDataObserver(opened, hasMoreComponents, testId)'
    ];
  }

  _computeTestDetail(testsList, testId, opened) {
    if (!opened || !testsList || !testsList.length || !testId) {
      return;
    }
    return testsList.find((item) => item.id === testId);
  }

  _requestDataObserver(opened, hasMoreComponents, testId) {
    if (!opened || hasMoreComponents === false || !testId) {
      return;
    }
    afterNextRender(this, () => {
      if (!this.componentsList) {
        this.$.request.loadNext();
      }
    });
  }

  _computeTestPassed(testFinished, test) {
    if (!testFinished || !test) {
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

  _computeTestFinished(status) {
    return status === 'finished';
  }

  _computeTestQueued(status) {
    return status === 'queued';
  }

  refresh() {
    this.$.request.clean();
    this.$.request.loadNext();
    this.$.testFactory.refreshTest(this.testId);
  }
}
window.customElements.define('arc-test-details', ArcTestDetails);
