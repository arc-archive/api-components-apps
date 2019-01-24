import {PolymerElement} from '@polymer/polymer/polymer-element.js';

class TestModel extends PolymerElement {
  static get properties() {
    return {
      apiBase: String,
      testId: String,
      loading: {type: Boolean, notify: true},
      apiToken: String,
      result: {type: Object, notify: true}
    };
  }

  static get observers() {
    return [
      '_paramsChanged(apiBase, apiToken, testId)'
    ];
  }

  _paramsChanged() {
    if (this.__paramsDebouncer) {
      return;
    }
    this.__paramsDebouncer = true;
    setTimeout(() => {
      this.__paramsDebouncer = false;
      this.get();
    });
  }
  /**
   * Gets test data from the API.
   * @param {?String} id Test id. If not specified the `testId` property is used instead.
   * @return {Promise<Object>} Promise resulted to
   */
  get(id) {
    if (!id) {
      id = this.testId;
    }
    const {apiBase} = this;
    if (!id || !apiBase) {
      return;
    }
    const url = apiBase + 'tests/' + id;
    return this._request(url)
    .then((data) => {
      if (data) {
        this.result = data;
        return data;
      } else {
        this.result = undefined;
      }
    });
  }

  delete(id) {
    if (!id) {
      id = this.testId;
    }
    const {apiBase} = this;
    if (!id || !apiBase) {
      return;
    }
    const url = apiBase + 'tests/' + id;
    const init = {
      method: 'DELETE',
      credentials: 'include'
    };
    return fetch(url, init)
    .then((response) => {
      if (response.status !== 204) {
        return response.json();
      }
      this.dispatchEvent(new CustomEvent('test-deleted', {
        composed: true,
        bubbles: true,
        detail: {
          id: this.testId
        }
      }));
    })
    .then((resp) => {
      if (resp) {
        throw resp;
      }
    })
    .catch((cause) => {
      this.dispatchEvent(new CustomEvent('error', {
        detail: cause
      }));
      throw cause;
    });
  }

  restart(id) {
    if (!id) {
      id = this.testId;
    }
    const {apiBase} = this;
    if (!id || !apiBase) {
      return;
    }
    const url = apiBase + 'tests/' + id + '/restart';
    const init = {
      method: 'PUT',
      credentials: 'include'
    };
    return fetch(url, init)
    .then((response) => {
      if (response.status !== 204) {
        return response.json();
      }
      this.dispatchEvent(new CustomEvent('test-updated', {
        composed: true,
        bubbles: true,
        detail: {
          id: this.testId
        }
      }));
    })
    .then((resp) => {
      if (resp) {
        throw resp;
      }
    })
    .catch((cause) => {
      this.dispatchEvent(new CustomEvent('error', {
        detail: cause
      }));
      throw cause;
    });
  }

  _request(url, init) {
    let errored;
    let code;
    if (!init) {
      init = {};
    }
    if (this.apiToken) {
      init.headers = [['authorization', 'Bearer ' + this.apiToken]];
    }
    init.credentials = 'include';
    return fetch(url, init)
    .then((response) => {
      const ct = response.headers.get('content-type');
      if (!ct || ct.indexOf('application/json') !== 0) {
        throw new Error('Unable to get test data.');
      }
      errored = !response.ok;
      code = response.status;
      return response.json();
    })
    .then((resource) => {
      if (errored) {
        throw resource;
      }
      return resource;
    })
    .catch((cause) => {
      if (cause instanceof Error) {
        cause = {
          message: cause.message,
          error: true
        };
      }
      cause.code = code;
      this.dispatchEvent(new CustomEvent('error', {
        detail: cause
      }));
      throw cause;
    });
  }
}
window.customElements.define('test-model', TestModel);
