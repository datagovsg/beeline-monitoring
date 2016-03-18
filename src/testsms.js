'use strict';
var accountId = 'ACd475fcf3d7ff94b2721d3a5ca8ace9e8';
var authToken = '8e5a099ba0e491eece0bd56c3cecc619';

var client = require('twilio')(accountId, authToken);
var beeline = require('./beeline');
var mssql = require('mssql');

client.messages.create({
    body: 'Hello world!',
    to: '+6581001860',
    from: '+17472013021',
}, (err, msg) => {
    console.log(err);
    console.log(msg);
});
