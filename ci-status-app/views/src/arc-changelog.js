import { PolymerElement, html } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-styles/typography.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-toast/paper-toast.js';
import '@polymer/marked-element/marked-element.js';
import '@polymer/paper-styles/shadow.js';
import 'time-elements/dist/time-elements.js';
import './apic-icons.js';

class ArcChangelog extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
          max-width: var(--app-screen-max-width);
          margin: var(--app-screen-margin);
        }

        header {
          @apply --layout-horizontal;
          @apply --layout-center;
        }

        h1 {
          @apply --paper-font-headline;
          @apply --layout-flex;
        }

        h2 {
          @apply --paper-font-title;
          @apply --layout-flex;
        }

        h3 {
          @apply --paper-font-subhead;
          @apply --layout-flex;
        }

        .error-toast {
          background-color: #ff5722;
          color: #fff;
        }

        .config {
          @apply --shadow-elevation-4dp;
          padding: 12px;
        }

        .time-row,
        .tag-line {
          @apply --layout-horizontal;
          @apply --layout-center;
        }

        .time-row paper-input {
          margin-right: 8px;
        }

        .search-action {
          margin-top: 24px;
        }

        .search-button {
          background-color: var(--primary-color);
          color: #fff;
        }

        .changelog-item {
          @apply --shadow-elevation-2dp;
          @apply --paper-font-body1;
          padding: 12px;
          margin: 20px 0;
        }

        .changelog-item .value {
          @apply --paper-font-body2;
          margin-left: 8px;
        }

        .markdown-html {
          background-color: #fff3e0;
          word-break: break-all;
          padding: 8px;
        }

        @media (max-width: 1248px) {
          :host {
            margin: 0 24px 24px 24px;
          }
        }

        @media (max-width: 420px) {
          :host {
            margin: 0 12px 12px 12px;
          }

          .time-row {
            @apply --layout-vertical;
            @apply --layout-start;
          }
        }
      </style>
      <header>
        <h1>Components changelog</h1>
      </header>
      <section class="config">
        <h2>Search options</h2>
        <div class="time-row">
          <paper-input label="Since" type="datetime-local" value="{{since}}"></paper-input>
          <paper-input label="Until" type="datetime-local" value="{{until}}"></paper-input>
        </div>
        <div class="tags-container">
          <h3>Tags</h3>
          <template is="dom-repeat" items="{{tags}}">
            <div class="tag-line">
              <paper-input label="Tag name" value="{{item.name}}"></paper-input>
              <paper-icon-button icon="apic:delete" title="Remove tag" on-click="_removeTag"></paper-icon-button>
            </div>
          </template>
          <paper-button raised on-click="addTag">Add tag</paper-button>
        </div>

        <div class="search-action">
          <paper-button class="search-button" on-click="update">Search</paper-button>
        </div>
      </section>

      <section class="result">
        <template is="dom-repeat" items="{{items}}">
          <div class="changelog-item">
            <h2>[[item.name]] v[[item.id]]</h2>

            <div class="description-line">
              <label>Published:</label
              ><relative-time class="value" datetime$="[[_computeTimeValue(item.created)]]"></relative-time>
            </div>

            <div class="description-line"><label>Component group:</label><span class="value">[[item.group]]</span></div>

            <template is="dom-if" if="[[_hasTags(item.tags)]]" restamp>
              <div class="description-line"><label>Tags:</label><span class="value">[[item.tags]]</span></div>
            </template>

            <template is="dom-if" if="[[item.changelog]]" restamp>
              <div class="description-line">
                <label>Changelog:</label><span class="value"></span>
                <marked-element markdown="[[item.changelog]]">
                  <div slot="markdown-html" class="markdown-html"></div>
                </marked-element>
              </div>
            </template>
          </div>
        </template>
      </section>

      <template is="dom-if" if="[[hasMore]]">
        <div class="more-container">
          <paper-button on-click="loadNext" class="more-button" raised>Load more</paper-button>
        </div>
      </template>

      <paper-toast class="error-toast" id="err" duration="7000"></paper-toast>
    `;
  }

  static get properties() {
    return {
      apiBase: String,
      hasMore: { type: Boolean, value: false },
      loading: { type: Boolean, notify: true },
      hasResults: { type: Boolean, computed: '_computeHasResults(testsList.*)' },
      renderEmptyInfo: { type: Boolean, computed: '_computeRenderEmptyInfo(hasResults, loading)' },
      pageToken: String,
      tags: {
        type: Array,
        value: function() {
          return [];
        }
      },
      since: String,
      until: String
    };
  }

  _computeHasResults(record) {
    const value = record && record.base;
    return !!(value && value.length);
  }

  _computeRenderEmptyInfo(hasResults, loading) {
    return !hasResults && !loading;
  }

  addTag() {
    this.push('tags', { name: '' });
  }

  _removeTag(e) {
    const index = e.model.get('index');
    this.splice('tags', index, 1);
  }

  update() {
    this.pageToken = undefined;
    this.loadNext();
    this.items = [];
  }

  loadNext() {
    let url = this.apiBase + 'components/versions?skip-docs=true';
    if (this.since) {
      url += '&since=' + new Date(this.since).getTime();
    }
    if (this.until) {
      url += '&until=' + new Date(this.until).getTime();
    }
    this.tags.forEach((tag) => {
      url += '&tags=' + encodeURIComponent(tag.name);
    });
    if (this._lastrBaseQuery !== url) {
      this.pageToken = undefined;
      this.items = [];
    }
    this._lastrBaseQuery = url;
    if (this.pageToken) {
      url += '&nextPageToken=' + encodeURIComponent(this.pageToken);
    }
    const init = {
      credentials: 'include'
    };
    let success = true;

    this.loading = true;
    return fetch(url, init)
      .then((response) => {
        if (!response.ok) {
          success = false;
        }
        return response.json();
      })
      .then((data) => {
        this.loading = false;
        if (!success) {
          this._reportError(data.message);
        } else {
          this._processResponse(data);
        }
      })
      .catch((cause) => {
        console.warn(cause);
        this._reportError(cause.message);
      });
  }

  _reportError(message) {
    message = message || 'Unknown error occurred';
    this.$.err.text = message;
    this.$.err.opened = true;
  }

  _processResponse(data) {
    this.hasMore = !!data.nextPageToken;
    if (this.hasMore) {
      this.pageToken = data.nextPageToken;
    }
    if (!data.items.length) {
      return;
    }
    if (this.items) {
      this.splice('items', this.items.length, 0, ...data.items);
    } else {
      this.set('items', data.items);
    }
  }

  _computeTimeValue(created) {
    const d = new Date(Number(created));
    return d.toISOString();
  }

  _hasTags(tags) {
    return !!(tags && tags.length);
  }
}

window.customElements.define('arc-changelog', ArcChangelog);
