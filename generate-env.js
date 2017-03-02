const process = require('process');

if (!process.env.BACKEND_URL) {
  process.env.BACKEND_URL='https://monitoring-api.beeline.sg'
}

console.log(process.env.BACKEND_URL)

var fs = require('fs')
var request = require('request')

module.exports = new Promise((resolve, reject) => {
  request.get(`${process.env.BACKEND_URL}/auth/credentials`, (err, response, body) => {
    if (err) {
      return reject(err);
    } else {
      var json = JSON.parse(body);

      console.log(json);

      fs.writeFileSync('./client/env.json', JSON.stringify({
        BACKEND_URL: process.env.BACKEND_URL,
        AUTH0_CID: json.cid,
        AUTH0_DOMAIN: json.domain,
      }))

      resolve();
    }
  })

})
