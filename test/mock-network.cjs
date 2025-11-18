const nock = require('nock')

// Intercept all HTTP/HTTPS requests

// prevent any real network requests
nock.disableNetConnect()

// Catch all gets
nock(/.*/).persist().get(/.*/).reply(uri => [200, '<mocked network response>' + uri])
