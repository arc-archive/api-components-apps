import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-ajax/iron-ajax';

let cachedData = [];
let pageToken;

class TestsDataFactory extends PolymerElement {
  static get template() {
    return html`
      <style>
      :host {display: none !important;}
      </style>
      <iron-ajax
        id="request"
        loading="{{loading}}"
        url="[[apiBase]]tests"
        handle-as="json"
        params="[[requestParams]]"
        on-response="_handleResponse"
        debounce-duration="300">
    `;
  }

  static get properties() {
    return {
      apiBase: String,
      list: {type: Array, notify: true},
      hasMore: {type: Boolean, value: true, notify: true},
      loading: {type: Boolean, notify: true},
      requestParams: Object
    };
  }

  constructor() {
    super();
    this._syncHandled = this._syncHandled.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('tests-model-sync', this._syncHandled);
    if (cachedData && cachedData.length) {
      this.list = cachedData;
    }
    if (!(this.list && this.list.length)) {
      this.loadNext();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('tests-model-sync', this._syncHandled);
  }

  clean() {
    pageToken = undefined;
    cachedData = [];
    this.list = undefined;
    this.hasMore = undefined;
    this._syncCache();
  }

  loadNext() {
    if (pageToken) {
      this.requestParams = {
        nextPageToken: pageToken
      };
    } else if (this.requestParams) {
      this.requestParams = undefined;
    }
    this.$.request.generateRequest();
  }

  _handleResponse(e) {
    const data = e.target.lastResponse;
    pageToken = data.nextPageToken;
    if (pageToken && !this.hasMore) {
      this.hasMore = true;
    } else if (!pageToken && this.hasMore) {
      this.hasMore = false;
    }
    if (!this.list) {
      cachedData = data.items;
      this.list = data.items;
    } else {
      cachedData = cachedData.concat(data.items);
      this.list = this.list.concat(data.items);
    }
    this._dispatchSync();
  }

  refreshTest(id) {
    if (!id) {
      return;
    }
    const url = this.apiBase + 'tests/' + id;
    return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Unable to refresh test data.');
      }
      return response.json();
    })
    .then((resource) => {
      if (!this.list) {
        this.list = [resource];
        cachedData = [resource];
      } else {
        let updated = false;
        for (let i = 0, len = cachedData.length; i < len; i++) {
          if (cachedData[i].id === id) {
            cachedData[i] = resource;
            this.set(`list.${i}`, resource);
            updated = true;
            break;
          }
        }
        if (!updated) {
          cachedData.push(resource);
          this.push('list', resource);
        }
      }
      this._dispatchSync();
    });
  }

  _dispatchSync() {
    this.dispatchEvent(new CustomEvent('tests-model-sync', {
      bubbles: true,
      composed: true
    }));
  }

  _syncHandled(e) {
    const target = e.composedPath()[0];
    if (target === this) {
      return;
    }

    this._syncCache();
  }

  _syncCache() {
    const list = this.list || [];
    if (list.length !== cachedData.length) {
      this.set('list', cachedData);
    }
    for (let i = 0, len = cachedData.length; i < len; i++) {
      if (cachedData[i] !== list[i]) {
        this.set(`list.${i}`, cachedData[i]);
      }
    }
  }
}
window.customElements.define('tests-data-factory', TestsDataFactory);
