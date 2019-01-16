import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-ajax/iron-ajax';

let cachedData = [];
let pageToken;

class TokensDataFactory extends PolymerElement {
  static get template() {
    return html`
      <style>
      :host {display: none !important;}
      </style>
      <iron-ajax
        id="request"
        loading="{{loading}}"
        url="[[apiBase]]me/tokens"
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
      this.list = data.items;
    } else {
      cachedData = cachedData.concat(data.items);
      this.list = this.list.concat(data.items);
    }
  }
}
window.customElements.define('tokens-data-factory', TokensDataFactory);
