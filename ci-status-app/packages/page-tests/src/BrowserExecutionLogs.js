import { html, css, LitElement } from 'lit-element';
import { styleMap } from 'lit-html/directives/style-map.js';
import { classMap } from 'lit-html/directives/class-map.js';

export const ITEM_PADDING = 8;

export const createPassingMap = (item) => {
  const indent = item.indent || 0;
  const padding = indent * ITEM_PADDING;
  return {
    paddingLeft: `${padding}px`
  }
};

export const logTemplate = (item) => {
  const { skipped, success, errors, log } = item;
  const styles = createPassingMap(item);
  const symbol = success ? '✓' : '✖';
  const klas = { skipped, error: !success && !skipped, line: true, log: true };
  const hasErrors = !!(errors && errors.length);
  const hasLogs = !hasErrors && !!(log && log.length);
  // assertion error is cleaner that the log message, but not always available.
  return html`
  <div class=${classMap(klas)} style=${styleMap(styles)}>
    ${symbol}
    <div class="title">${item.description}</div>
  </div>
  ${hasLogs ? html`<div class="errors" style=${styleMap(styles)}>
  ${log.map((logItem) => html`<div class="log error-message">${logItem}</div>`)}
  </div>` : ''}
  ${hasErrors ? html`<div class="errors" style=${styleMap(styles)}>
  ${errors.map((error) => html`<div class="log error-message">${error.name}: ${error.message}</div>`)}
  </div>` : ''}`;
};

export const suiteTemplate = (item) => {
  const styles = createPassingMap(item);
  return html`<div class="line suite" style=${styleMap(styles)}>${item.name}</div>`;
};

export const itemTemplate = (item) => {
  switch (item.type) {
    case 'log': return logTemplate(item);
    case 'suite': return suiteTemplate(item);
    default: return '';
  }
};

export class BrowserExecutionLogs extends LitElement {
  static get styles() {
    return css`
    :host {
      display: block;
    }

    .suite {
      font-weight: 500;
    }

    .log {
      display: flex;
      align-items: center;
    }

    .log.skipped {
      color: var(--inactive-color);
    }

    .log.error {
      color: var(--error-color);
    }

    .error-message {
      color: #000000;
      background-color: #FFECB3;
      padding: 0 8px;
      margin-bottom: 8px;
    }
    `;
  }

  static get properties() {
    return {
      /**
       * Execution logs
       */
      logs: { type: Array },
      /**
       * Processed logs to render.
       */
      _items: { type: Array }
    }
  }

  get logs() {
    return this._logs;
  }

  set logs(value) {
    const old = this._logs;
    if (old === value) {
      return;
    }
    this._logs = value;
    this._processLogs(value);
  }

  /**
   * Creates a flat structure for tle logs where suites and logs are placed in order.
   * Each resulted array item is the next line of execution log.
   * @param {Array} value
   * @return {[type]} [description]
   */
  _processLogs(value) {
    if (!value) {
      this._items = null;
      return;
    }
    const result = [];
    /* eslint-disable no-plusplus */
    for (let i = 0, valueLen = value.length; i < valueLen; i++) {
      const item = value[i];
      const { suite } = item;

      let lastIndex = -1;
      let lastIndent = 0;
      for (let j = 0, suiteLen = suite.length; j < suiteLen; j++) {
        const suiteName = suite[j];
        lastIndent = j;

        let index = -1;
        for (let k = 0, resLength = result.length; k < resLength; k++) {
          const suiteItem = result[k];
          if (k >= lastIndex && suiteItem.name === suiteName) {
            index = k;
            break;
          }
        }
        if (index === -1) {
          const model = {
            name: suiteName,
            type: 'suite',
            indent: j
          };
          if (lastIndex === -1) {
            const len = result.push(model);
            lastIndex = len;
          } else {
            result.splice(lastIndex, 0, model);
            lastIndex++;
          }
        }
      }
      result.push({
        type: 'log',
        indent: lastIndent + 1,
        ...item
      });
    }
    this._items = result;
  }

  render() {
    const { _items } = this;
    if (!_items) {
      return '';
    }
    return html`
    ${_items.map((item) => itemTemplate(item))}
    `;
  }
}
