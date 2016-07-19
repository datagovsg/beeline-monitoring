var fs = require('fs')

var env = {
    BACKEND_URL: process.env.BACKEND_URL || 'https://api.beeline.sg',
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || 'beeline.au.auth0.com',
    AUTH0_CID: process.env.AUTH0_CID || 'BslsfnrdKMedsmr9GYkTv7ejJPReMgcE',
}
fs.writeFileSync(`${__dirname}/client/env.json`, JSON.stringify(env))

module.exports = {
    entry: [
        'babel-polyfill',
        './client/main.js',
    ],
    output: {
        path: __dirname + '/static',
        filename: 'bundle.js',
    },
    module: {
        loaders: [
            {
                test: /\.json$/,
                loader: 'json',
            },
            {
                test: /\.vue$/,
                loader: 'vue',
            },
            {
                test: /\.js$/,
                loader: 'babel',
                exclude: /node_modules/
            }
        ]
    },
    vue: {
        loaders: {
            js: 'babel',
        },
        html: {
            attrs: false,
        }
    },
    babel: {
        presets: ['es2015', 'stage-3']
    }
}
