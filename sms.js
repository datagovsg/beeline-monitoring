'use strict';
var accountId = 'ACd475fcf3d7ff94b2721d3a5ca8ace9e8';
var authToken = '8e5a099ba0e491eece0bd56c3cecc619';

var client = require('twilio')(accountId, authToken);
var beeline = require('./beeline');
var mssql = require('mssql');

var months = "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(',');

function pad(n) {
    n = '' + n;
    if (n.length == 1) {
        return '0' + n;
    }
    else {
        return n;
    }
}

module.exports.processNotifications = function (rsid, severity, cause, now) {
    now = new Date(now);
    var dt = /* now.getFullYear() + '-' + */ months[now.getMonth()] + ' ' + pad(now.getDate());
    var message = '' + rsid + ' on ' + dt + '\n' + cause /*+ '\nSeverity: ' + severity*/
                + '\nDetails: http://busadmin.beeline.sg/';
    var theConn;

    if (severity < 3)
        return;

    beeline.getDB()
    .then( (conn) => {
        theConn = conn;
        var req = new mssql.Request(conn);
        req.input('message', mssql.VarChar(140), message);

        return req.query(`
SELECT COUNT(*) AS count
FROM supervisor_notifications
WHERE message = @message
    AND timestamp > dateadd(month, -11, getdate())
`)
    })
    .then( (res) => {
        var req = new mssql.Request(theConn);
        if (res[0].count == 0) {
            req.input('message', mssql.VarChar(140), message);
            req.query(`
INSERT INTO supervisor_notifications
(message) VALUES (@message)
`)
            .then(null, (err) => {console.log(err);});

            req = new mssql.Request(theConn);
            req.input('rsid', mssql.Int, rsid);
            return req.query(`
SELECT telephone
FROM supervisors
WHERE (bus_co_id = 0 OR bus_co_id = @rsid)
    AND telephone IS NOT NULL
    `);
        }
        return null;
    })
    .then( (tels) => {
        if (tels != null) {
            for (var t=0; t<tels.length; t++) {
                if (tels[t].telephone) {
                    client.messages.create({
                        body: message,
                        to: tels[t].telephone,
                        from: '+17472013021',
                    }, (err, msg) => {
                        console.log(err);
                        console.log(msg);
                    });
                }
            }
            // twilio.send message!
        }
    })
    .then(null, (err) => {console.log(err);});

};

