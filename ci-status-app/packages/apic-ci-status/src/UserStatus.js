export class UserStatus {
  /**
   * @param {String} apiBase API base URI.
   */
  constructor(apiBase) {
    this.apiBase = apiBase;
  }

  reset() {
    this.user = null;
    this.loggedIn = false;
  }

  getUser() {
    if (this.user) {
      return Promise.resolve(this.user);
    }
    if (this.__tokenRequest) {
      return this.__tokenRequest;
    }
    this.__tokenRequest = new Promise((resolve, reject) => {
      this._getUser()
      .then((user) => {
        setTimeout(() => {
          this.__tokenRequest = null;
          resolve(user)
        });
      })
      .catch((e) => {
        this.__tokenRequest = null;
        reject(e);
      });
    });
    return this.__tokenRequest;
  }

  async _getUser() {
    const url = `${this.apiBase}me`;
    const init = {
      credentials: 'include'
    };
    const response = await fetch(url, init);
    if (!response.ok) {
      this.reset();
      return null;
    }
    const data = await response.json();
    if (!data || !data.loggedIn) {
      this.reset();
    } else {
      this.user = data;
      this.loggedIn = true;
    }
    return this.user;
  }
}
