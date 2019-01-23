import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-styles/typography.js';
import '@polymer/paper-styles/shadow.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import './models/tests-model.js';
import './list-items/test-list-item.js';
import './apic-icons.js';

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

      .no-data-container {
        margin: 30% auto;
        width: 50%;
      }

      .visual {
        @apply --layout-horizontal;
        background-color: #757575;
        opacity: 0.7;
      }

      .item {
        @apply --layout-flex;
        height: 40px;
        background-color: #B0BEC5;
        margin: 6px;
      }

      .item.accent {
        background-color: #4CAF50;
      }

      .empty-info {
        text-align: center;
        color: #616161;
        font-size: 22px;
      }

      .empty-info2 {
        text-align: center;
        color: #9E9E9E;
        font-size: 22px;
      }

      @media (max-width: 1248px) {
        :host {
          margin: 0 24px 24px 24px;
        };
      }

      @media (max-width: 420px) {
        :host {
          margin: 0 12px 12px 12px;
        };
      }
      </style>
      <header>
        <h1>API components tests</h1>
        <paper-icon-button icon="apic:refresh" title="Refresh the view" on-click="refresh"></paper-icon-button>
      </header>
      <template is="dom-repeat" items="[[testsList]]">
        <test-list-item class="li" item="[[item]]"></test-list-item>
      </template>
      <template is="dom-if" if="[[hasMore]]">
        <div class="more-container">
          <paper-button on-click="loadNext" class="more-button" raised>Load more</paper-button>
        </div>
      </template>

      <template is="dom-if" if="[[renderEmptyInfo]]">
        <div class="no-data-container">
          <div class="visual">
            <div class="item"></div>
            <div class="item accent"></div>
            <div class="item"></div>
            <div class="item"></div>
          </div>
          <p class="empty-info">There are no tests to see.</p>
          <p class="empty-info2">All tests results appear here when scheduled.</p>
        </div>
      </template>

      <tests-model id="model" api-base="[[apiBase]]" list="{{testsList}}" has-more="{{hasMore}}" loading="{{loading}}"></tests-model>
    `;
  }

  static get properties() {
    return {
      testsList: {type: Array},
      apiBase: String,
      hasMore: {type: Boolean, value: true},
      loading: {type: Boolean, notify: true},
      hasResults: {type: Boolean, computed: '_computeHasResults(testsList.*)'},
      renderEmptyInfo: {type: Boolean, computed: '_computeRenderEmptyInfo(hasResults, loading)'}
    };
  }

  refresh() {
    this.$.model.clean();
    this.$.model.loadNext();
  }

  _computeHasResults(record) {
    const value = record && record.base;
    return !!(value && value.length);
  }

  _computeRenderEmptyInfo(hasResults, loading) {
    return !hasResults && !loading;
  }
}

window.customElements.define('arc-status', ArcStatus);
