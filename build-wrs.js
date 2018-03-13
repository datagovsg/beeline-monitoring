const process = require('process')

process.env.BACKEND_URL='https://api-admin.beeline.sg'
process.env.TRACKING_URL='https://tracking.beeline.sg'
process.env.NODE_ENV='production'

require('./generate-env.js')
.then(() => {
  require('webpack/bin/webpack')
})
