const nock = require('nock')

// Intercept all HTTP/HTTPS requests

// prevent any real network requests
nock.disableNetConnect()

// Catch all gets
nock(/.*/).persist().get(/.*/)
  .reply(function () { return [200, '<mocked network response>' + this.req.options.href] })
