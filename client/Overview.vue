<template>
  <div>
  {{date}}
  <input type="text" v-model="filter" placeholder="Search for Route">
  <table>
      <thead>
      <tr>
          <th data-column="label"  @click="sortBy ='label'"
            style="width: calc(50% - 5em)">
            Label
          </th>
          <th data-column="label"  @click="sortBy ='time'"
            style="width: calc(50% - 5em)">
            Time
          </th>
          <th data-column="led">App is on</th>
          <th data-column="led">ETA (1<sup>st</sup> stop)</th>
          <th data-column="next"></th>
      </tr>
      </thead>
      <tbody>
      <tr v-if="servicesByStartTime.length == 0">
          <td colspan="5">
              You have no bus services today.
              You might not be authorized to view the bus service status.
              Please contact the Beeline team if this is incorrect.
          </td>
      </tr>
      <template v-for="service in servicesByStartTime"
          track-by='trip.route.id'>
        <tr  :class="{
                emergency: service.trip.status === 'cancelled',
                nobody: service.nobody && (service.trip.route.tags.indexOf('notify-when-empty') === -1),
            }"
            >
            <td style="border-bottom: transparent" colspan="2">
              <div class="service_name">
                <big>{{service.trip.route.label}}</big> ({{service.trip.route.id}})
                {{takeTime(service.trip.tripStops[0].time)}}
              </div>
            </td>
            <td data-column="led" rowspan="2">
                <div :class="{
                    led: true,
                    s0 : service.status.ping == 0,
                    s1 : service.status.ping == 1,
                    s2 : service.status.ping == 2,
                    s3 : service.status.ping >= 3,
                    sU : service.status.ping == -1,
                }">
                    <span v-if="service.firstPing">
                        1<sup>st</sup>: {{takeTime(service.firstPing.createdAt)}}
                    </span>
                    <template v-if="service.status.arrivalTime">
                        (arrived)
                    </template>
                    <template v-else>
                        <template v-if="service.lastPing">
                            L<sup>ast</sup>: {{minutesSince(service.lastPing)}} <br/> mins ago
                        </template>
                    </template>
                </div>
            </td>
            <td data-column="led" rowspan="2">
                <div :class="{
                    led: true,
                    s0 : service.status.distance == 0,
                    s1 : service.status.distance == 1,
                    s2 : service.status.distance == 2,
                    s3 : service.status.distance >= 3,
                    sU : service.status.distance == -1,
                }">
                    <template v-if="service.status.arrivalTime">
                        {{takeTime(service.status.arrivalTime)}} (arrived)
                    </template>
                    <template v-else>
                        {{takeTime(service.status.eta)}} (est)
                    </template>
                </div>
            </td>
            <td data-column="next" rowspan="2">
              <router-link :to="{path: '/map/' + service.trip.id}" class="details_button">
                &gt;&gt;
              </router-link>
            </td>
        </tr>
        <tr :class="{
                emergency: service.trip.status === 'cancelled',
                nobody: service.nobody && (service.trip.route.tags.indexOf('notify-when-empty') === -1),
            }">
          <td data-column="route" colspan="2">
            {{service.trip.route.from}}<br/>
            {{service.trip.route.to}}
          </td>
        </tr>
      </template>
      </tbody>
  </table>
</div>
</template>

<script>
var Vue = require('vue');
var _ = require('lodash')

var months = 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(',');
var tzo = (new Date()).getTimezoneOffset() * 60000;
var authAjax = require('./login').authAjax;
import {watch} from './loading-overlay';
const ServiceData = require('./service_data')

Date.prototype.localISO = function () {
    return (new Date(this.getTime() - tzo)).toISOString();
}

module.exports = {
    data() {
        return {
            services: {},
            sortBy: 'time',
            sortByTemplates: {
              time: ['trip.tripStops[0].time', 'trip.route.label'],
              label: ['trip.route.label', 'trip.tripStops[0].time'],
            },
            filter: '',
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

            ss = _.values(ss)
            ss = _.orderBy(ss, this.sortByTemplates[this.sortBy]
              .map(t => s => _.get(s, t))
            )
            if (this.filter) {
              ss = ss.filter(s =>
                s.trip.route.from.toUpperCase().indexOf(this.filter.toUpperCase()) != -1
                ||
                s.trip.route.to.toUpperCase().indexOf(this.filter.toUpperCase()) != -1
                ||
                s.trip.route.label.toUpperCase().indexOf(this.filter.toUpperCase()) != -1
              )
            }

            return ss;
        },
    },
    created: function() {
        var queryAgain = () => {
          this.$queryTimeout = null;
          return this.requery()
          .catch((err) => console.error(err))
          .then(() => {
            if (this.$queryTimeout === null) {
              this.$queryTimeout = setTimeout(queryAgain, 20000);
            }
          })
        };
        watch(queryAgain());
    },
    destroyed() {
      if (this.$queryTimeout) {
        clearTimeout(this.$queryTimeout);
      }
      this.$queryTimeout = false;
    },
    methods: {
        showService: function (svc) {
            if (mapVue)
                mapVue.service = svc;
        },
        requery: function(timeout) {
            var self = this;
            return authAjax('/monitoring', {
                method: 'GET',
            })
            .then(function (result) {
                ServiceData.services = self.services = result.data;
            })
            .then(null, function (err) {
                console.log(err);
            })
        },

        /*************** Filters ***************/
        minutesSince (dt) {
            if (dt) {
                return Math.round(((new Date()).getTime() - (new Date(dt.createdAt)).getTime()) / 60000).toFixed(0);
            }
            return '';
        },
        takeTime (dt) {
            if (dt) {
                return (new Date(dt)).localISO().substr(11,5);
            }
            return '';
        },
        firstStopETA (svc) {
            // Has it arrived at all?
            // check first stop...
            var firstStop = svc.trip.tripStops[0];

            var hasArrived = false;
            if (firstStop.lastPing) {
                var time_part = new Date(firstStop.lastPing.createdAt);
                var scheduledTime = new Date(time_part.getTime());
                scheduledTime.setUTCHours(parseInt(firstStop.time.substr(0,2)));
                scheduledTime.setUTCMinutes(parseInt(firstStop.time.substr(2,4)));
                scheduledTime.setUTCSeconds(0);

                if (time_part.getTime() - scheduledTime.getTime() >= -5 * 60 * 1000) {
                    return time_part.localISO().substr(11,5)
                                + ' (Arrived)';
                }
            }
            else if (svc.lastPing) {
                var time_part = new Date(svc.lastPing.createdAt);
                var distance = svc.lastPing.distance;

                var hours = (distance / 1000 / 60);
                var estimatedArrivalTime = new Date(time_part.getTime() + hours*60*60*1000);

                return estimatedArrivalTime.localISO().substr(11,5);
                //var arrival_time = new Date(firstStop.createdAt);
                //arrival_time.setHours(parseInt(firstStop.time.substr(0,2)));
                //arrival_time.setMinutes(parseInt(firstStop.time.substr(2,4)));
                //arrival_time.setSeconds(0);
            }


            return '';
        }
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
