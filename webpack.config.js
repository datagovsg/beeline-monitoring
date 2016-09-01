
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
