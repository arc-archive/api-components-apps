import { PolymerElement, html } from '@polymer/polymer/polymer-element.js';
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';
import '@polymer/paper-progress/paper-progress.js';
import '@polymer/paper-styles/typography.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-icon';
import './test-logs-data-factory.js';

class LogRenderer extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
        }

        ol {
          margin: 0;
          padding: 0;
        }

        li[is-file] {
          @apply --paper-font-title;
        }

        li {
          @apply --paper-font-subhead;
          list-style: none;
        }

        li[is-test] {
          @apply --paper-font-body2;
        }

        li[state]::before {
          font-size: 15px;
          display: inline-block;
          margin-right: 4px;
        }

        li[state='passing']::before {
          content: '✓';
          color: #2e7d32;
        }

        li[state='failing']::before {
          content: '✖';
          color: #f44336;
        }

        li[state='failing'] {
          color: #f44336;
        }

        a {
          color: currentColor;
        }

        .new-win-icon {
          margin-left: 8px;
          width: 20px;
          height: 20px;
          color: #757575;
        }
      </style>
      <ol>
        <template is="dom-repeat" items="[[logs]]">
          <li
            classs="log"
            is-success$="[[item.success]]"
            is-skipped$="[[item.skipped]]"
          >
            <p class="suite-name">[[item.suite]]</p>
            <p class="suite-description">[[item.description]]</p>
            <template is="dom-repeat" items="[[item.errors]]">
              <p class="test-error">[[item.message]]</p>
            </template>
          </li>
        </template>
      </ol>
    `;
  }

  static get properties() {
    return {
      logs: { type: Array, observer: '_logsChanged' },
      componentName: String
    };
  }

  _logsChanged(logs) {
    if (!logs) {
      return;
    }
    const result = [];
    const refMap = {};
    for (let i = 0; i < logs.length; i++) {
      const item = logs[i];
      const refId = item.suite.join('-');
      if (refMap[refId]) {
        refMap[refId].logs.push(item);
        continue;
      }
      const path = [];
      let lastRefId;
      for (let j = 0; j < item.suite.length; j++) {
        const suite = item.suite[j];
        const prevRefId = path.join('-');
        path.push(suite);
        lastRefId = path.join('-');
        if (!refMap[lastRefId]) {
          refMap[lastRefId] = {
            name: suite,
            logs: [],
            suites: []
          };
        }
        if (!prevRefId) {
          result.push(refMap[lastRefId]);
        } else {
          refMap[prevRefId].suites.push(refMap[lastRefId]);
        }
      }
      refMap[lastRefId].logs.push(item);
    }
  }

  _computeIndentStyle(indent) {
    if (!indent) {
      return '';
    }
    const value = indent * 8;
    return `padding-left: ${value}px`;
  }
}
window.customElements.define('logs-renderer', LogRenderer);

class ComponentLogsViewer extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
        }

        h2 {
          @apply --paper-font-headline;
        }

        paper-progress {
          width: 100%;
          --paper-progress-active-color: #00698c;
        }

        .cmp-message {
          margin: 1em 8px;
          font-size: 16px;
          color: #f44336;
        }
      </style>
      <test-logs-data-factory
        id="request"
        test-id="[[testId]]"
        component-name="[[componentName]]"
        api-base="[[apiBase]]"
        list="{{browsers}}"
        has-more="{{hasMore}}"
        loading="{{loading}}"
      ></test-logs-data-factory>
      <template is="dom-if" if="[[loading]]">
        <paper-progress indeterminate></paper-progress>
      </template>
      <template is="dom-repeat" items="[[browsers]]">
        <h2>[[item.browser]]</h2>
        <template is="dom-if" if="[[item.message]]">
          <p class="cmp-message">[[item.message]]</p>
        </template>
        <template is="dom-if" if="[[_hasLogs(item.logs)]]">
          <logs-renderer logs="[[item.logs]]" component-name="[[componentName]]"></logs-renderer>
        </template>
      </template>
    `;
  }

  static get properties() {
    return {
      apiBase: String,
      testId: String,
      componentName: Boolean,
      loading: { type: Boolean },
      browsers: Array,
      hasMore: Boolean
    };
  }

  static get observers() {
    return ['_requestDataObserver(hasMore, testId, componentName)'];
  }

  _requestDataObserver(hasMore, testId, componentName) {
    if (hasMore === false || !testId || !componentName || this.loading) {
      return;
    }
    afterNextRender(this, () => {
      if (!this.browsers && !this.loading) {
        this.$.request.loadNext();
      }
    });
  }

  _hasLogs(logs) {
    return !!(logs && logs.length);
  }
}
window.customElements.define('component-logs-viewer', ComponentLogsViewer);
