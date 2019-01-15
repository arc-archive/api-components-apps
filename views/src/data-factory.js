import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import {afterNextRender} from '@polymer/polymer/lib/utils/render-status.js';
import '@polymer/iron-ajax/iron-ajax';

class DataFactory extends PolymerElement {
  static get template() {
    return html`
      <style>
      :host {display: none !important;}
      </style>
      <iron-ajax auto loading="{{loading}}" url="[[apiBase]]tests" handle-as="json" params="[[testParams]]" on-response="_handleTestsResponse" debounce-duration="300">
      <iron-ajax id="cmp" loading="{{loading}}" url="[[apiBase]]tests/[[testId]]/components" handle-as="json" params="[[componentsParams]]" on-response="_handleComponentsResponse" debounce-duration="300">
      <iron-ajax id="log" loading="{{loading}}" url="[[apiBase]]tests/[[testId]]/components/[[componentName]]/logs" handle-as="json" params="[[logsParams]]" on-response="_handleLogsResponse" debounce-duration="300">
    `;
  }

  constructor() {
    super();
    this._dataRequested = this._dataRequested.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.parentNode.addEventListener('data-request', this._dataRequested);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.parentNode.removeEventListener('data-request', this._dataRequested);
  }

  static get properties() {
    return {
      apiBase: String,
      testsList: {type: Array, notify: true},
      componentsList: {type: Array, notify: true},
      logsList: {type: Array, notify: true},
      testsPageToken: String,
      testParams: Array,
      componentsPageToken: String,
      componentsParams: Array,
      logsPageToken: String,
      logsParams: Array,
      hasMoreComponents: {type: Boolean, value: true, notify: true},
      hasMoreTests: {type: Boolean, value: true, notify: true},
      hasMoreLogs: {type: Boolean, value: true, notify: true},
      loading: {type: Boolean, notify: true},
      testId: String,
      componentName: String
    };
  }

  _dataRequested(e) {
    const {testId, component, type} = e.detail;
    switch (type) {
      case 'components': this.requestComponentsData(testId); break;
      case 'logs': this.requestLogsData(testId, component); break;
    }
  }

  _handleTestsResponse(e) {
    const data = e.target.lastResponse;
    this.testsPageToken = data.nextPageToken;
    if (data.nextPageToken && !this.hasMoreTests) {
      this.hasMoreTests = true;
    } else if (!data.nextPageToken && this.hasMoreTests) {
      this.hasMoreTests = false;
    }
    if (!this.testsList) {
      this.testsList = data.items;
    } else {
      this.testsList = this.testsList.concat(data.items);
    }
  }

  requestComponentsData(testId) {
    if (this.testId === testId) {
      if (this.componentsPageToken) {
        this.componentsParams = {
          nextPageToken: this.componentsPageToken
        };
        this._generateComponentsRequest();
      }
      return;
    }
    this.testId = testId;
    this.componentsList = undefined;
    this._generateComponentsRequest();
  }

  _generateComponentsRequest() {
    afterNextRender(this, () => {
      this.$.cmp.generateRequest();
    });
  }

  _handleComponentsResponse(e) {
    const data = e.target.lastResponse;
    this.componentsPageToken = data.nextPageToken;
    if (data.nextPageToken && !this.hasMoreComponents) {
      this.hasMoreComponents = true;
    } else if (!data.nextPageToken && this.hasMoreComponents) {
      this.hasMoreComponents = false;
    }
    if (!this.componentsList) {
      this.componentsList = data.items;
    } else {
      this.componentsList = this.componentsList.concat(data.items);
    }
  }

  requestLogsData(testId, component) {
    if (this.testId !== testId) {
      this.testId = testId;
      this.componentsList = undefined;
    }
    if (this.componentName === component) {
      if (this.logsPageToken) {
        this.logsParams = {
          nextPageToken: this.logsPageToken
        };
        this.$.log.generateRequest();
      }
      return;
    }
    this.componentName = component;
    this.logsList = undefined;
    this.$.log.generateRequest();
  }

  _handleLogsResponse(e) {
    const data = e.target.lastResponse;
    this.logsPageToken = data.nextPageToken;
    if (data.nextPageToken && !this.hasMoreLogs) {
      this.hasMoreLogs = true;
    } else if (!data.nextPageToken && this.hasMoreLogs) {
      this.hasMoreLogs = false;
    }
    if (!this.logsList) {
      this.logsList = data.items;
    } else {
      this.logsList = this.logsList.concat(data.items);
    }
  }
}
window.customElements.define('data-factory', DataFactory);
