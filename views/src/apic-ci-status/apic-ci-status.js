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
import '@polymer/paper-styles/shadow.js';
import '@polymer/paper-tabs/paper-tabs.js';
import '@polymer/paper-tabs/paper-tab.js';
import '@polymer/paper-progress/paper-progress.js';
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

          font-family: Roboto, sans-serif;
          --primary-color: #00A2DF;
          --primary-text-color: rgba(0, 0, 0, 0.87);
          --primary-background-color: #ffffff;
          --secondary-text-color: #737373;
          --disabled-text-color: #9b9b9b;
          --divider-color: #dbdbdb;

          --light-primary-color: var(--paper-indygo-100);
          --dark-primary-color: var(--paper-blue-700);
          --accent-color: var(--paper-red-a200);
          --light-accent-color: #ff80ab;
          --dark-accent-color: #f50057;

          --toolbar-color: #ffffff;
          --toolbar-background-color: var(--primary-color);

          /* buttons */
          --action-button: {
            background-color: var(--primary-color);
            background-image: none;
            color: white;
            transition: background-color 300ms linear;
          };

          --paper-tab-ink: #fff;
          --paper-tabs-selection-bar-color: #fff;

          --paper-tabs-content: {
            color: #fff;
            font-weight: 400;
          };

          --paper-tab-content-unselected: {
            color: #fff;
            font-weight: 400;
          };
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
          height: 100%;
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

        [main-title] {
          -ms-flex: none;
          -webkit-flex: none;
          flex: none;
          margin-right: 40px;
        }

        paper-progress {
          width: 100%;
          --paper-progress-active-color: #00698c;
        }

        @media all and (max-width: 740px) {
          [main-title] {
            display: none !important;
          }
        }
      </style>
      <app-location route="{{route}}" url-space-regex="^[[rootPath]]"></app-location>
      <app-route route="{{route}}" pattern="[[rootPath]]:page" data="{{routeData}}" tail="{{subroute}}"></app-route>
      <app-header-layout has-scrolling-region id="scrollingRegion">
        <app-header fixed shadow scroll-target="scrollingRegion" slot="header">
          <app-toolbar>
            <a href="/" class="main-link">
              <img src="images/arc-icon.png" class="app-icon" alt="ARC logo"/>
            </a>
            <div main-title>API components</div>
            <paper-tabs attr-for-selected="name" selected="{{routeData.page}}">
              <paper-tab name="status">Status</paper-tab>
            </paper-tabs>
            <template is="dom-if" if="[[loading]]">
              <paper-progress bottom-item indeterminate></paper-progress>
            </template>
          </app-toolbar>
        </app-header>
        <div class="content">
          <iron-pages role="main" attr-for-selected="name" selected="[[routeData.page]]">
            <arc-status name="status" api-base="[[apiBase]]" loading="{{loading}}"></arc-status>
            <arc-404 name="arc-404"></arc-404>
          </iron-pages>
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
      loading: {type: Boolean}
    };
  }

  static get observers() {
    return [
      '_routePageChanged(routeData.page)'
    ];
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.route.path || this.route.path === '/') {
      this.set('route.path', '/status');
    }
    this.apiBase = window.ApicCiStatus.apiBase;
  }

  _routePageChanged(page) {
    if (!page) {
      this.page = 'status';
    } else if (['status', /*'features',*/ 'community', 'privacy'].indexOf(page) !== -1) {
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
    console.log(page);
    switch (page) {
      case 'status':
        import('./arc-status.js');
        break;
      case 'arc-404':
        import('./arc-404.js');
        break;
    }
    /* global gtag */
    // gtag('config', 'UA-71458341-5', {
    //   'page_path': '/' + page
    // });
  }
}

window.customElements.define('apic-ci-status', ApicCiStatus);
