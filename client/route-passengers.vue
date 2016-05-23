<template>
<div>
    <navi :service="tripId"></navi>
    <div class="contents-with-nav">
<!--    <h1>{{services[service].stops[0].route_service_id}}:
        {{services[service].stops[0].from_name}} &mdash;
        {{services[service].stops[0].to_name}}-->
    <h2>Boarding stops</h2>
    <table class="arrivalInfo">
        <tr>
            <th>Stop number</th>
            <td v-for="tripStop in arrivalInfo"
                :class="{ boarding: tripStop.canBoard,
                          alighting: tripStop.canAlight }"
                v-show="tripStop.canBoard">
                {{ $index + 1 }}
                {{ tripStop.canBoard ? '↗' : '↙' }}
            </td>
        </tr>
        <tr>
            <th>Pax boarding</th>
            <td v-for="tripStop in arrivalInfo"
                v-show="tripStop.canBoard">
                <span v-if="tripStop.canBoard">
                  {{ tripStop.passengers.length  }}
                </span>
            </td>
        </tr>
        <tr>
            <th>Scheduled</th>
            <td v-for="tripStop in arrivalInfo"
                v-show="tripStop.canBoard">
                <span v-if="tripStop.canBoard">
                {{ tripStop.time | takeLocalTime }}
            </td>
        </tr>
        <tr>
            <th>Actual</th>
            <td v-for="tripStop in arrivalInfo"
                v-show="tripStop.canBoard">
                <span v-if="tripStop.canBoard">
                {{ tripStop.lastPing ? tripStop.lastPing.createdAt : '' | takeLocalTime }}
            </td>
        </tr>
        <tr>
            <th>Diff (mins)</th>
            <td v-for="tripStop in arrivalInfo"
                v-show="tripStop.canBoard">
                <span v-if="tripStop.canBoard">
                {{ tripStop.lastPing ? tripStop.lastPing.createdAt : '' | minsDiff tripStop.time }}
            </td>
        </tr>
    </table>


    <h1>Passenger List</h1>
    <div v-for="stop in arrivalInfo"
        v-show="stop.canBoard">
        <h3>{{$index + 1}}. {{stop.stop.description}} - {{stop.stop.road}}</h3>
        <h4>Boarding time: {{stop.time}}</h4>

        <div v-for="passenger in stop.passengers"
            class="passenger">
            {{passenger.index + 1}}.
            {{passenger.name}}
            &mdash;
            {{passenger.email}}
        </div>
    </div>

    <h1>Send message to passengers</h1>
    <form action="/send_message"
        method="POST"
        @submit="confirmAndSend"
        >
        <label>
            Use template:
            <select v-model="sms.message">
               <option v-for="mt in messageTemplates"
                    :value="mt[1]"
                    >
                    {{mt[0]}}
               </option>
            </select>
        </label>
        <input type="hidden" name="session_token" value="{{sessionToken}}" />
        <input type="hidden" name="service" value="{{service}}" />
        <textarea v-model="sms.message"
            style="display: block; width: 100%; height: 100px"
            name="message"></textarea>
        <button class="message-button" type="submit">Submit</button>
    </form>
    <br/>
    <br/>
    <br/>
    <br/>
    <br/>

    </div>
</div>
</template>

<style scoped>
form {
    padding: 1em;
    width: 100%;
    border: solid 1px #888;
}
label select{
    margin: 1em;
}
button.message-button {
    padding: 10px 30px;
    display: block;
    margin: 10px auto;
    width: 80%;

    border: solid 1px black;
    background-color: #ccc;
}
table.arrivalInfo {
    border-collapse: collapse;
    border-spacing: 0px;
}

.arrivalInfo th {
    background-color: #ebeff2;
}
.arrivalInfo th,
.arrivalInfo td {
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
    overflow-x: auto;
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
const _ = require('lodash')
import MessageTemplates from './message-templates'

Vue.filter('formatScheduled', (s) => {
    return s.substr(0,2) + ':' + s.substr(2,4);
});
Vue.filter('takeLocalTime', (s) => {
    if (!s) return '';
    var now = new Date();
    var d = new Date(s);

    d = new Date(d.getTime() - 60000 * now.getTimezoneOffset());

    return d.toISOString().substr(11,5);
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

            tripId: null,
            stops: [],

            ServiceData: window.ServiceData,

            trip: {
              tripStops: [],
            },
            passengers: [],

            sms: {
                message: MessageTemplates[0][1]
            }
        };
    },

    route: {
        activate() {
            this.tripId = this.$route.params.svc;
        },
    },

    computed: {
        services() {
            return this.ServiceData.services;
        },
        sessionToken() {
            return window.localStorage.session_token;
        },
        messageTemplates() {
            return MessageTemplates;
        },
        setMessage: {
            set(value) {
                this.$el.querySelector('textarea[name="message"]')

            },
        },

        arrivalInfo() {
          var stops = _.sortBy(this.trip.stops, s => s.time);
          var passengersByStops = _.groupBy(this.passengers, p => p.boardStopId)
          var index = 0;

          for (let stop of stops) {
            Vue.set(stop, 'passengers', passengersByStops[stop.id] || [])

            for (let p of stop.passengers) {
              p.index = index++;
            }
          }

          console.log(stops.map(s => _.assign({}, s)))
          return stops;
        }
    },

    watch: {
        tripId: function () {
            this.requery();
            this.requeryTrips();
        },
    },

    ready: function () {
        this.requery();
    },

    methods: {
        requeryTrips() {
            authAjax(`/monitoring`)
            .then((status) => {
              console.log(status)
              this.trip = _.values(status).find(t => t.tripId == this.tripId)
            })
        },
        requery: function (timeout) {
            clearTimeout(this.$timeout);

            timeout = timeout || 30000;

            authAjax(`/trips/${this.tripId}/get_passengers`)
            .then((passengers) => {
              this.passengers = passengers

              this.$timeout = setTimeout(() => {this.requery(timeout);}, timeout);
            })
        },

        confirmAndSend(event) {
            event.preventDefault()

            if (!confirm("Send message?"))
                return;

            if (!confirm("Really sure?"))
                return;
            
            authAjax(`/trips/${this.tripId}/messagePassengers`, {
                method: 'POST',
                data: {
                    message: this.sms.message,
                }
            })
            .then(() => {
                alert("Message sent!");
            })
            .then(null, (err) => {
                alert("There was an error sending the message");
            })
            return false
        },
    }
}

</script>
