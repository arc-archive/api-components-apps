export class TestComponent extends HTMLElement {
  get readonly() {
    return this._readonly || false;
  }
  set readonly(value) {
    this._readonly = value;
  }
}
window.customElements.define('test-component', TestComponent);
