import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-ajax/iron-ajax';

class UserDataFactory extends PolymerElement {
  static get template() {
    return html`
      <style>
      :host {display: none !important;}
      </style>
      <iron-ajax
        id="request"
        auto
        loading="{{loading}}"
        url="[[apiBase]]me"
        handle-as="json"
        on-response="_handleResponse"
        debounce-duration="300">
    `;
  }

  static get properties() {
    return {
      /**
       * API base URI.
       */
      apiBase: String,
      /**
       * User base information.
       * Even though it contains additional properties like "superUser" or
       * "orgUser" it won't enable any additional capabilities. The server
       * checks authentication when creating / deleting data.
       * @type {Object}
       */
      user: {type: Object, notify: true, readOnly: true},
      /**
       * True when data being loaded.
       */
      loading: {type: Boolean, notify: true},
      /**
       * A flag determining if the user is logged in.
       */
      loggedIn: {type: Boolean, notify: true, readOnly: true}
    };
  }

  _handleResponse(e) {
    const data = e.target.lastResponse;
    if (!data || !data.loggedIn) {
      this._setUser(undefined);
      this._setLoggedIn(false);
    } else {
      this._setUser(data);
      this._setLoggedIn(true);
    }
  }
}
window.customElements.define('user-data-factory', UserDataFactory);
