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
        <template is="dom-repeat" items="[[_logs]]">
          <li
            classs="log"
            is-file$="[[item.isFile]]"
            state$="[[item.state]]"
            is-test$="[[item.isTest]]"
            style$="[[_computeIndentStyle(item.indent)]]"
          >
            <template is="dom-if" if="[[item.isFile]]">
              <a
                href="https://github.com/advanced-rest-client/[[componentName]]/blob/stage/[[item.name]]"
                target="_blank"
                title="Open test file"
                >[[item.name]] <iron-icon class="new-win-icon" icon="apic:open-in-new"></iron-icon
              ></a>
            </template>
            <template is="dom-if" if="[[!item.isFile]]"
              >[[item.name]]</template
            >
          </li>
        </template>
      </ol>
    `;
  }

  static get properties() {
    return {
      logs: { type: Array, observer: '_logsChanged' },
      componentName: String,
      _logs: Array
    };
  }

  _logsChanged(logs) {
    if (!logs || !logs.length) {
      this._logs = undefined;
      return;
    }
    const data = [];
    for (let i = 0, len = logs.length; i < len; i++) {
      const log = logs[i];
      let idPath = '';
      for (let j = 0, jLen = log.path.length; j < jLen; j++) {
        const isLast = j + 1 === jLen;
        if (isLast) {
          const obj = {
            name: log.path[j],
            isTest: true,
            indent: j,
            state: log.state,
            isFile: false
          };
          data[data.length] = obj;
          continue;
        }
        let dataHasPath = false;
        idPath += log.path[j];
        for (let k = 0, kLen = data.length; k < kLen; k++) {
          if (data[k].id === idPath) {
            dataHasPath = true;
            break;
          }
        }
        if (dataHasPath) {
          continue;
        }
        const obj = {
          id: idPath,
          name: log.path[j],
          isTest: false,
          indent: j
        };
        if (j === 0) {
          obj.isFile = true;
        } else {
          obj.isFile = false;
        }
        data[data.length] = obj;
      }
    }
    this._logs = data;
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
        <h2>[[item.browser]] [[item.version]]</h2>
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
