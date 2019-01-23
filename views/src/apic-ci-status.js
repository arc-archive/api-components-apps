import {html, PolymerElement} from '@polymer/polymer/polymer-element.js';
import {setPassiveTouchGestures, setRootPath} from '@polymer/polymer/lib/utils/settings.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/app-route/app-location.js';
import '@polymer/app-route/app-route.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/iron-selector/iron-selector.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/paper-styles/typography.js';
import '@polymer/paper-progress/paper-progress.js';
import '@polymer/paper-menu-button/paper-menu-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-fab/paper-fab.js';
import './user-data-factory.js';
import './apic-icons.js';
// Gesture events like tap and track generated from touch will not be
// preventable, allowing for better scrolling performance.
setPassiveTouchGestures(true);

// Set Polymer's root path to the same value we passed to our service worker
// in `index.html`.
setRootPath(window.ApicCiStatus.rootPath);
/**
 * @customElement
 * @polymer
 */
class ApicCiStatus extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
          background-color: var(--primary-background-color);
          @apply --layout-fit;
          @apply --paper-font-body1;
          --primary-color: #00A2DF;
          --primary-text-color: rgba(0, 0, 0, 0.87);
          --primary-background-color: #ffffff;
          --secondary-text-color: #737373;
          --disabled-text-color: #9b9b9b;
          --divider-color: #dbdbdb;

          --light-primary-color: var(--paper-indygo-100);
          --dark-primary-color: var(--paper-blue-700);
          --accent-color: #2196F3;
          --accent-text-color: #fff;
          --light-accent-color: #64B5F6;
          --dark-accent-color: #1565C0;

          --toolbar-color: #ffffff;
          --toolbar-background-color: var(--primary-color);
        }

        app-header-layout {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          background-color: #fff;
        }

        app-header {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          background-color: var(--toolbar-background-color);
          color: var(--toolbar-color);
          height: 64px;
        }

        app-drawer {
          @apply --shadow-elevation-6dp;
        }

        .app-name {
          font-family: 'Roboto', 'Noto', sans-serif;
          -webkit-font-smoothing: antialiased;
          font-size: 16px;
          font-weight: 400;
          line-height: 24px;
        }

        .content {
          @apply --layout-flex;
        }

        iron-pages {
          height: 100%;
        }

        .app-icon {
          width: 64px;
          height: 64px;
        }

        .main-link {
          text-decoration: none;
        }

        paper-progress {
          width: 100%;
          --paper-progress-active-color: #00698c;
        }

        .user-icon {
          --iron-icon: {
            border-radius: 50%;
            overflow: hidden;
          }
        }

        a {
          color: currentColor;
        }

        .login-button {
          background-color: #FAFAFA;
          color: #00a2df;
        }

        .status-add-test {
          position: fixed;
          bottom: 20px;
          right: 40px;
          transition: transform 0.24s ease-in-out;
        }

        .status-add-test[away] {
          transform: translateX(110px);
        }

        @media all and (max-width: 740px) {
          [main-title] {
            display: none !important;
          }

          .status-add-test {
            right: 20px;
          }
        }
      </style>
      <app-location id="loc" route="{{route}}" use-hash-as-path url-space-regex="^((?!/auth).)*$"></app-location>
      <app-route route="{{route}}" pattern="[[rootPath]]:page" data="{{routeData}}" tail="{{subroute}}"></app-route>
      <app-route route="{{subroute}}" pattern="/:id" data="{{pageData}}" tail="{{pageTail}}"></app-route>
      <user-data-factory api-base="[[apiBase]]" user="{{user}}" logged-in="{{loggedIn}}" api-token="[[apiToken]]"></user-data-factory>
      <app-header-layout has-scrolling-region id="scrollingRegion">
        <app-header fixed shadow scroll-target="scrollingRegion" slot="header">
          <app-toolbar>
            <a href="#/status" class="main-link">
              <img src="images/arc-icon.png" class="app-icon" alt="ARC logo"/>
            </a>
            <div main-title>API components CI</div>
            <template is="dom-if" if="[[loggedIn]]">
              <paper-menu-button horizontal-align="right">
                <paper-icon-button src="[[user.imageUrl]]" icon="[[_computeUserIcon(user)]]" slot="dropdown-trigger" class="user-icon"></paper-icon-button>
                <paper-listbox slot="dropdown-content">
                  <a href="#/tokens">
                    <paper-item>Tokens</paper-item>
                  </a>
                  <a href="/auth/logout?return=%2F">
                    <paper-item>Log out</paper-item>
                  </a>
                </paper-listbox>
              </paper-menu-button>
            </template>
            <template is="dom-if" if="[[!loggedIn]]">
              <a href="/auth/login?return=%2F">
                <paper-button class="login-button">Log in</paper-button>
              </a>
            </template>
            <template is="dom-if" if="[[loading]]">
              <paper-progress bottom-item indeterminate></paper-progress>
            </template>
          </app-toolbar>
        </app-header>
        <div class="content">
          <iron-pages role="main" attr-for-selected="name" selected="[[page]]" selected-attribute="opened">
            <arc-status name="status" api-base="[[apiBase]]" loading="{{loading}}"></arc-status>
            <arc-test-details name="test-details" test-id="[[pageData.id]]" api-base="[[apiBase]]" loading="{{loading}}" can-create="[[canCreate]]" api-token="[[apiToken]]"></arc-test-details>
            <arc-add-test name="add-test" api-base="[[apiBase]]" loading="{{loading}}"></arc-add-test>
            <arc-tokens name="tokens" api-base="[[apiBase]]" api-token="[[apiToken]]"></arc-tokens>
            <arc-add-token name="add-token" api-base="[[apiBase]]" api-token="[[apiToken]]"></arc-add-token>
            <arc-404 name="arc-404"></arc-404>
          </iron-pages>
          <template is="dom-if" if="[[canCreate]]">
            <paper-fab class="status-add-test" title="Schedule a test" icon="apic:add" on-click="_createTestHandler" away$="[[!isStatusPage]]"></paper-fab>
          </template>
        </div>
      </app-header-layout>
    `;
  }
  static get properties() {
    return {
      page: {
        type: String,
        reflectToAttribute: true,
        observer: '_pageChanged'
      },
      // Route data recognized by app location element
      route: Object,
      // Parsed route data
      routeData: Object,
      subroute: Object,
      forceNarrowLayout: {
        type: Boolean,
        value: true
      },
      narrowLayout: {
        type: Boolean,
        value: true
      },
      // True if application drawer is opened.
      drawerOpened: Boolean,
      apiBase: String,
      loading: {type: Boolean},
      testsList: Array,
      componentsList: Array,
      hasMoreTests: Boolean,
      hasMoreComponents: Boolean,
      loggedIn: Boolean,
      user: Object,
      canCreate: {
        type: Boolean,
        computed: '_computeCanCreate(loggedIn, user.orgUser)'
      },
      isStatusPage: {
        type: Boolean,
        computed: '_computeIsStatusPage(page)'
      },
      apiToken: {
        type: String
      }
    };
  }

  static get observers() {
    return [
      '_routePageChanged(routeData.page)'
    ];
  }

  constructor() {
    super();
    this._navigateHandler = this._navigateHandler.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('navigate', this._navigateHandler);
    if (!this.route.path || this.route.path === '/') {
      this.set('route.path', '/status');
    }
    this.apiBase = window.ApicCiStatus.apiBase;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('navigate', this._navigateHandler);
  }

  _routePageChanged(page) {
    if (!page) {
      this.page = 'status';
    } else if (['status', 'test-details', 'add-test', 'tokens', 'add-token'].indexOf(page) !== -1) {
      this.page = page;
    } else {
      this.page = 'arc-404';
    }
  }

  _pageChanged(page) {
    // Import the page component on demand.
    //
    // Note: `polymer build` doesn't like string concatenation in the import
    // statement, so break it up.
    switch (page) {
      case 'status':
        import('./arc-status.js');
        break;
      case 'test-details':
        import('./arc-test-details.js');
        break;
      case 'add-test':
        if (!this.loggedIn) {
          this.page = 'arc-404';
          return;
        }
        import('./arc-add-test.js');
        break;
      case 'tokens':
        if (!this.loggedIn) {
          this.page = 'arc-404';
          return;
        }
        import('./arc-tokens.js');
        break;
      case 'add-token':
        if (!this.loggedIn) {
          this.page = 'arc-404';
          return;
        }
        import('./arc-add-token.js');
        break;
      case 'arc-404':
        import('./arc-404.js');
        break;
    }
    /* global gtag */
    gtag('config', 'UA-71458341-7', {
      'page_path': '/' + page
    });
  }

  _computeUserIcon(user) {
    return (user && user.imageUrl) ? undefined : 'apic:account-circle';
  }

  _computeCanCreate(loggedIn, orgUser) {
    return loggedIn && orgUser;
  }

  _createTestHandler() {
    if (!this.loggedIn || !this.user || !this.user.orgUser) {
      return;
    }
    this.$.loc.path = '/add-test';
  }

  _computeIsStatusPage(page) {
    return page === 'status';
  }

  _navigateHandler(e) {
    this.$.loc.path = e.detail.path;
  }
}

window.customElements.define('apic-ci-status', ApicCiStatus);
