import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-ajax/iron-ajax';

let cachedData = [];
let pageToken;

class TestsModel extends PolymerElement {
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
    this._testDeletedHandler = this._testDeletedHandler.bind(this);
    this._testUpdatedHandler = this._testUpdatedHandler.bind(this);
    this._testAddedHandler = this._testAddedHandler.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('test-deleted', this._testDeletedHandler);
    window.addEventListener('test-updated', this._testUpdatedHandler);
    window.addEventListener('test-added', this._testAddedHandler);
    if (cachedData && cachedData.length) {
      this.list = Array.from(cachedData);
    }
    if (!(this.list && this.list.length)) {
      this.loadNext();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('test-deleted', this._testDeletedHandler);
    window.removeEventListener('test-updated', this._testUpdatedHandler);
    window.removeEventListener('test-added', this._testAddedHandler);
  }

  clean() {
    pageToken = undefined;
    cachedData = [];
    this.list = undefined;
    this.hasMore = undefined;
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
      this.list = Array.from(data.items);
    } else {
      cachedData = cachedData.concat(data.items);
      this.list = this.list.concat(data.items);
    }
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
    });
  }

  _testDeletedHandler(e) {
    const {id} = e.detail;
    const list = this.list || [];
    for (let i = 0, len = list.length; i < len; i++) {
      if (list[i].id === id) {
        this.splice('list', i, 1);
        cachedData.splice(i, 1);
        break;
      }
    }
  }

  _testUpdatedHandler(e) {
    const {id} = e.detail;
    this.refreshTest(id);
  }

  _testAddedHandler() {
    this.clean();
    this.loadNext();
  }
}
window.customElements.define('tests-model', TestsModel);
