var fs = require('fs')

var env = {
    BACKEND_URL: process.env.BACKEND_URL || 'http://staging.beeline.sg',
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
    AUTH0_CID: process.env.AUTH0_CID,
}
fs.writeFileSync(`${__dirname}/client/env.json`, JSON.stringify(env))

module.exports = {
    entry: './client/main.js',
    devtool: 'sourcemap',
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
                query: {
                    presets: ['es2015'],
                    plugins: ['transform-runtime'],
                },
                exclude: /node_modules/
            }
        ]
    },
    vue: {
        loaders: {
            js: 'babel',
        },
    },
}

