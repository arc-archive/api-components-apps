import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-ajax/iron-ajax';

const cachedData = {};
const pageTokens = {};

class TestComponentsDataFactory extends PolymerElement {
  static get template() {
    return html`
      <style>
      :host {display: none !important;}
      </style>
      <iron-ajax
        id="request"
        loading="{{loading}}"
        url="[[apiBase]]tests/[[testId]]/components"
        handle-as="json"
        params="[[requestParams]]"
        on-response="_handleResponse"
        debounce-duration="300">
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    const id = this.testId;
    if (id && cachedData[id]) {
      this._restoreCahce(cachedData[id]);
    }
  }

  static get properties() {
    return {
      apiBase: String,
      testId: {type: String, observer: '_testIdChanged'},
      list: {type: Array, notify: true},
      hasMore: {type: Boolean, value: true, notify: true},
      loading: {type: Boolean, notify: true},
      requestParams: Object
    };
  }

  _testIdChanged(id) {
    if (!id) {
      if (this.hasMore) {
        this.hasMore = false;
      }
    } else {
      const cache = cachedData[id];
      if (cache) {
        this._restoreCahce(cache);
      } else {
        if (!this.hasMore) {
          this.hasMore = true;
        }
        this.list = undefined;
      }
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
    const apiBase = this.apiBase;
    if (!apiBase) {
      throw new Error('The apiBase property is not set.');
    }
    const token = pageTokens[id];
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
    const data = e.target.lastResponse;
    const token = data.nextPageToken;
    pageTokens[id] = token;
    if (!cachedData[id]) {
      cachedData[id] = {};
    }
    this.hasMore = cachedData[id].hasMore = !!token;
    if (!this.list) {
      cachedData[id].data = data.items;
      this.list = data.items;
    } else {
      cachedData[id].data = cachedData[id].data.concat(data.items);
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
    cachedData[id] = undefined;
    pageTokens[id] = undefined;
  }
}
window.customElements.define('test-components-data-factory', TestComponentsDataFactory);
