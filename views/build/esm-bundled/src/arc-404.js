import{PolymerElement,html}from"./apic-ci-status.js";class Arc404 extends PolymerElement{static get template(){return html`
      <style>
        :host {
          display: block;

          padding: 10px 20px;
        }
      </style>

      Oops you hit a 404. <a href="[[rootPath]]">Head back to home.</a>
    `}}window.customElements.define("arc-404",Arc404);