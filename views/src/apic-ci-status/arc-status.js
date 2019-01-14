import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-styles/typography.js';
import '@polymer/paper-styles/shadow.js';
import '@polymer/iron-ajax/iron-ajax.js';
import './test-list-item.js';

class ArcStatus extends PolymerElement {
  static get template() {
    return html`
      <style>
      :host {
        display: block;
        position: relative;
        max-width: 1200px;
        margin: 24px auto;
      }

      h1 {
        @apply --paper-font-headline;
      }

      .li {
        border: 1px #E0E0E0 solid;
        border-radius: 3px;
        margin: 4px 0;
      }

      .li[failed] {
        border-color: #F44336;
      }

      paper-progress {
        width: 100%;
      }
      </style>
      <iron-ajax
        auto
        loading="{{loading}}"
        url="[[apiBase]]tests"
        handle-as="json"
        on-response="handleResponse"
        debounce-duration="300">
      </iron-ajax>
      <h1>API components tests</h1>
      <template is="dom-repeat" items="[[testsList]]">
        <test-list-item class="li" item="[[item]]"></test-list-item>
      </template>
    `;
  }

  static get properties() {
    return {
      apiBase: String,
      testsList: Array,
      nextPageToken: String,
      loading: {type: Boolean, notify: true}
    };
  }

  handleResponse(e) {
    const data = e.target.lastResponse;
    console.log(data);
    this.nextPageToken = data.nextPageToken;
    if (!this.testsList) {
      this.testsList = data.items;
    } else {
      this.testsList = this.testsList.concat(data.items);
    }
  }
}

window.customElements.define('arc-status', ArcStatus);
