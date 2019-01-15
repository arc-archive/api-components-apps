import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-styles/typography.js';
import '@polymer/paper-styles/shadow.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import './apic-icons.js';
import './tests-data-factory.js';
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

      header {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      h1 {
        @apply --paper-font-headline;
        @apply --layout-flex;
      }

      .li {
        border: 1px #E0E0E0 solid;
        border-radius: 3px;
        margin: 8px 0;
        border-left: 2px #2E7D32 solid;
      }

      .li[failed] {
        border-left: 2px #F44336 solid;
      }

      .li[queued] {
        border-left: 2px #9E9E9E solid;
      }
      </style>
      <header>
        <h1>API components tests</h1>
        <paper-icon-button icon="apic:refresh" title="Refresh the view" on-click="refresh"></paper-icon-button>
      </header>
      <template is="dom-repeat" items="[[testsList]]">
        <test-list-item class="li" item="[[item]]"></test-list-item>
      </template>
      <tests-data-factory
        id="model"
        api-base="[[apiBase]]"
        list="{{testsList}}"
        has-more="{{hasMore}}"
        loading="{{loading}}"></tests-data-factory>
    `;
  }

  static get properties() {
    return {
      testsList: {type: Array},
      apiBase: String,
      hasMore: {type: Boolean, value: true},
      loading: {type: Boolean, notify: true},
    };
  }

  refresh() {
    this.$.model.clean();
    this.$.model.loadNext();
  }
}

window.customElements.define('arc-status', ArcStatus);
