<template>
<div class="sec-map">
    <navi :service="service"></navi>
    <h1>{{title}}</h1>
    <h2>{{subtitle}}</h2>
    <div class="map">
    </div>
</div>
</template>

<style>
div.sec-map .map {
    position: absolute;
    top: 40px;
    left: 0px;
    width: 100%;
    bottom: 0px;
    border: solid 2px red;
}
</style>

<script>

window.mapPromise = window.mapPromise || $.Deferred(function () {});
window.initMap = function () {
    mapPromise.resolve(true);
}
var authAjax = require('./login').authAjax;

module.exports = {
    data () {
        return {
            title: '',
            subtitle: '',

            service: null,
            pings: [],
            stops: [],
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

        mapPromise.then(function () {
            self.$map = {
                map: new google.maps.Map(self.$el.querySelector('.map'), {
                        zoom: 10,
                        center: {lat: 1.35, lng: 103.8},
                        }),
                infowindow: new google.maps.InfoWindow(),
                stopMarkers: [],
                pingMarkers: [],
            };
        });
    },

    watch: {
        service: function () {
            this.requery();
        },

        pings: function () {
            for (var i=0; i<this.$map.pingMarkers.length; i++) {
                this.$map.pingMarkers[i].setMap(null);
            }

            /* Draw start/end markers, the polyline
                and the intermediate pings */
            this.$map.pingMarkers = [];
            /* start */
            if (this.pings.length > 1) {
                this.$map.pingMarkers.push(new google.maps.Marker({
                    position: new google.maps.LatLng(
                        parseFloat(this.pings[0].latitude),
                        parseFloat(this.pings[0].longitude)
                    ),
                    title: 'Start',
                    map: this.$map.map,
                    icon: {
                        url: 'img/routeStartMarker.png',
                        size: new google.maps.Size(50, 40),
                        origin: new google.maps.Point(0,0),
                        anchor: new google.maps.Point(25, 40)
                    },
                }));
                /* end */
                this.$map.pingMarkers.push(new google.maps.Marker({
                    position: new google.maps.LatLng(
                        parseFloat(this.pings[this.pings.length - 1].latitude),
                        parseFloat(this.pings[this.pings.length - 1].longitude)
                    ),
                    title: 'Start',
                    map: this.$map.map,
                    icon: {
                        url: 'img/routeEndMarker.png',
                        size: new google.maps.Size(50, 40),
                        origin: new google.maps.Point(0,0),
                        anchor: new google.maps.Point(25, 40)
                    },
                }));
            }

            /* polyline */
            var busRunCoords = new google.maps.MVCArray();

            /* intermediate pings */
            for (var i=0; i<this.pings.length; i++) {
                var latlng= new google.maps.LatLng(
                          parseFloat(this.pings[i].latitude),
                          parseFloat(this.pings[i].longitude)
                        );
                var self = this;
                busRunCoords.push(latlng);
                if (i % 10 == 0) {
                    var marker = new google.maps.Marker({
                        position: latlng,
                        title: this.pings[i].timestamp.substr(11,8),
                        map: this.$map.map,
                        icon: {
                            url: 'img/routePtMarker.png',
                            size: new google.maps.Size(15, 15),
                            origin: new google.maps.Point(0,0),
                            anchor: new google.maps.Point(7, 7)
                        }
                    });
                    marker.addListener('mouseover', function () {
                        self.$map.infowindow.setPosition(this.getPosition());
                        self.$map.infowindow.setContent(this.title);
                        self.$map.infowindow.open(self.$map.map, this);
                    });
                    marker.addListener('mouseout', function () {
                        self.$map.infowindow.close();
                    });
                    this.$map.pingMarkers.push(marker);
                }
            }
            this.$map.pingMarkers.push(new google.maps.Polyline({
                strokeColor: '#33F',
                strokeOpacity: 1.0,
                strokeWeight: 2,
                map: this.$map.map,
                path: busRunCoords,
            }));
        },

        stops: function () {
            var bounds = new google.maps.LatLngBounds();

            for (var i=0; i<this.$map.stopMarkers.length; i++) {
                this.$map.stopMarkers[i].setMap(null);
            }
            this.$map.stopMarkers = [];

            for (var i=0; i<this.stops.length; i++) {
                var latlng = new google.maps.LatLng(
                                parseFloat(this.stops[i].latitude),
                                parseFloat(this.stops[i].longitude));
                bounds.extend(latlng);

                this.$map.stopMarkers.push(new google.maps.Marker({
                    position: latlng,
                    title: this.stops[i].time.substr(0,2) + ':' +
                           this.stops[i].time.substr(2,4),
                    map: this.$map.map,
                    icon: {
                        url: 'img/stop' + (this.stops[i].is_boarding ? 'Board' : 'Alight') +  (this.stops[i].stop_no) + '.png',
                        size: new google.maps.Size(100,100),
                        origin: new google.maps.Point(0,0),
                        anchor: new google.maps.Point(20,20),
                        scaledSize: new google.maps.Size(40,40),
                    }
                }));
            }

            this.$map.map.fitBounds(bounds);
        },
    },

    methods: {
        requery: function () {
            var self = this;
            console.log('asking for ' + this.service);

            authAjax('/get_pings/' + this.service, {
            })
            .done(function (pings) {
                self.pings = pings;
            });

            authAjax('/get_stops/' + this.service, {
            })
            .done(function (stops) {
                self.stops = stops;
            });
        },
    }
}

</script>
