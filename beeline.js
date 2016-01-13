'use strict';

var mssql = require('mssql');
var Promise = require('promise');
var proj4 = require('proj4');

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
    console.log(err);
}

module.exports.getDB = function () {
    return mssql.connect({
        user: 'readonly',
        password: 'hahareadonly',
        server: 'beelinerds.ctauntrumctz.ap-southeast-1.rds.amazonaws.com',
        database: 'beeline',
    });
}
module.exports.get_pings = function (svc)  {
    return exports.getDB()
    .then((conn) => {
        var req = new mssql.Request(conn);
        var localDate = (new Date( (new Date()).getTime() -
                           (new Date()).getTimezoneOffset()*60000 ));

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
    .then(identity, errHandler);
};

module.exports.lastPings = function (conn)  {
    var req = new mssql.Request(conn);
    var localDate = (new Date( (new Date()).getTime() -
                               (new Date()).getTimezoneOffset()*60000 ));

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
    AND @current_date <= rs.end_date
)
SELECT * FROM rned
    `)
    .then(identity, errHandler);
};

module.exports.services = function (conn) {
    var req = new mssql.Request(conn);
    var localDate = (new Date( (new Date()).getTime() -
                               (new Date()).getTimezoneOffset()*60000 ));

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
    AND @current_date <= route_service.end_date
ORDER BY
    route_service.route_service_id,
    rsst.time ASC
    `)
    .then(identity, errHandler);
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
    booking.route_service_id,
    booking.rsst_id_board,
    stop.name AS stop_name,
    rsst.time,
    [user].[name],
    [user].email,
    route_service.bus_co_id
FROM
    booking 
    INNER JOIN [user] ON [user].email = booking.user_email
    INNER JOIN route_service_stop_time rsst ON rsst.rsst_id = booking.rsst_id_board
    INNER JOIN route_service ON rsst.route_service_id = route_service.route_service_id
    INNER JOIN stop ON stop.stop_id = rsst.stop_id
WHERE
    CHARINDEX(CONVERT(VARCHAR(8), @current_date, 112), booking.dates) <> 0
    AND booking.status = 'PAID'
    AND booking.route_service_id = @service
ORDER BY
    booking.route_service_id,
    rsst.time
        `)
        .then(identity, errHandler);
    });
};

module.exports.poll = function () {
    return module.exports.getDB()
    .then((db) => {
        return Promise.all([
                module.exports.lastPings(db),
                module.exports.services(db)])
    })
    .then((res) => {
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
        }
        
        var tzo = (new Date()).getTimezoneOffset() * 60000;
        
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

                if (distance <= 120 &&
                    (typeof(stop.last_ping) == 'undefined' ||
                     stop.last_ping.timestamp < pings[i].timestamp)) {
                    /* consider bus to be already in position */
                    stop.last_ping = pings[i];
                    stop.last_ping.distance = distance;
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
        console.log('another');

        return svcs_dict;
    })
    .then(identity, errHandler);
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
    .then(identity, errHandler);
};

/**** Status computation ****/

function scheduledStopTime(svc, i) {
    var d = svc.last_ping ? new Date(svc.last_ping.timestamp)
                          : new Date();

    /**
        N.B. Our server operates in SGT,
        but our timestamps are stored as UTC.

        Hence to do timestamp comparison...
        FIXME
    **/
    d.setHours(parseInt(svc.stops[i].time.substr(0,2)));
    d.setMinutes(parseInt(svc.stops[i].time.substr(2,4)));
    d.setSeconds(0);

    return d;
}

function actualStopTime(svc, i) {
    i = i || 0;

    if (svc.stops[i].last_ping) {
        return new Date(svc.stops[i].last_ping.timestamp);
    }
    else {
        return undefined;
    }
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
module.exports.processStatus = function (svcs) {
    for (let rsid of Object.keys(svcs)) {
        var svc = svcs[rsid];

        // Note: we are interested in the first stop with nonzero pickup
        var first_nz = 0;
        for ( ; first_nz < svc.stops.length; first_nz++) {
            if (svc.stops[first_nz].num_booked != 0) {
                break;
            }
        }
        if (first_nz == svc.stops.length) {
            console.log('Service ' + rsid + ' bo lak gu leh');
            first_nz = 0;
        }

        var sched0 = scheduledStopTime(svc, 0).getTime();
        var sched = scheduledStopTime(svc, first_nz).getTime();
        var lastPing = lastPingTime(svc)
        if (lastPing) lastPing = lastPing.getTime();
        var actual = actualStopTime(svc, first_nz);
        if (actual) actual = actual.getTime();
        var now = new Date().getTime();
        var emerg = svc.last_ping && svc.last_ping.problem && svc.last_ping.problem != '0';

        /* arrival time exists only if bus arrived earliest
            2 mins before start of trip */
        var arrival = (actual - sched > -2 * 60000) ?
                            actual : undefined;
        var distance = svc.last_ping ? 
                svc.last_ping.distance : 0;
        var speed = 40; // km/h
        var ETA = distance ?
                    now + distance / 1000 / 35.0 * 3600 * 1000
                    : undefined;

        // process the ping time...
        svc.status = {
            /* text + boolean status */
            arrival_time: arrival ? new Date(arrival) : undefined,
            emergency: emerg,
            eta: ETA ? new Date(ETA) : undefined,

            ping:
                emerg ? 3 :
                arrival ? 0 :
                /* If the service is more than half an hour away
                from starting, we just ignore... */
                (now - sched0 < -30 * 60000) ? -1 :
                /* If no pings received */
                (!lastPing) ? 3 :
                /* Else we scale the severity by how recent the last
                    ping is:
                    15 mins - severity 3
                    10 mins - severity 2
                    5 mins - severity 1
                    severity 0 otherwise
                    */
                (now - lastPing >= 15 * 60000) ? 3 :
                (now - lastPing >= 10 * 60000) ? 2 :
                (now - lastPing >=  5 * 60000) ? 1 :
                0,

            distance:
                /* If arrived, highlight if late.

                   If haven't arrived,
                    Compute the ETA, and highlight

                   If we have no idea where they are, -1
                */
                emerg ? 3 :
                arrival ? ( arrival - sched >= 5 * 60000 ? 2 : 0 ) :
                ETA ? ( ETA - sched >= 15 * 60000 ? 3 :
                        ETA - sched >= 10 * 60000 ? 2 :
                        ETA - sched >=  5 * 60000 ? 1 : 0) :
                    -1
        }
            
    }
    return svcs;
};

var latestData = {};
module.exports.startPolling = function (timeout) {
    var next = () => {
        exports.poll().then( (data) => {
            latestData = exports.processStatus(data);
            setTimeout(next, timeout);
        });
    };
    next();
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


