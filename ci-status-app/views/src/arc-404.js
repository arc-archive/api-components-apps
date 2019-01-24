import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';

class Arc404 extends PolymerElement {
  static get template() {
    return html`
      <style>
      :host {
        display: block;
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

      a {
        color: currentColor;
      }
      </style>
      <header>
        <a href="#/">
          <paper-icon-button icon="apic:arrow-back" title="Return to tests list"></paper-icon-button>
        </a>
        <h1>404</h1>
      </header>
      Oops you hit a 404. The page cannot be found.
    `;
  }
}

window.customElements.define('arc-404', Arc404);
