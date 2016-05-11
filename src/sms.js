export var accountId = 'ACd475fcf3d7ff94b2721d3a5ca8ace9e8';
export var authToken = '8e5a099ba0e491eece0bd56c3cecc619';

var client = require('twilio')(accountId, authToken);
var beeline = require('./beeline');
var mssql = require('mssql');

var months = "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(',');

import fs from 'fs'

function pad(n) {
    n = '' + n;
    if (n.length == 1) {
        return '0' + n;
    }
    else {
        return n;
    }
}

export function processNotifications(rsid, description, severity, cause, now) {
    now = now ? new Date(now) : new Date();
    var dt =  pad(now.getDate()) + '-' + months[now.getMonth()];
    var message = cause + '.\nService #' + rsid + ' ' + description + ' on ' + dt
                + '\nCheck details at http://busadmin.beeline.sg/';
    var theConn;
    var from = severity <= 3 ? 'BeelineOps' :
               severity == 4 ? 'BeeCritical' :
                               'BeeEmrgency';

    if (severity < 3) {
        console.log(cause)
        return;
    }


    console.log('processing...' + message);
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
    INNER JOIN route_service
        ON 1=dbo.AdminViewIsAuthorized2(route_service.bus_co_id, supervisors.bus_co_id)
WHERE
    route_service.route_service_id = @rsid
    AND telephone IS NOT NULL
    `);
        }
        return null;
    })
    .then( (tels) => {
        if (tels != null) {
            var sendTime = new Date(new Date().getTime() -
                                new Date().getTimezoneOffset()*60000)
                                .toISOString().substr(11,5);
            for (var t=0; t<tels.length; t++) {
                if (tels[t].telephone) {
                    sendMessage({
                        body: message + ' (Sent at ' + sendTime + ')',
                        to: tels[t].telephone,
                        from: from,
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

export function sendTestMessage() {
    client.messages.create({
        body: 'Hello Beeline!',
        to: '+6581001860',
        from: 'BeelineOps',
    });
};
export function sendMessage(data) {
    client.messages.create(data, (err, msg) => {
        console.log(err);
        console.log(msg);
    });
    try {
        fs.appendFile(
            'smslog.log',
            (new Date().toISOString()) + ' ' + JSON.stringify(data) + '\n');
    } catch (err) {
        console.log(err);
    }
};
export function sendMessageFake(data) {
    console.log(
`To: ${data.to}
From: ${data.from}
Body: ${data.body}`)
};

export async function warnUsers(rsid, message) {
    try {
        var conn = await beeline.getDB()

        // Get route service details
        var req = new mssql.Request(conn);
        req.input('rsid', mssql.Int, rsid);

        var route_service_details = await req.query(`
SELECT
    send_warnings,
    route_service_id
FROM route_service
WHERE
    route_service_id = @rsid
`)

        // Only send warnings for routes with warnings switched on
        if (!route_service_details[0].send_warnings) {
            return;
        }

        // Check whether this message has been sent
        var date = new Date(new Date().getTime() + (8*3600*1000))
                        .toISOString().substr(0,10)
        // construct the notification id
        var notification_id = `${rsid} ${date} Automatic route cancellation`
        // check
        var req = new mssql.Request(conn);
        req.input('message', mssql.VarChar(140), notification_id)
        var similar_notifications = await req.query(`
SELECT COUNT(*) AS count
FROM supervisor_notifications
WHERE message = @message
    AND timestamp > dateadd(month, -11, getdate())
`)
        if (similar_notifications[0].count > 0) {
            return;
        }
        else {
            var req = new mssql.Request(conn);
            req.input('message', mssql.VarChar(140), notification_id)
            await req.query(`
            INSERT INTO supervisor_notifications
            (message) VALUES (@message)
            `)
        }

        // send the message to commuters
        var passengers = await beeline.get_passengers(rsid);
        var phone_numbers = passengers.map(p => p.contact_no)
            .filter(x => x != null)
            .map(x => x.replace(/ /g, ''))
            .filter(pn => /\+65\d{8}/.test(pn));
        
        for (let pn of phone_numbers) {
            sendMessage({
                from: 'Beeline',
                to: pn,
                body: message,
            })
        }
        // send a message to operators for record purposes
        processNotifications(
            rsid,
            `System automated message`,
            3,
            `${message} (${date})`,
            undefined
            )
    }
    catch (error) {
        console.log(error.stack);
    }
}


