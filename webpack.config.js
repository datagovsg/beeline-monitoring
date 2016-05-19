
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

