#!/bin/sh

if [ "$BACKEND_URL" = "" ]
then
  export BACKEND_URL=https://api.beeline.sg
fi

echo $BACKEND_URL

echo """
var fs = require('fs')
var request = require('request')

request.get(\`\${process.env.BACKEND_URL}/auth/credentials\`, (err, response, body) => {
  var json = JSON.parse(body);

  console.log(json);

  fs.writeFileSync('./client/env.json', JSON.stringify({
    BACKEND_URL: process.env.BACKEND_URL,
    AUTH0_CID: json.cid,
    AUTH0_DOMAIN: json.domain,
  }))
})

""" | node
