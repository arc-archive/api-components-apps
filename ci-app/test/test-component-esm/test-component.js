import {PolymerElement} from '../../@polymer/polymer/polymer-element.js';
import {html} from '../../@polymer/polymer/lib/utils/html-tag.js';

/**
 * This is test component.
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 * @memberof ApiElements
 * @appliesMixin ApiElements.AmfHelperMixin
 */
class TestComponent extends PolymerElement {
  static get is() {
    return 'test-component';
  }
  static get template() {
    return html`<style></style>
    <h1>Test</h1>`;
  }
}
window.customElements.define(TestComponent.is, TestComponent);
