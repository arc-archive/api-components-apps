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

  connectedCallback() {
    super.connectedCallback();
    if (cachedData && cachedData.length) {
      this.list = cachedData;
    }
    if (!(this.list && this.list.length)) {
      this.loadNext();
    }
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
        for (let i = 0, len = cachedData.length; i < len; i++) {
          if (cachedData[i].id === id) {
            cachedData[i] = resource;
            this.set(`list.${i}`, resource);
            break;
          }
        }
      }
    });
  }
}
window.customElements.define('tests-data-factory', TestsDataFactory);
