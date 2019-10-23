import { PolymerElement, html } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-ajax/iron-ajax';

// [testId][componentName] = {hasMore, data}
const cachedData = {};
// [testId][componentName] = String
const pageTokens = {};

class TestLogsDataFactory extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: none !important;
        }
      </style>
      <iron-ajax
        id="request"
        loading="{{loading}}"
        url="[[apiBase]]tests/[[testId]]/components/[[componentName]]/logs"
        handle-as="json"
        params="[[requestParams]]"
        on-response="_handleResponse"
        with-credentials
        debounce-duration="300"
      >
      </iron-ajax>
    `;
  }

  static get properties() {
    return {
      apiBase: String,
      testId: String,
      componentName: String,
      list: { type: Array, notify: true },
      hasMore: { type: Boolean, notify: true },
      loading: { type: Boolean, notify: true },
      requestParams: Object
    };
  }

  static get observers() {
    return ['_paramsChanged(testId, componentName)'];
  }

  connectedCallback() {
    super.connectedCallback();
    const id = this.testId;
    const name = this.componentName;
    if (id && name && cachedData[id] && cachedData[id][name]) {
      this._restoreCahce(cachedData[id][name]);
    }
  }

  _paramsChanged(id, name) {
    if (!id || !name) {
      if (this.hasMore) {
        this.hasMore = false;
      }
      return;
    }
    const cache = cachedData[id] && cachedData[id][name];
    if (cache) {
      this._restoreCahce(cache);
    } else {
      if (!this.hasMore) {
        this.hasMore = true;
      }
      this.list = undefined;
    }
  }

  _restoreCahce(cache) {
    this.list = cache.data;
    this.hasMore = cache.hasMore;
  }

  loadNext() {
    const id = this.testId;
    if (!id) {
      throw new Error('Test id is not set when calling the API.');
    }
    const name = this.componentName;
    if (!name) {
      throw new Error('Component name is not set when calling the API.');
    }
    const apiBase = this.apiBase;
    if (!apiBase) {
      throw new Error('The apiBase property is not set.');
    }
    const token = pageTokens[id] && pageTokens[id][name];
    if (token) {
      this.requestParams = {
        nextPageToken: token
      };
    } else if (this.requestParams) {
      this.requestParams = undefined;
    }
    this.$.request.generateRequest();
  }

  _handleResponse(e) {
    const id = this.testId;
    if (!id) {
      return;
    }
    const name = this.componentName;
    if (!name) {
      return;
    }
    const data = e.target.lastResponse;
    const token = data.nextPageToken;
    if (!pageTokens[id]) {
      pageTokens[id] = {};
    }
    pageTokens[id][name] = token;
    if (!cachedData[id]) {
      cachedData[id] = {};
    }
    if (!cachedData[id][name]) {
      cachedData[id][name] = {};
    }
    this.hasMore = cachedData[id][name].hasMore = !!token;
    if (!this.list) {
      cachedData[id][name].data = data.items;
      this.list = data.items;
    } else {
      cachedData[id][name].data = cachedData[id][name].data.concat(data.items);
      this.list = this.list.concat(data.items);
    }
  }

  clean() {
    this.list = undefined;
    this.hasMore = undefined;
    const id = this.testId;
    if (!id) {
      return;
    }
    const name = this.componentName;
    if (!name) {
      return;
    }
    if (cachedData[id]) {
      delete cachedData[id][name];
    }
    if (pageTokens[id]) {
      delete pageTokens[id][name];
    }
  }
}
window.customElements.define('test-logs-data-factory', TestLogsDataFactory);
