const process = require('process')

process.env.BACKEND_URL='https://monitoring-api.beeline.sg'

require('./generate-env.js')
.then(() => {
  require('webpack/bin/webpack')
})
