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
                    lat: pings[0].latitude,
                    lng: pings[0].longitude,
                }"
                :icon="startPoint"
                :title="Start"
                >
            </gmap-marker>
            <gmap-marker
                v-if="pings.length > 0"
                :position="{
                    lat: pings[pings.length-1].latitude,
                    lng: pings[pings.length-1].longitude,
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
                    lat: ping.latitude,
                    lng: ping.longitude,
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
                    lat: selectedPing.latitude,
                    lng: selectedPing.longitude,
                }"
            >
            {{selectedPing.timestamp.substr(11,5)}}
            </gmap-infowindow>

            <gmap-infowindow
                v-if="selectedStop != null"
                :opened='selectedStop != null'
                :position="selectedStop | stopPosition"
            >
                Scheduled: {{selectedStop.time | formatTime}}
                <div v-if="selectedStop.is_boarding">
                No. of Passengers: {{selectedStop.passengers.length}}
                </div>
            </gmap-infowindow>

            <gmap-polyline
                :options="pings | polylineOptions"
            >
            </gmap-polyline>

            <gmap-marker
                v-for='stop in stops'
                track-by='$index'
                :position="stop | stopPosition"
                :icon='stop | stopIcon'
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

module.exports = {
    data () {
        return {
            title: '',
            subtitle: '',

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
                lat: parseFloat(ping.latitude),
                lng: parseFloat(ping.longitude),
            }));
            return {
                strokeColor: '#33F',
                strokeOpacity: 1.0,
                strokeWeight: 2,
                path: busRunCoords,
            }
        },

        stopPosition(stop) {
            return {
                lat: parseFloat(stop.latitude),
                lng: parseFloat(stop.longitude),
            };
        },
        stopIcon(stop) {
            // console.log(stop);
            return {
                url: 'img/stop' +
                    (stop.is_boarding ? 'Board' : 'Alight') +
                    (stop.stop_no) + '.png',
                size: new google.maps.Size(100,100),
                origin: new google.maps.Point(0,0),
                anchor: new google.maps.Point(20,20),
                scaledSize: new google.maps.Size(40,40),
            }
        },
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
            var self = this;
            console.log('asking for ' + this.service);

            authAjax('/get_pings/' + this.service, {
                cache: false,
            })
            .done(function (pings) {
                self.pings = pings;
            });

            var stopInfo = authAjax('/get_stops/' + this.service, {
            });
            var passengerInfo = authAjax('/get_passengers/' + this.service, {
            });

            return $.when(stopInfo, passengerInfo)
            .then(function (stopZ, passengerZ) {
                var stops = stopZ[0];
                var passengers = passengerZ[0];

                for (var i=0; i<stops.length; i++) {
                    stops[i].passengers = [];
                }

                // FIXME: fix this complexity thing

                for (var i=0; i<passengers.length; i++) {
                    for (var j=0; j<stops.length; j++) {
                        if (passengers[i].name && stops[j].rsst_id == passengers[i].rsst_id_board) {
                            stops[j].passengers.push(passengers[i]);
                        }
                    }
                }
                self.stops = stops;
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
                                parseFloat(stop.latitude),
                                parseFloat(stop.longitude));
                bounds.extend(latlng);
            }
            this.$refs.gmap.mapObject.fitBounds(bounds);
        },
    }
}

</script>
