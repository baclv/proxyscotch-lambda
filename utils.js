class ResponseBuilder {
  constructor(data) {
    this._data = data || {};
    this._success = true;
  }

  error() {
    this._success = false;
    return this;
  }

  build() {
    return {
      success: this._success,
      data: this._data,
    };
  }
}

module.exports = { ResponseBuilder };
