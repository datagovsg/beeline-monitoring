#!/bin/sh

nodejs node_modules/nodemon/bin/nodemon.js -i 'static/' -i webpack.config.js operator_tool.js
