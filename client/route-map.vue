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
                    lat: pings[0].coordinates.coordinates[1],
                    lng: pings[0].coordinates.coordinates[0],
                }"
                :icon="startPoint"
                :title="Start"
                >
            </gmap-marker>
            <gmap-marker
                v-if="pings.length > 0"
                :position="{
                    lat: pings[pings.length-1].coordinates.coordinates[1],
                    lng: pings[pings.length-1].coordinates.coordinates[0],
                }"
                :icon="endPoint"
                :title="End"
                >
            </gmap-marker>
            <!-- Pings -->
            <gmap-marker
                v-for='ping in pings | everyThree'
                track-by='$index'
                :position="{
                    lat: pings[0].coordinates.coordinates[1],
                    lng: pings[0].coordinates.coordinates[0],
                }"
                :icon="pingPoint"
                @g-mouseover='selectPing(ping)'
                @g-mouseout='closeWindow'
                >
            </gmap-marker>

            <gmap-infowindow
                v-if="selectedPing != null"
                :opened='selectedPing != null'
                :position="{
                    lat: selectedPing.coordinates.coordinates[1],
                    lng: selectedPing.coordinates.coordinates[0],
                }"
            >
            {{selectedPing.createdAt | takeLocalTime}}
            </gmap-infowindow>

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

            <gmap-polyline
                :options="pings | polylineOptions"
            >
            </gmap-polyline>

            <gmap-marker
                v-for="stop in stops"
                track-by='$index'
                :position="stop | stopPosition"
                :icon="stop | stopIcon $index"
                @g-mouseover='selectStop(stop)'
                @g-mouseout='closeWindow'
                >
            </gmap-marker>
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
import Vue from 'vue'

Vue.component('gmap-map', Map);
Vue.component('gmap-marker', Marker);
Vue.component('gmap-polyline', Polyline);
Vue.component('gmap-infowindow', InfoWindow);

var authAjax = require('./login').authAjax;
const _ = require('lodash')

module.exports = {
    data () {
        return {
            title: '',
            subtitle: '',

            center: {lng: 103.8, lat: 1.38},
            zoom: 12,

            service: null,
            pings: [],
            stops: [],
            bounds: null,

            selectedStop: null,
            selectedPing: null,
        };
    },

    route: {
        activate() {
            this.service = this.$route.params.svc;
        },
    },

    ready: function () {
        var self = this;
        this.$map = null;
        this.$queryInterval = setInterval(() => this.requery(), 10000);

        window.XXX = this;
    },

    destroyed() {
        clearInterval(this.$queryInterval);
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
        pingPoint() {
            return {
                url: 'img/routePtMarker.png',
                size: new google.maps.Size(15,15),
                origin: new google.maps.Point(0,0),
                anchor: new google.maps.Point(7, 7)
            };
        },
    },

    filters: {
        formatTime(sdt) {
            return sdt.substr(0,2) + ':' + sdt.substr(2,4);
        },
        everyThree(arr) {
            var copy = [];
            for (let i=0; i<arr.length; i+=3) {
                copy.push(arr[i]);
            }
            return copy;
        },

        polylineOptions(pings) {
            var busRunCoords = pings.map(ping => ({
                lat: ping.coordinates.coordinates[1],
                lng: ping.coordinates.coordinates[0],
            }));
            return {
                strokeColor: '#33F',
                strokeOpacity: 1.0,
                strokeWeight: 2,
                path: busRunCoords,
            }
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
        }
    },


    watch: {
        service: function () {
            this.requery()
            .then(() => {
                this.setBounds()
            });
        },
    },

    methods: {
        requery: function () {
            // Get the pings and other data
            authAjax(`/trips/${this.service}/latest_info`, {
                cache: false,
            })
            .then((data) => {
              var {pings, statuses} = data
              this.pings = pings;
              this.statuses = statuses;

              console.log(pings);
            });

            var stopInfo = authAjax(`/trips/${this.service}`, {
                cache: false,
            });
            var passengerInfo = authAjax(`/trips/${this.service}/get_passengers`, {
                cache: false,
            });

            return Promise.all([stopInfo, passengerInfo])
            .then((result) => {
                var [stopData, passengerData] = result;
                var stops = stopData.tripStops;
                var passengers = passengerData;

                var passengersByStopId = _.groupBy(passengers, p => p.boardStopId)

                for (var i=0; i<stops.length; i++) {
                    stops[i].passengers = passengersByStopId[stops[i].id] || [];
                }

                this.stops = stops;
            });

        },

        selectPing(ping) {
            this.selectedPing = ping;
            this.selectedStop = null
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
    }
}

</script>
