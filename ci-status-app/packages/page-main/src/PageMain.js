import { html, css, LitElement } from 'lit-element';
import { headersStyles } from '../../common-styles.js';


export class PageMain extends LitElement {
  static get styles() {
    return [
      headersStyles,
      css`
      :host {
        display: block;
      }
    `];
  }

  render() {
    return html`
      <h2>API Components status</h2>
      <p>
        This set of applications renders CI status of API Components.
      </p>

      <p>
        The <b>Tests</b> application allows to schedule components test.<br/>
        It performs tests against specific branch of AMF parser or it performs
        "bottom-up" tests for a specific component.
      </p>

      <p>
        The <b>Change log</b> application allows to browse components change log.
      </p>
    `;
  }
}
