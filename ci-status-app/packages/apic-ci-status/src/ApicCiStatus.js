import { LitElement, html, css } from 'lit-element';
import { routerMixin, routerLinkMixin } from 'lit-element-router/router-mixin/router-mixin.js';
import '@anypoint-web-components/anypoint-listbox/anypoint-listbox.js';
import '@anypoint-web-components/anypoint-item/anypoint-item.js';
import '@anypoint-web-components/anypoint-item/anypoint-icon-item.js';
import '@anypoint-web-components/anypoint-button/anypoint-button.js';
import '@anypoint-web-components/anypoint-menu-button/anypoint-menu-button.js';
import '@anypoint-web-components/anypoint-button/anypoint-icon-button.js';
import '@anypoint-web-components/anypoint-styles/colors.js';

import { UserStatus } from './UserStatus.js';
import { userImageTemplate, userIconTemplate } from './utils.js';
import { baseStyles } from '../../common-styles.js';
import { menu, assignmentTurnedIn, list, grain, build } from '../../Icons.js';
import '../../page-main/page-main.js';
import '../../page-tokens/page-tokens.js';
import '../../page-tokens/page-add-token.js';
import '../../page-changelog/page-changelog.js';
import '../../page-tests/page-tests.js';
import '../../page-tests/page-test.js';
import '../../page-tests/page-test-component.js';
import '../../page-tests/page-add-test.js';
import '../../page-dependency/page-dependency.js';
import '../../page-builds/page-builds.js';
import '../../page-builds/page-add-build.js';
import '../../page-builds/page-build.js';

const defaultTitle = 'API Components status';
const gaId = 'UA-71458341-7';

const appLogoTemplate = () => {
  return html`<a href="/intro" class="main-link">
    <img src="images/arc-icon.png" class="app-icon" alt="ARC logo" />
  </a>`;
}

/* global gtag */

export class ApicCiStatus extends routerLinkMixin(routerMixin(LitElement)) {
  static get routes() {
    return [
      {
        name: 'intro',
        pattern: '/(intro)?',
        data: { title: defaultTitle },
      },
      {
        name: 'tokens',
        pattern: '/tokens',
        data: { title: 'API tokens' },
      },
      {
        name: 'add-token',
        pattern: '/tokens/add',
        data: { title: 'Create API token' },
      },
      {
        name: 'changelog',
        pattern: '/changelog',
        data: { title: 'Changelog' },
      },
      {
        name: 'tests',
        pattern: '/tests',
        data: { title: 'Scheduled tests' },
      },
      {
        name: 'add-test',
        pattern: '/tests/add',
        data: { title: 'Schedule a test' },
      },
      {
        name: 'test',
        pattern: '/tests/:id',
        data: { title: 'Scheduled test' },
      },
      {
        name: 'test-component',
        pattern: '/tests/:id/:cmp',
        data: { title: 'Test component detail' },
      },
      {
        name: 'dependency',
        pattern: '/dependency',
        data: { title: 'Dependency graph' },
      },
      {
        name: 'builds',
        pattern: '/builds',
        data: { title: 'Scheduled builds' },
      },
      {
        name: 'add-build',
        pattern: '/builds/add',
        data: { title: 'Add a build' },
      },
      {
        name: 'build',
        pattern: '/builds/:id',
        data: { title: 'Component build' },
      },
      {
        name: 'not-found',
        pattern: '*',
        data: { title: defaultTitle },
      },
    ];
  }

  static get properties() {
    return {
      /**
       * A currently rendered page
       */
      page: { type: String },
      /**
       * API base URI
       */
      apiBase: { type: String },
      /**
       * True when application loads some data from the server.
       */
      loading: { type: Boolean },
      /**
       * Current page title
       */
      title: { type: String },
      /**
       * An API token to use to authenticate API requests.
       *
       * Cureently it is not in use. There's no model to
       * retreive valid session token from the server and refresh it
       * when expired.
       * Currently the application is API server session based, meaning a
       * valid session cookie must be present.
       *
       * @todo (pawel): base API calls on session token.
       * The token should be generated by the application when
       * the user logs in with expiration time sat to an hour (?).
       * The application should receive this tokne with `/me` request and
       * use it for authorization instead of cookies. In this case `credentials`
       * property should be removed from `fetch` configuration.
       */
      apiToken: { type: String },
      /**
       * Current route parameters, if any
       */
      params: { type: Object },
      /**
       * True when navigation is opened.
       */
      navigationOpened: { type: Boolean, reflect: true },
      /**
       * When true it renders mobile friendly view.
       */
      narrow: { type: Boolean, reflect: true },
    };
  }

  get authReturn() {
    const rtn = encodeURIComponent(window.location.href);
    const base = this.apiBase.replace('/v1/', '');
    const url = `${base}/auth/login?return=${rtn}`;
    return url;
  }

  get logoutReturn() {
    const rtn = encodeURIComponent(window.location.href);
    const base = this.apiBase.replace('/v1/', '');
    const url = `${base}/auth/logout?logout=${rtn}`;
    return url;
  }

  constructor() {
    super();
    this.page = 'main';
    this.apiBase = window.ApicCiStatus.apiBase;

    this.userStatus = new UserStatus(this.apiBase);
    this._clickHandler = this._clickHandler.bind(this);
    this._mobileMatchHandler = this._mobileMatchHandler.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this._clickHandler);
    this.loadUserState();
    this.initializeMediaQueries();
  }

  async loadUserState() {
    try {
      await this.userStatus.getUser();
    } catch (e) {
      // ..
    }
    this.requestUpdate();
  }

  _clickHandler(e) {
    if (!e.composed) {
      return;
    }
    const path = e.composedPath();
    const anhor = path.find((node) => node.nodeName === 'A');
    if (!anhor) {
      return;
    }
    const href = anhor.getAttribute('href');
    if (!href) {
      return;
    }
    if (anhor.href.indexOf(window.location.host) !== 0) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    this.navigate(href);
  }

  __clickPageLink(ev) {
    ev.preventDefault();
    let { target } = ev;
    if (target.localName === 'anypoint-icon-item') {
      target = Array.from(target.children).find((item) => item.nodeName === 'A')
    }
    if (!target || !target.href) {
      return;
    }
    this.navigate(target.href);
  }

  __keydownPageLink(e) {
    if (['Space', 'Enter'].indexOf(e.code) === -1) {
      return;
    }
    this.__clickPageLink(e);
  }

  onRoute(route, params, query, data) {
    const routeData = data || {};
    const title = routeData.title || defaultTitle;
    let finalRoute;
    if (route === '/') {
      finalRoute = 'intro';
    } else {
      finalRoute = route;
    }
    this.title = title;
    this.page = finalRoute;
    this.params = params;
    document.head.querySelector('title').innerText = title;
    if (!this.__gaRouteInitialized) {
      // prohibits sending pageview when initializing
      this.__gaRouteInitialized = true;
      return;
    }
    gtag('config', gaId, { page_path: `/${route}` });
  }

  _closeDrawer() {
    this.navigationOpened = false;
  }

  _toggleNavigation() {
    this.navigationOpened = !this.navigationOpened;
  }

  /**
   * Initializes variables related to viewport suuport.
   */
  initializeMediaQueries() {
    this._mQmobile = window.matchMedia('(max-width: 800px)');
    this._mQmobile.addEventListener('change', this._mobileMatchHandler);
    this.narrow = this._mQmobile.matches;
  }

  /**
   * A handler called when mobile media query event has been dispatched
   * @param {MediaQueryListEvent} e
   */
  _mobileMatchHandler(e) {
    this.narrow = e.matches;
  }

  _renderPage() {
    switch (this.page) {
      case 'intro':
        return html`
          <page-main></page-main>
        `;
      case 'tokens':
        return html`
          <page-tokens
            .userStatus="${this.userStatus}"
            .apiBase="${this.apiBase}"
            .apiToken="${this.apiToken}"
          ></page-tokens>
        `;
      case 'add-token':
        return html`
          <page-add-token
            .userStatus="${this.userStatus}"
            .apiBase="${this.apiBase}"
            .apiToken="${this.apiToken}"
            .narrow="${this.narrow}"
          ></page-add-token>
        `;
      case 'changelog':
        return html`
          <page-changelog
            .apiBase="${this.apiBase}"
            .apiToken="${this.apiToken}"
          ></page-changelog>
        `;
      case 'tests':
        return html`
          <page-tests
            .apiBase="${this.apiBase}"
            .apiToken="${this.apiToken}"
            .userStatus="${this.userStatus}"
          ></page-tests>
        `;
      case 'test':
        return html`
          <page-test
            .apiBase="${this.apiBase}"
            .apiToken="${this.apiToken}"
            .userStatus="${this.userStatus}"
            .testId="${this.params.id}"
          ></page-test>
        `;
      case 'add-test':
        return html`
          <page-add-test
            .apiBase="${this.apiBase}"
            .apiToken="${this.apiToken}"
            .userStatus="${this.userStatus}"
          ></page-add-test>
        `;
      case 'test-component':
        return html`
          <page-test-component
            .apiBase="${this.apiBase}"
            .apiToken="${this.apiToken}"
            .userStatus="${this.userStatus}"
            .testId="${this.params.id}"
            .componentId="${this.params.cmp}"
            .narrow="${this.narrow}"
          ></page-test-component>
        `;
      case 'dependency':
        return html`
          <page-dependency
            .apiBase="${this.apiBase}"
            .apiToken="${this.apiToken}"
          ></page-dependency>
        `;
      case 'builds':
        return html`
          <page-builds
            .apiBase="${this.apiBase}"
            .apiToken="${this.apiToken}"
            .userStatus="${this.userStatus}"
          ></page-builds>
        `;
      case 'add-build':
        return html`<page-add-build
          .apiBase="${this.apiBase}"
          .apiToken="${this.apiToken}"
          .userStatus="${this.userStatus}"
        ></page-add-build>`;
      case 'build':
        return html`
          <page-build
            .apiBase="${this.apiBase}"
            .apiToken="${this.apiToken}"
            .userStatus="${this.userStatus}"
            .buildId="${this.params.id}"
          ></page-build>
        `;
      default:
        return html`
          <p>Page not found try going to <a href="/">Main</a></p>
        `;
    }
  }

  render() {
    const { userStatus, title, narrow } = this;
    return html`
      <header>
        ${this._navToggleTemplate()}
        ${narrow ? '' : appLogoTemplate()}
        <h1>${title}</h1>
        ${userStatus.loggedIn ? this._userHeaderTemplate() : this._logInTemplate()}
      </header>
      <div class="content">
        ${this._navigationDrawerTemplate()}
        <main>
          ${this._renderPage()}
        </main>
      </div>
    `;
  }

  _navToggleTemplate() {
    const { narrow } = this;
    if (!narrow) {
      return '';
    }
    return html`<anypoint-icon-button
      slot="dropdown-trigger"
      aria-label="Activate to open application menu"
      @click="${this._toggleNavigation}"
    >
      <span class="icon">${menu}</span>
    </anypoint-icon-button>`;
  }

  _logInTemplate() {
    const { authReturn } = this;
    return html`
    <a href="${authReturn}" class="log-in-btn">
      <anypoint-button>Log in</anypoint-button>
    </a>
    `;
  }

  _userHeaderTemplate() {
    const { userStatus, logoutReturn } = this;
    const img = userStatus.user && userStatus.user.imageUrl;
    return html`
    <anypoint-menu-button horizontalalign="right">
      <anypoint-icon-button
        slot="dropdown-trigger"
        aria-label="Activate to open user menu"
        aria-haspopup="true"
        aria-controls="userMenu"
      >
        ${img ? userImageTemplate(img) : userIconTemplate()}
      </anypoint-icon-button>
      <anypoint-listbox
        slot="dropdown-content"
        class="user-menu"
        role="menu"
        aria-label="User menu"
        id="userMenu"
      >
        <a role="menuitem" href="/tokens">
          <anypoint-item>Tokens</anypoint-item>
        </a>
        <a role="menuitem" href="${logoutReturn}">
          <anypoint-item>Log out</anypoint-item>
        </a>
      </anypoint-listbox>
    </anypoint-menu-button>
    `;
  }

  _navigationDrawerTemplate() {
    const { page, navigationOpened, narrow } = this;
    return html`
    ${navigationOpened ? html`<div class="nav-scrim" @click="${this._closeDrawer}"></div>` : ''}
    <nav class="nav-drawer">
      ${narrow ? appLogoTemplate() : ''}
      <anypoint-listbox role="menu" .selected="${page}" attrforselected="route">
        ${this._navTemplate()}
      </anypoint-listbox>
    </nav>`;
  }

  _navTemplate() {
    const states = [
      ['/tests', 'tests', 'Tests', 'Activate for list of tests', assignmentTurnedIn],
      ['/builds', 'builds', 'Builds', 'Activate for build status', build],
      ['/changelog', 'changelog', 'Change log', 'Activate for components change log', list],
      ['/dependency', 'dependency', 'Dependency graph', 'Activate for dependency graph', grain],
    ];

    return states.map(
      ([href, route, label, ariaLabel, icon]) => html`
        <anypoint-icon-item
          role="none"
          @click="${this.__clickPageLink}"
          @keydown="${this.__keydownPageLink}"
          route="${route}"
        >
          <span slot="item-icon" class="nav-icon icon">${icon}</span>
          <a href="${href}" tabindex="-1" role="menuitem" aria-label="${ariaLabel}">
            ${label}
          </a>
        </anypoint-icon-item>
      `,
    );
  }

  static get styles() {
    return [
      baseStyles,
      css`
        :host {
          min-height: 100vh;
          --dark-divider-opacity: 0.12;
          display: flex;
          flex-direction: column;

          --anypoiont-dropdown-shaddow: 0 4px 5px 0 rgba(0, 0, 0, 0.14),
            0 1px 10px 0 rgba(0, 0, 0, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.4);
        }

        a {
          text-decoration: none;
          color: inherit;
          outline: none;
        }

        a[role='menuitem'] {
          font-size: 0.85rem;
        }

        header {
          padding: 12px 24px;
          background-color: var(--header-background-color);
          height: 72px;
          color: var(--header-color);
          display: flex;
          align-items: center;
        }

        :host([narrow]) header {
          padding: 12px 0;
        }

        header h1 {
          font-size: 24px;
          font-weight: 400;
          letter-spacing: -0.012em;
          line-height: 32px;
          flex: 1;
        }

        .content {
          display: flex;
          align-items: stretch;
          flex-direction: row;
          flex: 1;
        }

        nav anypoint-listbox[role='menu'] {
          margin-right: 12px;
          height: 100%;
        }

        nav anypoint-listbox[role='menu'] anypoint-icon-item {
          min-height: 40px;
          font-weight: 400;
        }

        nav anypoint-listbox[role='menu'] anypoint-icon-item.selected {
          color: var(--primary-color);
          font-weight: 500;
        }

        main {
          max-width: 1440px;
          background-color: var(--page-background-color);
          padding: 0 40px 20px 40px;
          flex: 1;
        }

        :host([narrow]) main {
          flex: auto;
          max-width: auto;
          padding: 0 12px 20px 12px;
          margin: 0;
        }

        .app-icon {
          width: 64px;
          height: 64px;
        }

        .user-icon {
          width: 24px;
          height: 24px;
          display: inline-block;
          border-radius: 50%;
          overflow: hidden;
        }

        .user-menu {
          /* background-color: #fff; */
        }

        .nav-drawer {
          width: var(--app-drawer-width, 256px);
          display: block;
          background-color: var(--app-drawer-background-color);
        }

        :host([narrow]) .nav-drawer {
          transform: translateX(-100%);
          left: 0;
          top: 0;
          bottom: 0;
          transition: transform 0.3s cubic-bezier(0.74, 0.03, 0.3, 0.97);
          transform-origin: top right;
          height: 100%;
          position: absolute;
          z-index: 5;
        }

        :host([navigationopened]) .nav-drawer {
          transform: translateX(0);
          box-shadow: var(--anypoiont-dropdown-shaddow);
        }

        .nav-scrim {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          height: 100%;
          position: absolute;
          z-index: 4;
          transition-property: opacity;
          -webkit-transform: translateZ(0);
          transform:  translateZ(0);
          opacity: 0;
          background: var(--app-drawer-scrim-background, rgba(0, 0, 0, 0.5));
        }

        :host([navigationopened]) .nav-scrim {
          opacity: 1;
        }
      `,
    ];
  }
}
