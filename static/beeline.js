
var operator_tool;
var months = 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(',');
var tzo = (new Date()).getTimezoneOffset() * 60000;

Date.prototype.localISO = function () {
    return (new Date(this.getTime() - tzo)).toISOString();
}

$(document).ready(function () {
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

    Vue.filter('switchOnStatus', function (svc) {
    });

    operator_tool = new Vue({
        el: document.body,
        data: {
            services: {},
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
                $.ajax('/current_status', {
                    method: 'GET',
                    dataType: 'json',
                    data: {
                        companyId: 2,
                    },
                    cache: false,
                })
                .done(function (s) {
                    self.services = s;
                    setTimeout(function () {
                        self.requery(timeout);
                    }, timeout);
                })
                .fail(function (err) {
                    console.log(err);
                });
            },
        },
    });

});
