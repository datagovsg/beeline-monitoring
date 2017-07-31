const path = require('path')
const webpack = require('webpack')

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
        rules: [
            {
                test: /\.vue$/,
                loader: 'vue-loader',
                query: {
                    loaders: {
                        js: 'babel-loader',
                    },
                },
            },
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.scss$/,
                loaders: [
                  'vue-style-loader',
                  'css-loader',
                  'sass-loader',
                ],
                include: [
                    path.resolve(__dirname, 'node_modules'),
                    path.resolve(__dirname, 'node_modules/mdi/scss'),
                ],
            },
            {
              test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
              loader: 'url-loader',
              query: {
                limit: 10000,
                name: 'img/[name].[hash:7].[ext]'
              }
            },
            {
              test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
              loader: 'url-loader',
              query: {
                limit: 10000,
                name: 'fonts/[name].[hash:7].[ext]'
              }
            }
        ]
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: '"production"'
        }
      }),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false
        }
      }),
    ]
}
