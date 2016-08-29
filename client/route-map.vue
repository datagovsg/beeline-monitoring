<template>
<div class="sec-map">
    <navi :service="service"></navi>
    <div class="contents-with-nav">
        <gmap-map
            v-ref:gmap
            class="sec-map"
            :center="{lng: 103.8, lat: 1.38}"
            :zoom="12"
            >
            <!-- Start and end markers -->
            <gmap-marker
                v-if="pings.length > 0"
                :position="{
                    lat: pings[pings.length - 1].coordinates.coordinates[1],
                    lng: pings[pings.length - 1].coordinates.coordinates[0],
                }"
                :icon="startPoint"
                :title="Start"
                >
            </gmap-marker>
            <gmap-marker
                v-if="pings.length > 0"
                :position="{
                    lat: pings[0].coordinates.coordinates[1],
                    lng: pings[0].coordinates.coordinates[0],
                }"
                :icon="endPoint"
                :title="End"
                >
            </gmap-marker>

            <gmap-marker
                v-for="stop in stops"
                track-by='$index'
                :position="stop | stopPosition"
                :icon="stop | stopIcon $index"
                @g-mouseover='selectStop(stop)'
                @g-mouseout='closeWindow'
                >
            </gmap-marker>

            <gmap-infowindow
                v-if="selectedStop != null"
                :opened='selectedStop != null'
                :position="selectedStop | stopPosition"
            >
                Scheduled: {{selectedStop.time | formatTime}}
                <div v-if="selectedStop.canBoard">
                No. of Passengers: {{selectedStop.passengers.length}}
                </div>
            </gmap-infowindow>

            <gmap-infowindow
                v-if="selectedPing != null"
                :opened="selectedPing != null"
                :position="selectedPing.coordinates | coordinatesToLatLng"
            >
              {{selectedPing.time | formatTime}}
              <br/>
              <i>Driver Id #{{selectedPing.driverId}}</i>
            </gmap-infowindow>

            <ping-line :pings="pings" :options="pingOptions" :sample-rate="5"></ping-line>
            <ping-line v-for="(driverId,driverPings) in otherPings" :pings="driverPings"
                :options="otherPingOptions" :sample-rate="5"></ping-line>
        </gmap-map>
    </div>
</div>
</template>

<style>
div.sec-map .map {
    position: absolute;
    left: 0px;
    width: 100%;
    bottom: 0px;
    border: solid 2px red;
    top: 0px;
}
</style>

<script>

import {Map, load, InfoWindow, Polyline, Marker} from 'vue-google-maps'
import PingLine from './ping-line.vue'
import leftPad from 'left-pad'
import Vue from 'vue'
import _ from 'lodash'
import assert from 'assert';

var authAjax = require('./login').authAjax;
import {watch} from './loading-overlay';

module.exports = {
    components: {
      'gmap-map': Map,
      'gmap-marker': Marker,
      'gmap-polyline': Polyline,
      'gmap-infowindow': InfoWindow,
      'ping-line': PingLine,
    },

    data () {
        return {
            title: '',
            subtitle: '',

            center: {lng: 103.8, lat: 1.38},
            zoom: 12,

            service: null,
            pings: [],
            otherPings: {},
            stops: [],
            bounds: null,

            selectedStop: null,
            selectedPing: null,
        };
    },

    route: {
        activate() {
            this.service = this.$route.params.svc;

            // Trigger map change
            Vue.nextTick(() => {
                if (!this.$refs.gmap.mapObject) {
                    return;
                }
                this.$broadcast('g-resize-map')
            });
        },
    },

    ready: function () {
      this.$map = null;

      var queryAgain = () => {
        this.$queryTimeout = null;

        this.requery()
        .catch((err) => console.error(err))
        .then(() => {
          if (this.$queryTimeout === null) {
            this.$queryTimeout = setTimeout(queryAgain, 30000);
          }
        })
      };
      queryAgain();
    },

    destroyed() {
      if (this.$queryTimeout) {
        clearTimeout(this.$queryTimeout);
      }
      this.$queryTimeout = false;
    },

    computed: {
        startPoint() {
          return {
            url: 'img/routeStartMarker.png',
            size: new google.maps.Size(50, 40),
            origin: new google.maps.Point(0,0),
            anchor: new google.maps.Point(25, 40)
          };
        },
        endPoint() {
          return {
            url: 'img/routeEndMarker.png',
            size: new google.maps.Size(50, 40),
            origin: new google.maps.Point(0,0),
            anchor: new google.maps.Point(25, 40)
          };
        },
        otherPingOptions() {
          return {
            polyline: {
              strokeOpacity: 0.8,
              strokeWeight: 2
            }
          }
        },
        pingOptions() {
          return {
            polyline: {
              strokeOpacity: 1.0,
            }
          }
        }
    },

    filters: {
        formatTime(sdt) {
            if (!(sdt instanceof Date)) {
                sdt = new Date(sdt);
            }
            return leftPad(sdt.getHours(), 1, '0') + ':' + leftPad(sdt.getMinutes(), 2, '0');
        },

        stopIcon(stop, index) {
            return {
                url: 'img/stop' +
                    (stop.canBoard ? 'Board' : 'Alight') +
                    (index + 1) + '.png',
                size: new google.maps.Size(100,100),
                origin: new google.maps.Point(0,0),
                anchor: new google.maps.Point(20,20),
                scaledSize: new google.maps.Size(40,40),
            }
        },

        stopPosition(ts) {
          return {
            lat: ts.stop.coordinates.coordinates[1],
            lng: ts.stop.coordinates.coordinates[0],
          }
        },
        coordinatesToLatLng(cc) {
          assert(typeof cc.coordinates[1] === 'number');
          return {
            lat: cc.coordinates[1],
            lng: cc.coordinates[0],
          }
        }
    },


    watch: {
        service: function () {
            watch(this.requery()
            .then(() => {
                this.setBounds()
            }));
        },
    },

    methods: {
        requery: function () {
            var startTime = new Date();
            startTime.setHours(0,0,0,0);

            // Pings of other drivers who also
            // claimed this trip id
            var pingsPromise = authAjax(`/trips/${this.service}/pingsByTripId`, {
              data: {
                startTime: startTime.getTime(),
                limit: 100000,
              }
            })
            .then((data) => {
              this.otherPings = _.groupBy(data, 'driverId');
            })

            var tripPromise = authAjax(`/trips/${this.service}`);
            var passengersPromise = authAjax(`/trips/${this.service}/passengers`);

            Promise.all([tripPromise, passengersPromise])
            .then(([stopData, passengerData]) => {
                var stops = stopData.tripStops;
                var passengers = passengerData;

                var passengersByStopId = _.groupBy(passengers, p => p.boardStopId)

                for (var i=0; i<stops.length; i++) {
                    stops[i].passengers = passengersByStopId[stops[i].id] || [];
                }

                this.stops = stops;
            });

            return Promise.all([tripPromise, passengersPromise, pingsPromise]);
        },

        selectStop(stop) {
            this.selectedPing = null;
            this.selectedStop = stop;
        },
        closeWindow() {
            this.selectedPing = null;
            this.selectedStop = null;
        },

        setBounds() {
            var bounds = new google.maps.LatLngBounds();
            var self = this;

            for (stop of this.stops) {
                var latlng = new google.maps.LatLng(
                                stop.stop.coordinates.coordinates[1],
                                stop.stop.coordinates.coordinates[0]);
                bounds.extend(latlng);
            }
            this.$refs.gmap.mapObject.fitBounds(bounds);
        },
    },

    events: {
      selectPing(ping) {
        this.selectedPing = ping;
        this.selectedStop = null
      }
    }
}

</script>
