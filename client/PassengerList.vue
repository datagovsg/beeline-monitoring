<template>
<div class="contents-with-nav">
    <navi :service="tripId"></navi>
    <div>
    <h2>Boarding stops</h2>
    <table class="arrivalInfo">
        <tr>
            <th>Stop number</th>
            <td v-for="(tripStop, index) in arrivalInfo"
                :class="{ boarding: tripStop.canBoard,
                          alighting: tripStop.canAlight }"
                :title="tripStop.description"
                v-show="tripStop.canBoard">
                {{ index + 1 }}
                {{ tripStop.canBoard ? '↗' : '↙' }}
            </td>
        </tr>
        <tr>
            <th>Pax boarding</th>
            <td v-for="tripStop in arrivalInfo"
                v-show="tripStop.canBoard">
                <span v-if="tripStop.canBoard">
                  {{ tripStop.pax  }}
                </span>
            </td>
        </tr>
        <tr>
            <th>Scheduled</th>
            <td v-for="tripStop in arrivalInfo"
                v-show="tripStop.canBoard">
                <router-link :to="{
                    path: '/map/' + tripId,
                    query: {time: tripStop.expectedTime}
                  }" v-if="tripStop.canBoard">
                  {{ takeLocalTime(tripStop.expectedTime)  }}
                </router-link>
            </td>
        </tr>
        <tr>
            <th>Actual</th>
            <td v-for="tripStop in arrivalInfo"
                v-show="tripStop.canBoard">
                <span v-if="tripStop.canBoard">
                  {{ takeLocalTime(tripStop.actualTime || '') }}
                </span>
            </td>
        </tr>
        <tr>
            <th>Diff (mins)</th>
            <td v-for="tripStop in arrivalInfo"
                v-show="tripStop.canBoard">
                <span v-if="tripStop.canBoard">
                  {{ minsDiff(tripStop.actualTime || '', tripStop.expectedTime) }}
                </span>
            </td>
        </tr>
    </table>

    <template v-if="isPublicRoute">
      <h1>Passenger List</h1>
      <div v-for="(stop, index) in arrivalInfo"
          v-show="stop.canBoard"
          :key="stop.expectedTime">
          <h3 :class="{'show-passengers': stop.showPassengers}"
              @click="togglePassengers(stop)">
              ({{formatTime(stop.expectedTime)}}) {{index + 1}}.   {{stop.description}} - {{stop.road}}
          </h3>
          <div v-for="passenger in stop.passengers"
              :class="{passenger: true, 'animate-hide': !stop.showPassengers}"
              :key="passenger.telephone"
              >
              {{passenger.index}}.
              {{passenger.name}}
              &mdash;
              {{passenger.telephone}}
              &mdash;
              {{passenger.email}}
          </div>
      </div>

      <h1>Cancel Trip</h1>
      <form class="cancel-form"
          method="POST"
          @submit="confirmAndCancel"
          >
          <div v-if="trip.status !== 'cancelled'">
            <b>Warning</b>: This will cancel the trip, and passengers will be notified
            via SMS. This action is irreversible.

            <button class="danger-button" type="submit">Cancel Trip</button>
          </div>
          <div v-else>
            This trip has been cancelled.
          </div>
      </form>

      <h1>Send message to passengers</h1>
      <form method="POST" @submit="confirmAndSend">
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
          <input type="hidden" name="session_token" :value="sessionToken" />
          <input type="hidden" name="service" :value="tripId" />
          <textarea v-model="sms.message"
              style="display: block; width: 100%; height: 100px"
              name="message"></textarea>
          <button class="message-button" type="submit">Submit</button>
      </form>
    </template>

    <template v-if="isTrackingRoute">
      <h1>Update Route Announcements</h1>
      <RouteAnnouncementForm :tripId="tripId" />
    </template>

    <!-- space for the user to scroll down -->
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
.passenger:nth-child(even) {
  background-color: #FFF;
}
.passenger:nth-child(odd) {
  background-color: #EEE;
}

.passenger.animate-hide {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  transition: 0.1s linear all;
  overflow: hidden;
}
.passenger:not(.animate-hide) {
  max-height: 100px;
  padding-top: 5px;
  padding-bottom: 5px;
  transition: 0.1s linear all;
}

h3.show-passengers::before {
  content: "[ - ] ";
}
h3:not(.show-passengers)::before {
  content: "[ + ] ";
}

h3 {
    background-color: #ebeff2;
    margin: 1px 0 0 0;
    padding: 5px;
    font-size: 80%;
    color: #888;
    white-space: nowrap;
    overflow-x: auto;
}

td.boarding {
    background-color: #19c3a5;
}
td.alighting:not(.boarding) {
    background-color: #ff7070;
}

.cancel-form {
  background-color: #FFDDDD;
}
.danger-button {
  background-color: #FF0000;
  color: #FFFFFF;
}

</style>

<script>

const leftPad = require('left-pad')
var authAjax = require('./login').authAjax;
var Vue=require('vue');
const _ = require('lodash')
import MessageTemplates from './message-templates'
import {watch} from './loading-overlay';
import PollingQuery from './utils/PollingQuery'
import RouteAnnouncementForm from './RouteAnnouncementForm.vue'
import ServiceData from './service_data'
import {TRACKING_URL} from './env.json'

module.exports = {
    data () {
        return {
            title: '',
            subtitle: '',

            stops: [],
            routeTags: [],
            ServiceData,

            trip: {
              tripStops: [],
            },
            passengers: [],

            sms: {
                message: MessageTemplates[0][1]
            }
        };
    },

    components: {
      RouteAnnouncementForm
    },

    computed: {
        services() {
            return this.ServiceData.servicesByRouteId;
        },
        sessionToken() {
            return window.localStorage.session_token;
        },
        messageTemplates() {
            return MessageTemplates;
        },

        arrivalInfo() {
          var stops = _.sortBy(this.trip.stops, s => s.time);

          const passengersByStops = _.groupBy(this.passengers, p => p.bsStopId)

          let passengerIndex = 0
          return stops.map(s => ({
            ...s,
            passengers: (passengersByStops[s.stopId] || []).map(ps => ({
              ...ps,
              index: ++passengerIndex
            }))
          }));
        },
        isPublicRoute() {
          return this.routeTags.indexOf('public') != -1 ||
            this.routeTags.indexOf('mandai') != -1
        },
        isTrackingRoute() {
          return this.routeTags.indexOf('lite') != -1
        },

        tripId () {
          return this.$route.name === 'passenger-list' &&
            Number(this.$route.params.svc)
        },

        routeId() {
          const [routeId] = Object
            .entries(this.services)
            .find(([k, v]) => v.trip.tripId === this.tripId) || []
          return routeId
        },
    },

    watch: {
      tripId: {
        immediate: true,
        handler (tripId) {
          if (!tripId) return

          watch(Promise.all([
            this.$poller && this.$poller.executeNow(),
            this.requeryTrips()
          ]))
        },
      },
      routeId: {
        immediate: true,
        handler (routeId) {
          if (!routeId) return
          watch(this.getTags())
        }
      }
    },

    created () {
      this.$poller = new PollingQuery(30000, () => {
        return this.requery()
      })
    },

    destroyed() {
      this.$poller.stop()
    },

    methods: {
        getTags() {
          if (this.routeId) {
            return authAjax(`/routes/${this.routeId}`)
              .then(({data}) => {
                this.routeTags = data.tags
              })
          } else {
            return Promise.resolve()
          }
        },

        requeryTrips () {
          if (this.routeId) {
            return authAjax(`/routes/${this.routeId}/performance`, { baseURL: TRACKING_URL })
              .then(result => result.data)
              .then(([trip]) => {
                trip.stops.forEach(ts => (ts.showPassengers = true))
                this.trip = trip
              })
          } else {
            return Promise.resolve()
          }
        },

        requery () {
            if (!this.tripId) return Promise.resolve([])

            return authAjax(`/trips/${this.tripId}/passengers`)
            .then(result => result.data)
            .then((passengers) => {
              this.passengers = passengers
            })
            .then(null, (err) => {
              console.error(err);
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

        confirmAndCancel(event) {
            event.preventDefault()

            var confirmResponse = prompt(
              `To confirm please enter the route ID (${this.trip.route.id}):`
            )
            if (confirmResponse.trim() !== this.trip.route.id.toString()) {
              alert("The trip was not cancelled");
              return;
            }

            watch(authAjax(`/trips/${this.tripId}/statuses?messagePassengers=true`, {
                method: 'POST',
                data: {
                  status: 'cancelled'
                }
            })
            .then(result => result.data)
            .then(() => {
                this.requery();
                alert("Trip cancelled! The route list will be updated shortly.");
            })
            .then(null, (err) => {
                alert("There was an error sending the message");
            }))
            return false
        },

        togglePassengers(stop) {
          console.log(stop)
          stop.showPassengers = !stop.showPassengers;
        },
        /***************** FILTERS *****************/
        formatScheduled (s) {
            return s.substr(0,2) + ':' + s.substr(2,4);
        },
        takeLocalTime(s) {
            if (!s) return '';
            var now = new Date();
            var d = new Date(s);

            d = new Date(d.getTime() - 60000 * now.getTimezoneOffset());
            return d.toISOString().substr(11,5);
        },
        minsDiff (s, sched) {
            if (!s) return '';
            var actualDate = new Date(s);
            var schedDate = new Date(sched);

            var minsDiff = Math.round((actualDate.getTime() - schedDate.getTime()) / 60000);

            if (minsDiff == 0) {
                return '0';
            }
            else if (minsDiff < 0) {
                return minsDiff.toFixed(0);
            }
            else if (minsDiff > 0) {
                return '+' + minsDiff.toFixed(0);
            }
        },
        formatTime(sdt) {
            if (!Date.prototype.isPrototypeOf(sdt)) {
                sdt = new Date(sdt);
            }
            return leftPad(sdt.getHours(), 1, '0') + ':' + leftPad(sdt.getMinutes(), 2, '0');
        },
    }, /* methods */
}

</script>
