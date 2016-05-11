// var require, module, exports;

var mssql = require('mssql');
var proj4 = require('proj4');
var sms = require('./sms');

proj4.defs([
    ['epsg:3414',
     '+proj=tmerc +lat_0=1.366666666666667 +lon_0=103.8333333333333 +k=1 +x_0=28001.642 +y_0=38744.572 +ellps=WGS84 +units=m +no_defs '],
]);

var toSVY = proj4('epsg:3414').forward;
var toLatLng = proj4('epsg:3414').inverse;

function identity(v) {
    return v;
}
function errHandler(err) {
    console.log(err.stack);
}

module.exports.getDB = async function () {
    return await mssql.connect({
        user: 'readonly',
        password: 'hahareadonly',
        server: 'beelinerds.ctauntrumctz.ap-southeast-1.rds.amazonaws.com',
        database: 'beeline',
    });
}

module.exports.getUserCompanies = async function (email) {
    var conn = await exports.getDB();
    var req = new mssql.Request(conn);
    req.input('email', mssql.VarChar(100), email);
    
    var bcids = await req.query(`
SELECT bus_co_id
FROM supervisors
WHERE email = @email
    `);

    return bcids.map((x) => {return x.bus_co_id;});
}
module.exports.getAuthorizedUsers = async function () {
    var conn = await exports.getDB();

    var req = new mssql.Request(conn);

    return await req.query(`
SELECT *
FROM supervisors
    `);
}

module.exports.get_pings = function (svc, date/*? : Date*/)  {
    date = date || new Date();
    return exports.getDB()
    .then((conn) => {
        var req = new mssql.Request(conn);
        var localDate = (new Date( date.getTime() -
                                   date.getTimezoneOffset()*60000 ));

        req.input('svc', mssql.Int, svc);
        req.input('current_date', mssql.DateTime, localDate);
        return req.query(`
SELECT
    Locations.*
FROM Locations
    INNER JOIN route_service rs ON
        rs.route_service_id = Locations.service
WHERE
    1 = dbo.SameDayAs(timestamp, @current_date)
    AND rs.route_service_id = @svc
ORDER BY
    id ASC
        `)
    })
};

module.exports.lastPings = function (conn, today/*? : Date*/)  {
    today = today || new Date();
    var req = new mssql.Request(conn);
    var localDate = (new Date( today.getTime() -
                               today.getTimezoneOffset()*60000 ));

    req.input('current_date', mssql.DateTime, localDate);
    return req.query(`
WITH rned AS (
SELECT
    ROW_NUMBER() OVER (PARTITION BY Locations.service
                ORDER BY id DESC) AS rn,
    Locations.*
FROM Locations
    INNER JOIN route_service rs ON
        rs.route_service_id = Locations.service
    INNER JOIN bus_company ON
        bus_company.bus_co_id = rs.bus_co_id
WHERE
    1 = dbo.SameDayAs(timestamp, @current_date)
    AND rs.start_date <= dateadd(minute, 23*60 + 59, @current_date)
    AND @current_date <= dateadd(minute, 23*60 + 59, rs.end_date)
)
SELECT * FROM rned
    `)
};

module.exports.services = function (conn, today/*? : Date*/) {
    today = today || new Date();
    var req = new mssql.Request(conn);
    var localDate = (new Date( today.getTime() -
                               today.getTimezoneOffset()*60000 ));

    req.input('current_date', mssql.DateTime, localDate);
    return req.query(`
SELECT
    route_service.route_service_id,
    route_service.bus_co_id,
    stop.latitude,
    stop.longitude,
    stop.name,
    rsst.time,
    route_stop.is_boarding,
    route.from_name, route.to_name, route_service.service_name, --FIXME why u waste bandwidth?
    ROW_NUMBER() OVER (PARTITION BY route_service.route_service_id ORDER BY rsst.time ASC) AS stop_no,
    COALESCE(count_booked.num_booked, 0) as num_booked
FROM route_service 
    INNER JOIN route ON route_service.route_id = route.route_id
    INNER JOIN route_stop ON route.route_id = route_stop.route_id
    INNER JOIN stop ON route_stop.stop_id = stop.stop_id
    INNER JOIN route_service_stop_time rsst ON
            rsst.stop_id = stop.stop_id AND
            rsst.route_id = route.route_id AND
            rsst.route_service_id = route_service.route_service_id
    LEFT JOIN (SELECT route_service_id,
                      rsst_id_board AS rsst_id,
                      COUNT(*) as num_booked FROM booking
                WHERE CHARINDEX(CONVERT(varchar(8), @current_date, 112), dates) <> 0
                    AND status = 'PAID'
                GROUP BY route_service_id, rsst_id_board
                UNION 
                SELECT route_service_id, rsst_id_alight AS rsst_id, COUNT(*) as num_booked FROM booking
                WHERE CHARINDEX(CONVERT(varchar(8), @current_date, 112), dates) <> 0
                    AND status = 'PAID'
                GROUP BY route_service_id, rsst_id_alight

                ) AS count_booked ON
                rsst.route_service_id = count_booked.route_service_id AND
                rsst.rsst_id = count_booked.rsst_id
WHERE
    route_service.start_date <= dateadd(minute, 23*60 + 59, @current_date)
    AND @current_date <= dateadd(minute, 23*60 + 59, route_service.end_date)
ORDER BY
    route_service.route_service_id,
    rsst.time ASC
    `)
};

module.exports.get_passengers = function(service) {
    return exports.getDB()
    .then((conn) => {
        var req = new mssql.Request(conn);
        var localDate = (new Date( (new Date()).getTime() -
                                   (new Date()).getTimezoneOffset()*60000 ));

        req.input('current_date', mssql.DateTime, localDate);
        req.input('service', mssql.Int, service);

        return req.query(`
-- boarding passengers
SELECT
    rsst.route_service_id,
    rsst.rsst_id as rsst_id_board,
    route_stop.is_boarding,
    stop.name AS stop_name,
    rsst.time,
    [user].[name],
    [user].email,
    [user].contact_no,
    route_service.bus_co_id
FROM
    ( (SELECT * FROM booking AS b WHERE
            route_service_id = @service AND
            (CHARINDEX(CONVERT(VARCHAR(8), @current_date, 112), b.dates) <> 0) AND
            b.status = 'PAID') AS booking
    INNER JOIN [user] ON [user].email = booking.user_email)
    RIGHT JOIN (route_service_stop_time rsst
    INNER JOIN route_service ON rsst.route_service_id = route_service.route_service_id
    INNER JOIN route_stop ON route_stop.route_id = rsst.route_id AND route_stop.stop_id = rsst.stop_id
    INNER JOIN stop ON stop.stop_id = rsst.stop_id)  ON rsst.rsst_id = booking.rsst_id_board
WHERE
    rsst.route_service_id = @service
ORDER BY
    rsst.route_service_id,
    rsst.time
        `)
    });
};

/*
interface IPollReturn {
    serviceData: any,
    date: Date,
};*/
export async function poll() /* : Promise<IPollReturn> */ {
    var db = await module.exports.getDB();
    var today = new Date();

    var res = await Promise.all([
                module.exports.lastPings(db, today),
                module.exports.services(db, today)]);
    var pings = res[0];
    var svcs = res[1];

    var svcs_dict = {};

    for (var i=0; i<svcs.length; i++) {
        var stop = svcs[i];
        svcs_dict[svcs[i].route_service_id] =
            svcs_dict[svcs[i].route_service_id] || {
                stops: [],
                route_service_id: svcs[i].route_service_id,
                last_ping: undefined,
                first_ping: undefined,
            };

        var svc = svcs_dict[svcs[i].route_service_id];
        svc.stops.push(stop);

        stop.xy = toSVY([stop.longitude, stop.latitude]);

        stop.windowStart = new Date(today.getTime());
        stop.windowStart.setHours  (parseInt(stop.time.substr(0,2)));
        stop.windowStart.setMinutes(parseInt(stop.time.substr(2,4)) - 10);
        stop.windowStart.setSeconds(0);

        stop.windowEnd = new Date(today.getTime());
        stop.windowEnd.setHours  (parseInt(stop.time.substr(0,2)));
        stop.windowEnd.setMinutes(parseInt(stop.time.substr(2,4)) + 30);
        stop.windowEnd.setSeconds(0);
    }
    
    var tzo = today.getTimezoneOffset() * 60000;
    
    for (var i=0; i<pings.length; i++) {
        // FIX all the pings
        // Since they have been saved with the timezone offset =(
        pings[i].timestamp = new Date(pings[i].timestamp.getTime() + tzo);

        // find distance to stops in SVC
        var rsid = pings[i].service;
        var xy = toSVY([pings[i].longitude, pings[i].latitude]);

        for (var j=0; j<svcs_dict[rsid].stops.length; j++) {
            var stop = svcs_dict[rsid].stops[j];
            var distance = Math.sqrt(
                (stop.xy[0] - xy[0])*(stop.xy[0] - xy[0]) +
                (stop.xy[1] - xy[1])*(stop.xy[1] - xy[1])
            );

            if (distance <= 120) {
                if ((typeof(stop.last_ping) == 'undefined' ||
                     stop.last_ping.timestamp < pings[i].timestamp)) {

                    /* consider bus to be already in position */
                    stop.last_ping = pings[i];
                    stop.last_ping.distance = distance;
                }

                if ((typeof(stop.first_ping) == 'undefined' ||
                     stop.first_ping.timestamp > pings[i].timestamp)) {

                    /* consider bus to be already in position */
                    stop.first_ping = pings[i];
                    stop.first_ping.distance = distance;
                }

                var inWindow = stop.windowStart <= pings[i].timestamp && pings[i].timestamp <= stop.windowEnd;

                if (inWindow) {
                    if ((typeof(stop.last_ping_window) == 'undefined' ||
                         stop.last_ping_window.timestamp < pings[i].timestamp)) {

                        /* consider bus to be already in position */
                        stop.last_ping_window = pings[i];
                        stop.last_ping_window.distance = distance;
                    }

                    if ((typeof(stop.first_ping_window) == 'undefined' ||
                         stop.first_ping_window.timestamp > pings[i].timestamp)) {

                        /* consider bus to be already in position */
                        stop.first_ping_window = pings[i];
                        stop.first_ping_window.distance = distance;
                    }
                }
            }

            if (j == 0) {
                if (typeof(svcs_dict[rsid].last_ping) == 'undefined' ||
                    svcs_dict[rsid].last_ping.timestamp < pings[i].timestamp) {
                    svcs_dict[rsid].last_ping = pings[i];
                    svcs_dict[rsid].last_ping.distance = distance;
                }
                if (typeof(svcs_dict[rsid].first_ping) == 'undefined' ||
                    svcs_dict[rsid].first_ping.timestamp > pings[i].timestamp) {
                    svcs_dict[rsid].first_ping = pings[i];
                    svcs_dict[rsid].first_ping.distance = distance;
                }
            }
        }

    }

    return /*<IPollReturn> */ {
        serviceData: svcs_dict,
        date: today,
    };
};

module.exports.get_stops = function (service) {
    return exports.getDB().then((conn) => {
        var req = new mssql.Request(conn);

        req.input('svc', mssql.Int, service);
        return req.query(`
SELECT
    route_service.route_service_id,
    route_service.bus_co_id,
    stop.latitude,
    stop.longitude,
    stop.name,
    rsst.time,
    rsst.rsst_id,
    route_stop.is_boarding,
    route.from_name, route.to_name, route_service.service_name, --FIXME why u waste bandwidth?
    ROW_NUMBER() OVER (PARTITION BY route_service.route_service_id ORDER BY rsst.time ASC) AS stop_no
FROM route_service 
    INNER JOIN route ON route_service.route_id = route.route_id
    INNER JOIN route_stop ON route.route_id = route_stop.route_id
    INNER JOIN stop ON route_stop.stop_id = stop.stop_id
    INNER JOIN route_service_stop_time rsst ON
            rsst.stop_id = stop.stop_id AND
            rsst.route_id = route.route_id AND
            rsst.route_service_id = route_service.route_service_id
WHERE
    route_service.route_service_id = @svc
ORDER BY
    route_service.route_service_id,
    rsst.time ASC
`);
    })
};

/**** Status computation ****/

function scheduledStopTime(svc, i, date /*: Date*/) {
    if (date) {
        date = new Date(date.getTime());
    }
    else {
        date = svc.last_ping ? new Date(svc.last_ping.timestamp)
                                : new Date();
    }

    date.setHours(parseInt(svc.stops[i].time.substr(0,2)));
    date.setMinutes(parseInt(svc.stops[i].time.substr(2,4)));
    date.setSeconds(0);

    return date;
}

function actualStopArrivalTime(svc, i) {
    i = i || 0;

    if (svc.stops[i].first_ping_window) {
        return new Date(svc.stops[i].first_ping_window.timestamp);
    }
    else {
        return undefined;
    }
}
function actualStopDepartureTime(svc, i) {
    i = i || 0;

    if (svc.stops[i].last_ping_window) {
        return new Date(svc.stops[i].last_ping_window.timestamp);
    }
    else {
        return undefined;
    }
}

function firstPingTime(svc) {
    if (svc.first_ping)
        return new Date(svc.first_ping.timestamp);
    else
        return undefined;
}
function lastPingTime(svc) {
    if (svc.last_ping)
        return new Date(svc.last_ping.timestamp);
    else
        return undefined;
}

/***

Update the status = ∊ [0, 3] ∪ {-1}

svcs.status = {
    ping: status,
    distance: status,
}


**/
module.exports.processStatus = function (pollData /*: IPollReturn*/) {
    var svcs = pollData.serviceData;
    var date = pollData.date;

    for (let rsid of Object.keys(svcs)) {
        let svc = svcs[rsid];

        // Note: we are interested in the first stop with nonzero pickup
        let first_nz = 0;
        for ( ; first_nz < svc.stops.length; first_nz++) {
            if (svc.stops[first_nz].num_booked != 0) {
                break;
            }
        }
        if (first_nz == svc.stops.length) {
            console.log('Service ' + rsid + ' has no passengers');
            first_nz = 0;
            svc.nobody = true;
        }

        let sched0 = scheduledStopTime(svc, 0, date).getTime();
        let sched = scheduledStopTime(svc, first_nz, date).getTime();

        let firstPing = firstPingTime(svc);

        let lastPingDate = lastPingTime(svc)
        let lastPing /*: number*/;
        if (lastPingDate) {
            lastPing = lastPingDate.getTime();
        }

        let actualDeparture /*: number*/,
            actualDepartureDate = actualStopDepartureTime(svc, first_nz);
        if (actualDepartureDate) {
            actualDeparture = actualDepartureDate.getTime();
        }

        let actualArrival /*: number*/,
            actualArrivalDate = actualStopArrivalTime(svc, first_nz);
        if (actualArrivalDate) actualArrival = actualArrivalDate.getTime();

        let now = date.getTime();
        let emerg = svc.last_ping && svc.last_ping.problem && svc.last_ping.problem != '0';

        /* An arrival only counts if the bus driver does not leave the stop
            too early.

            */
        var departure = (actualDeparture - sched > -2 * 60000) ?
                            actualDeparture : undefined;
        var arrival = (actualDeparture - sched > -2 * 60000) ?
                            actualArrival : undefined;

        var distance = svc.last_ping ? 
                svc.last_ping.distance : 0;
        var speed = 35; // km/h
        var ETA = distance ?
                    now + distance / 1000 / speed * 3600 * 1000
                    : undefined;

        var lastCause = '';
        var lastSeverity = -1;
        var Z = function (severity, cause) {
            if (severity > lastSeverity) {
                lastSeverity = severity;
                lastCause = cause;
            }
            return severity;
        };

        // process the ping time...
        svc.status = {
            /* text + boolean status */
            arrival_time: arrival ? new Date(arrival) : undefined,
            emergency: emerg,
            eta: ETA ? new Date(ETA) : undefined,
            first_ping: firstPing,

            ping:
                emerg ? Z(5, 'Emergency has been switched on') :
                arrival ? Z(0, 'Bus has arrived') :
                /* If the service is more than half an hour away
                from starting, we just ignore... */
                (now - sched0 < -30 * 60000) ? -1 :
                /* If no pings received */
                (!lastPing && now - sched0 >= -5 * 60000) ? Z(4, 'Driver App not switched on 5 mins before') :
                (!lastPing && now - sched0 >= -25 * 60000) ? Z(3, 'Driver App not switched on 25 mins before') :
//                (!lastPing && now - sched0 >= -30 * 60000) ? Z(2, 'Driver App not switched on 30 mins before') :
                (!lastPing && now - sched0 >= -30 * 60000) ? Z(-1, 'Driver App not switched on 30 mins before') :
                /* Else we scale the severity by how recent the last
                    ping is:
                    15 mins - severity 3
                    10 mins - severity 2
                    5 mins - severity 1
                    severity 0 otherwise
                    */
                (now - lastPing >= 30 * 60000) ? Z(2, 'No more pings since 30 mins ago') :
                (now - lastPing >= 20 * 60000) ? Z(2, 'No more pings since 20 mins ago') :
                (now - lastPing >= 15 * 60000) ? Z(1, 'No more pings since 15 mins ago') :
                0,

            distance:
                /* If arrived, highlight if late.

                   If haven't arrived,
                    Compute the ETA, and highlight

                   If we have no idea where they are, -1
                */
                emerg ? Z(5, 'Emergency has been switched on') :
                arrival ? (arrival - sched >= 15*60000 ? Z(3, 'Service arrived ' + ((arrival-sched)/60000).toFixed(0) + ' mins late') :
                           arrival - sched >= 5 *60000 ? 2 : 0 ) :
                ETA ? ( ETA - sched >= 10 * 60000 ? Z(3, 'Service might be more than 5 mins late') :
                        /*&ETA - sched >= 10 * 60000 ? Z(2, 'Might be late by 10 mins') :
                        ETA - sched >=  5 * 60000 ? Z(1, 'Might be late by 5 mins') :*/ 0) :
                    -1
        };
        if (!svc.nobody) {
            // Send notifications to operator
            sms.processNotifications(svc.route_service_id,
                'from ' + svc.stops[0].from_name.substr(0, 12)
              + ' to ' + svc.stops[0].to_name.substr(0, 12), lastSeverity, lastCause, now);


            // Send notifications to users
            if (!lastPing && now - sched0 >= 0 * 60000 && /* Cut-off is zero minutes */
                    now - sched0 <= 4 * 3600 * 1000 /* Don't send after 1 hour -- debugging purposes? */
                ) {
                sms.warnUsers(
                    svc.route_service_id,
                    '(DO NOT REPLY) Dear passenger, this service has been cancelled because the ' +
                    'bus driver has not started the tracking service. Please make alternate '+
                    'transport arrangements. Sorry for the inconvenience. ' +
                    'This is an experimental notification by Beeline'
                    )
            }
        }
            
    }
    return svcs;
};

var latestData = {};

function delay(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}

module.exports.startPolling = async function (timeout) {
    while (true) {
        try {
            var pollData = await exports.poll();
            latestData = exports.processStatus(pollData);
        }
        catch (err) {
            console.log(err.stack);
        }
        await delay(timeout);
    }
};

module.exports.isAuthorized = function(companyIds, company) {
    return (companyIds.indexOf(0) != -1 ||
            companyIds.indexOf(company) != -1);
}

module.exports.isServiceAuthorized = function(companyIds, svc) {
    return latestData[svc] &&
            latestData[svc].stops &&
            exports.isAuthorized(companyIds, latestData[svc].stops[0].bus_co_id);
}

module.exports.getBusStatusByCompany = function (busCompanies) {
    var subst = {};

    Object.keys(latestData).forEach((k) => {
//        console.log(latestData[k]);
        if (exports.isAuthorized(busCompanies, latestData[k].stops[0].bus_co_id)) {
            subst[k] = latestData[k];
        }
    });
    return subst;
};


