
module.exports = {
    entry: './client/main.js',
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
//        {
//            test: /\.js$/,
//            loader: 'babel!eslint',
//            exclude: /node_modules/
//        }
        ]
    },
//    vue: {
//        loaders: {
//            js: 'babel!eslint'
//        }
//    },
}

