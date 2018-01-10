<template>
<div class="contents-with-nav">
  <navi :service="service"></navi>
  <div class="map-view">
    <div v-if="$route.query.time" class="filter-message">
      Showing known positions between
      {{formatTime(startTime)}} and
      {{formatTime(endTime)}}.

      <router-link :to="{path: '/map/' + service, query: {}}">
        Clear Filter
      </router-link>
    </div>
    <gmap-map ref="gmap" :center="{lng: 103.8, lat: 1.38}" :zoom="12">

      <gmap-marker v-for="(stop, index) in uniqueStops"
        :key="stop.id"
        :position="stopPosition(stop) "
        :icon="stopIcon(stop, index)" @mouseover='selectStop(stop)' @mouseout='closeWindow'>
      </gmap-marker>

      <gmap-info-window v-if="selectedStop != null" :opened='selectedStop != null' :position="stopPosition(selectedStop) ">
        Scheduled: {{formatTime(selectedStop.time)}}
        <div v-if="selectedStop.canBoard">
          No. of Passengers: {{selectedStop.passengers.length}}
        </div>
      </gmap-info-window>

      <gmap-info-window v-if="selectedPing != null" :opened="selectedPing != null" :position="coordinatesToLatLng(selectedPing.coordinates)">
        <div>
          {{formatTime(selectedPing.time)}}
        </div>
        <div v-if="driversById && driversById[selectedPing.driverId]">
          By: <b>{{driversById[selectedPing.driverId].transportCompanies[0].driverCompany.name}}</b>
        </div>
        <div v-if="vehiclesById && vehiclesById[selectedPing.vehicleId]">
          By: <b style="text-transform: uppercase">{{vehiclesById[selectedPing.vehicleId].vehicleNumber}}</b>
        </div>
      </gmap-info-window>

      <!-- <ping-line :pings="pings" :options="pingOptions" :sample-rate="5"></ping-line> -->

      <!-- Start and end markers -->
      <template v-for="(driverPings, driverId) in otherPings">
        <gmap-marker :position="firstPing(driverPings)"
          :icon="startPoint" title="Start">
        </gmap-marker>

        <gmap-marker :position="lastPing(driverPings)"
          :icon="endPoint" title="End">
        </gmap-marker>

        <ping-line :pings="driverPings" :options="otherPingOptions" :sample-rate="5"
          @selectPing="selectPing">
        </ping-line>
      </template>
    </gmap-map>
  </div>
</div>
</template>

<style lang="scss" scoped>
.contents-with-nav {
  display: flex;
  flex-direction: column;
}
.filter-message {
  padding: 0.5em;
  border: solid 1px #888;
}
.map-view {
  position: fixed;
  top: 90px;
  left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;

  .vue-map-container {
    flex: 1 1 auto;
  }
}
</style>

<script>
import PingLine from './ping-line.vue'
import leftPad from 'left-pad'
import Vue from 'vue'
import _ from 'lodash'
import assert from 'assert';
import querystring from 'querystring';

import {authAjax, sharedData} from './login';
import {
  watch
} from './loading-overlay';

module.exports = {
  components: {
    'ping-line': PingLine,
  },

  data() {
    return {
      title: '',
      subtitle: '',

      center: {
        lng: 103.8,
        lat: 1.38
      },
      zoom: 12,

      trip: {},
      driversById: {},
      pings: [],
      otherPings: {},
      stops: [],
      bounds: null,

      query: {
        time: null
      },

      selectedStop: null,
      selectedPing: null,
    };
  },

  created: function() {
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
    vehiclesById () {
      return sharedData.vehiclesById
    },
    service () {
      return this.$route.params.svc;
    },
    startPoint() {
      return {
        url: 'img/routeStartMarker.png',
        size: new google.maps.Size(50, 40),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(25, 40)
      };
    },
    endPoint() {
      return {
        url: 'img/routeEndMarker.png',
        size: new google.maps.Size(50, 40),
        origin: new google.maps.Point(0, 0),
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
    },

    startTime() {
      if (!this.$route.query.time) return null;
      let time = new Date(this.$route.query.time);
      return time.getTime() - 15 * 60000
    },
    endTime() {
      if (!this.$route.query.time) return null;
      let time = new Date(this.$route.query.time);
      return time.getTime() + 15 * 60000
    },

    uniqueStops() {
      return _.uniqBy(this.stops, 'stopId');
    }
  },

  watch: {
    service: {
      immediate: true,
      handler() {
        watch(this.requery()
          .then(() => {
            this.setBounds()
          }));
      }
    },

    'trip.route.transportCompanyId' (companyId) {
      authAjax(`/companies/${companyId}/drivers`)
        .then((result) => {
          this.driversById = _.keyBy(result.data, 'id')
        })
    },

    $route () {
      // Trigger map change
      Vue.nextTick(() => {
        if (this.$refs.gmap.$mapObject) {
          this.$refs.gmap.$mapObject.resizePreserveCenter()
          return;
        }
      });

      this.query.time = this.$route.query.time;
      this.requery();
    }
  },

  methods: {
    requery: function() {
      // This optionally tries to re-fetch the vehicles,
      // only if it had not been successfully fetched
      sharedData.fetchVehicles()

      var startTime = new Date();
      startTime.setHours(0, 0, 0, 0);

      // Pings of other drivers who also
      // claimed this trip id
      var pingsPromise;
      if (this.$route.query && this.$route.query.time) {
        pingsPromise = authAjax(`/trips/${this.service}/pingsByTripId?` +
          querystring.stringify({
            startTime: this.startTime,
            endTime: this.endTime,
          }))
      } else {
        pingsPromise = authAjax(`/trips/${this.service}/pingsByTripId?` +
          querystring.stringify({
            startTime: startTime.getTime(),
            limit: 800,
          }))
      }
      pingsPromise = pingsPromise.then((response) => {
        this.otherPings = _.groupBy(response.data, 'driverId');
      })

      var tripPromise = authAjax(`/trips/${this.service}`)
        .then(result => result.data);
      var passengersPromise = authAjax(`/trips/${this.service}/passengers`)
        .then(result => result.data);

      Promise.all([tripPromise, passengersPromise])
        .then(([trip, passengerData]) => {
          var stops = trip.tripStops;
          var passengers = passengerData;

          var passengersByStopId = _.groupBy(passengers, p => p.boardStopId)

          for (var i = 0; i < stops.length; i++) {
            stops[i].passengers = passengersByStopId[stops[i].id] || [];
          }

          this.trip = trip;
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
      if (this.$refs.gmap.$mapObject) {
        var bounds = new google.maps.LatLngBounds();
        var self = this;

        for (stop of this.stops) {
          var latlng = new google.maps.LatLng(
            stop.stop.coordinates.coordinates[1],
            stop.stop.coordinates.coordinates[0]);
          bounds.extend(latlng);
        }

        this.$refs.gmap.$mapObject.fitBounds(bounds);
      }
    },

    firstPing(pings) {
      return {
        lat: pings[pings.length - 1].coordinates.coordinates[1],
        lng: pings[pings.length - 1].coordinates.coordinates[0],
      }
    },

    lastPing(pings) {
      return {
        lat: pings[0].coordinates.coordinates[1],
        lng: pings[0].coordinates.coordinates[0],
      }
    },


      formatTime(sdt) {
        if (!(sdt instanceof Date)) {
          sdt = new Date(sdt);
        }
        return leftPad(sdt.getHours(), 1, '0')
          + ':' + leftPad(sdt.getMinutes(), 2, '0')
          + ':' + leftPad(sdt.getSeconds(), 2, '0');
      },

      stopIcon(stop, index) {
        return {
          url: 'img/stop' +
            (stop.canBoard ? 'Board' : 'Alight') +
            leftPad(index + 1, 3, '0') + '.png',
          size: new google.maps.Size(100, 100),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(20, 20),
          scaledSize: new google.maps.Size(40, 40),
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
      },

      /************** events ***************/
      selectPing(ping) {
        this.selectedPing = ping;
        this.selectedStop = null
      }
  },
}
</script>
