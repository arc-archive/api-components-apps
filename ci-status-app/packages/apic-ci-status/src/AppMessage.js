import { LitElement, html, css } from 'lit-element';
import '@anypoint-web-components/anypoint-button/anypoint-icon-button.js';
import { infoOutline, errorOutline, close, check } from '../../Icons.js';
/**
 * An element that renders error/info message in the UI.
 *
 * ```
 * <app-message type="info">
 *  The token has been created.
 * </app-message>
 * ```
 */
export class AppMessage extends LitElement {
  static get styles() {
    return css`
    :host {
      display: flex;
      flex-direction: row;
      background-color: #F5F7F9;
      border-radius: 3px;
      padding: 12px 24px 12px 12px;
      margin: 12px 0;
    }

    .icon-box {
      margin-right: 12px;
      margin-top: 10px;
    }

    .message-box {
      margin-top: 8px;
      flex: 1;
      word-break: break-all;
      white-space: normal;
    }

    .message-box ::slotted(*) {
      font-size: 16px;
      font-weight: 400;
      line-height: 1.625;
    }

    .icon {
      display: inline-block;
      width: 24px;
      height: 24px;
      fill: currentColor;
    }

    :host([type="info"]) {
      border-left: 4px #3884ff solid;
    }

    :host([type="info"]) .icon-box {
      color: #3884ff;
    }

    :host([type="error"]) {
      border-left: 4px #FF5722 solid;
    }

    :host([type="error"]) .icon-box {
      color: #FF5722;
    }

    :host([type="success"]) {
      border-left: 4px #4CAF50 solid;
    }

    :host([type="success"]) .icon-box {
      color: #4CAF50;
    }
    `;
  }

  static get properties() {
    return {
      /**
       * Type of the message:
       * - error
       * - info
       * - success
       */
      type: { type: String, reflect: true },
      /**
       * When set it won't render close button.
       */
      persistant: { type: Boolean }
    };
  }

  /**
   * An icon to render.
   * The value depends on current type.
   *
   * @return {Object} SVG template result.
   */
  get icon() {
    const { type } = this;
    switch (type) {
      case 'error': return errorOutline;
      case 'success': return check;
      default: return infoOutline;
    }
  }

  constructor() {
    super();
    this.type = 'info';
  }

  _closeHandler() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  render() {
    const { persistant, icon } = this;
    return html`
    <div class="icon-box">
      <span class="icon">${icon}</span>
    </div>
    <div class="message-box">
      <slot></slot>
    </div>
    ${persistant ? '' : html`<anypoint-icon-button
      @click="${this._closeHandler}"
      title="Hide this message"
      aria-label="Activate to hide this message"
    >
      <span class="icon">${close}</span>
    </anypoint-icon-button>`}
    `;
  }
}
