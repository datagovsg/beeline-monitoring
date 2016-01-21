<template>
<div>
    <navi :service="service"></navi>
    <div class="contents-with-nav">
<!--    <h1>{{services[service].stops[0].route_service_id}}:
        {{services[service].stops[0].from_name}} &mdash;
        {{services[service].stops[0].to_name}}-->
    <h2>Boarding stops</h2>
    <table class="arrival_info">
        <tr>
            <th>Stop number</th>
            <td v-for="arrv in arrival_info.stops"
                :class="{ boarding: arrv.is_boarding,
                          alighting: !arrv.is_boarding }"
                v-show="arrv.is_boarding">
                {{ $index + 1 }}
                {{ arrv.is_boarding ? '↗' : '↙' }}
            </td>
        </tr>
        <tr>
            <th>Pax boarding</th>
            <td v-for="arrv in stops"
                v-show="arrv.is_boarding">
                <span v-if="arrv.is_boarding">
                {{ arrv.passengers.length  }}
                </span>
            </td>
        </tr>
        <tr>
            <th>Scheduled</th>
            <td v-for="arrv in arrival_info.stops"
                v-show="arrv.is_boarding">
                <span v-if="arrv.is_boarding">
                {{ arrv.time | formatScheduled }}
            </td>
        </tr>
        <tr>
            <th>Actual</th>
            <td v-for="arrv in arrival_info.stops"
                v-show="arrv.is_boarding">
                <span v-if="arrv.is_boarding">
                {{ arrv.last_ping ? arrv.last_ping.timestamp : '' | takeTime }}
            </td>
        </tr>
        <tr>
            <th>Diff (mins)</th>
            <td v-for="arrv in arrival_info.stops"
                v-show="arrv.is_boarding">
                <span v-if="arrv.is_boarding">
                {{ arrv.last_ping ? arrv.last_ping.timestamp : '' | minsDiff arrv.time }}
            </td>
        </tr>

    </table>

    <h1>Passenger List</h1>
    <div v-for="stop in stops"
        v-show="stop.is_boarding">
        <h3>{{$index + 1}}. {{stop.name}}</h3>
        <h4>Boarding time: {{stop.boarding_time}}</h4>

        <div v-for="passenger in stop.passengers"
            class="passenger">
            {{passenger.index + 1}}.
            {{passenger.name}}
        </div>
    </div>
    </div>
</div>
</template>

<style scoped>
table.arrival_info {
    border-collapse: collapse;
    border-spacing: 0px;
}

.arrival_info th {
    background-color: #ebeff2;
}
.arrival_info th,
.arrival_info td {
    min-width: 50px;
    border: solid 1px #CCCCCC;
    padding: 5px;
}

.passenger {
    padding: 5px;
}

h4,
h3 {
    background-color: #ebeff2;
    margin: 0;
    padding: 5px;
}
h3 {
    white-space: nowrap;
    overflow-x: scroll;
}

h4 {
    border-bottom: solid 1px #999;
}

td.boarding {
    background-color: #19c3a5;
}
td.alighting {
    background-color: #ff7070;
}

</style>

<script>

var authAjax = require('./login').authAjax;
var Vue=require('vue');

Vue.filter('formatScheduled', (s) => {
    return s.substr(0,2) + ':' + s.substr(2,4);
});
Vue.filter('takeLocalTime', (s) => {
    if (!s) return '';
    var now = new Date();
    var d = new Date(s);

    d = new Date(d.getTime() - 60000 * now.getTimezoneOffset());

    return d.toISOString.substr(11,5);
});
Vue.filter('minsDiff', (s, sched) => {
    if (!s) return '';
    var now = new Date();
    var d = new Date(s);

    d = new Date(d.getTime());

    var schedDate = new Date(d.getTime());
    schedDate.setHours(parseInt(sched.substr(0,2)));
    schedDate.setMinutes(parseInt(sched.substr(2,4)));
    schedDate.setSeconds(0);

    var minsDiff = Math.round((d.getTime() - schedDate.getTime()) / 60000);

    if (minsDiff == 0) {
        return '0';
    }
    else if (minsDiff < 0) {
        return minsDiff.toFixed(0);
    }
    else if (minsDiff > 0) {
        return '+' + minsDiff.toFixed(0);
    }

});


module.exports = {
    data () {
        return {
            title: '',
            subtitle: '',

            service: null,
            stops: [],

            ServiceData: window.ServiceData,

            arrival_info: [],
        };
    },

    route: {
        activate() {
            this.service = this.$route.params.svc;
        },
    },

    computed: {
        services() {
            return this.ServiceData.services;
        },
    },

    watch: {
        service: function () {
            this.requery();
            this.requeryArrival();
        },
    },

    ready: function () {
        this.requery();
    },

    methods: {
        requeryArrival: function (timeout) {
            var self=this;
            authAjax('/current_status', {
            })
            .then( (services) => {
                self.arrival_info = services[this.service];
            });
        },
        requery: function (timeout) {
            clearTimeout(this.$timeout);

            timeout = timeout || 30000;

            var self = this;
            authAjax('/get_passengers/' + this.service, {
            })
            .done(function (passengers) {
                var stops = [];
                for (var i=0; i<passengers.length; i++) {
                    passengers[i].index = i;
                    if (stops.length == 0 ||
                        stops[stops.length-1].rsst_id_board != passengers[i].rsst_id_board) {
                        
                        stops.push({
                            rsst_id_board: passengers[i].rsst_id_board,
                            name: passengers[i].stop_name,
                            boarding_time: passengers[i].time,
                            is_boarding: passengers[i].is_boarding,
                            passengers: []
                        });
                    }

                    if (passengers[i].email)
                        stops[stops.length-1].passengers.push(passengers[i]);
                }
                self.stops = stops;
                self.$timeout = setTimeout(() => {self.requery(timeout);}, timeout);
            });
        },
    }
}

</script>
