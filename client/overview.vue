
<template>
{{date}}
<table>
    <thead>
    <tr>
        <th data-column="route">Route</th>
        <th data-column="led">App is on</th>
        <th data-column="led">ETA (1<sup>st</sup> stop)</th>
        <th data-column="next"></th>
    </tr>
    </thead>
    <tbody>
    <tr v-if="servicesByStartTime.length == 0">
        <td colspan="4">
            You have no bus services today.
            You might not be authorized to view the bus service status.
            Please contact the Beeline team if this is incorrect.
        </td>
    </tr>
    <tr v-for="service in servicesByStartTime"
        track-by='route_service_id'
        :class="{
            emergency: service.status.emergency,
            nobody: service.nobody,
        }"
        >
        <td data-column="route">
            <h4 style="float: left; margin: 0 10px 0 10px">{{service.route_service_id}}
            <div class="service_name">{{service.stops[0].service_name}}</div>
            </h4>
            <h4 style="float: left; margin: 0 10px 0 10px">{{service.stops[0].time}}</h4>
            <div style="float: left">
                {{service.stops[0].from_name}}<br/>
                {{service.stops[0].to_name}}</div>
        </td>
        <td data-column="led">
            <div :class="{
                led: true,
                s0 : service.status.ping == 0,
                s1 : service.status.ping == 1,
                s2 : service.status.ping == 2,
                s3 : service.status.ping == 3,
                sU : service.status.ping == -1,
            }">
                <template v-if="service.status.arrival_time">
                    n.a. &mdash; <br/>
                    (arrived) 
                </template>
                <template v-else>
                    <template v-if="service.last_ping">
                        {{service.last_ping | minutesSince}} <br/> mins ago
                    </template>
                </template>
            </div>
        </td>
        <td data-column="led">
            <div :class="{
                led: true,
                s0 : service.status.distance == 0,
                s1 : service.status.distance == 1,
                s2 : service.status.distance == 2,
                s3 : service.status.distance == 3,
                sU : service.status.distance == -1,
            }">
                <template v-if="service.status.arrival_time">
                    {{service.status.arrival_time | takeTime}} (arrived)
                </template>
                <template v-else>
                    {{service.status.eta | takeTime}} (est)
                </template>
            </div>
        </td>
        <td data-column="next">
        <a v-link="{path: '/map/' + service.route_service_id}" class="details_button">
        &gt;&gt;
        </a>
        </td>
    </tr>
    </tbody>
</table>

</template>

<script>
var Vue = require('vue');

Vue.filter('minutesSince', function (dt) {
    if (dt) {
        return Math.round(((new Date()).getTime() - (new Date(dt.timestamp)).getTime()) / 60000).toFixed(0);
    }
    return '';
});

Vue.filter('takeTime', function (dt) {
    if (dt) {
        return (new Date(dt)).localISO().substr(11,5);
    }
    return '';
});

Vue.filter('firstStopETA', function (svc) {
    // Has it arrived at all?
    // check first stop...
    var firstStop = svc.stops[0];

    var hasArrived = false;
    if (firstStop.last_ping) {
        var time_part = new Date(firstStop.last_ping.timestamp);
        var scheduledTime = new Date(time_part.getTime());
        scheduledTime.setUTCHours(parseInt(firstStop.time.substr(0,2)));
        scheduledTime.setUTCMinutes(parseInt(firstStop.time.substr(2,4)));
        scheduledTime.setUTCSeconds(0);
        
        if (svc.route_service_id == 77) {
            console.log(time_part);
            console.log(scheduledTime);
        }

        if (time_part.getTime() - scheduledTime.getTime() >= -5 * 60 * 1000) {
            return time_part.localISO().substr(11,5)
                        + ' (Arrived)';
        }
    }
    else if (svc.last_ping) {
        var time_part = new Date(svc.last_ping.timestamp);
        var distance = svc.last_ping.distance;

        var hours = (distance / 1000 / 60);
        var estimatedArrivalTime = new Date(time_part.getTime() + hours*60*60*1000);

        return estimatedArrivalTime.localISO().substr(11,5);
        //var arrival_time = new Date(firstStop.timestamp);
        //arrival_time.setHours(parseInt(firstStop.time.substr(0,2)));
        //arrival_time.setMinutes(parseInt(firstStop.time.substr(2,4)));
        //arrival_time.setSeconds(0);
    }


    return '';
});

var months = 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(',');
var tzo = (new Date()).getTimezoneOffset() * 60000;
var authAjax = require('./login').authAjax;

Date.prototype.localISO = function () {
    return (new Date(this.getTime() - tzo)).toISOString();
}

module.exports = {
    data() {
        return {
            services: {},
        };
    },
    computed: {
        date: function () {
            // FIXME use server date?
            var d = new Date();
            return d.getDate() + ' ' +
                months[d.getMonth()] + ' ' +
                d.getFullYear();
        },

        servicesByStartTime: function () {
            var rv = [];
            var self = this;
            var ss = self.services;

            Object.keys(ss).forEach(function (k) {
                rv.push(ss[k]);
            });
            rv.sort(function (a, b) {
                return (a.stops[0].time < b.stops[0].time) ? -1
                : (a.stops[0].time > b.stops[0].time) ? 1
                : (a.stops[0].route_service_id < b.stops[0].route_service_id) ? -1
                : (a.stops[0].route_service_id > b.stops[0].route_service_id) ? 1
                : 0;
            });
            return rv;
        },
    },
    created: function() {
        var self=this;
        self.requery(5000);
    },
    methods: {
        showService: function (svc) {
            if (mapVue)
                mapVue.service = svc;
        },
        requery: function(timeout) {
            var self = this;
            authAjax('/current_status', {
                method: 'GET',
                dataType: 'json',
                cache: false,
            })
            .done(function (s) {
                window.ServiceData.services = self.services = s;
                setTimeout(function () {
                    self.requery(timeout);
                }, timeout);
            })
            .fail(function (err) {
                console.log(err);
            });
        },
    },
}
</script>

<style scoped>
table {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
}
th {
    background-color: #EBEFF2;
    color: #493761;
    font-size: 80%;
    height: 30px;
}

tr.emergency td {
    background-color: #FFECEC;
}

tr.nobody td{
    opacity: 0.3;
    background-color: #ccc;
}

th,
td {
    border-bottom: solid 1px #CCC;
}

th[data-column="route"],
td[data-column="route"] {
    min-width: 60px;
}
th[data-column="led"],
td[data-column="led"] {
    width: 60px;
}
th[data-column="next"],
td[data-column="next"] {
    width: 20px;
    position: relative;
}
td[data-column="next"]:hover {
    background-color: #dddddd;
}

.service_name {
    color: #666;
    font-size: 80%;
}
.led {
    min-width: 50px;
    min-height: 50px;
    border-radius: 25px;
    box-sizing: border-box;
    margin: 10px;
    text-align: center;
    overflow: visible;
    font-size: 80%;
    line-height: 1.3;
    padding-top: 0.4em;
}

.led.sU {
    background-color: #c9c9c9;
}

.led.s0, .led.s1 {
    background-color: #14c3a6;
}
.led.s2, .led.s3 {
    background-color: #ff6f6f;
}

.details_button {
    display: block;
    width: 100%;
    position: absolute;
    top: 0px;
    bottom: 0px;
    left: 0px;
}

</style>
