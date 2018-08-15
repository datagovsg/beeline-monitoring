<template>
  <div class="contents-with-nav">
    <navi :service="tripId"/>
    <div class="map-view">
      <div
        v-if="$route.query.time"
        class="filter-message">
        Showing known positions between
        {{ formatTime(startTime) }} and
        {{ formatTime(endTime) }}.

        <router-link :to="{path: '/map/' + tripId, query: {}}">
          Clear Filter
        </router-link>
      </div>
      <gmap-map
        ref="gmap"
        :center="{lng: 103.8, lat: 1.38}"
        :zoom="12"
        :options="{
          styles: [
            {
              featureType: 'poi',
              stylers: [{visibility: 'off'}]
            },
          ]
        }">

        <gmap-marker
          v-for="(stop, index) in uniqueStops"
          :key="stop.id"
          :position="stopPosition(stop) "
          :icon="MapIcons.stopIcon(stop, index)"
          @mouseover="selectStop(stop)"
          @mouseout="closeWindow"/>

        <gmap-info-window
          v-if="selectedStop != null"
          :opened="selectedStop != null"
          :position="stopPosition(selectedStop) ">
          Scheduled: {{ formatTime(selectedStop.time) }}
          <div v-if="selectedStop.canBoard">
            No. of Passengers: {{ selectedStop.passengers.length }}
          </div>
        </gmap-info-window>

        <gmap-info-window
          v-if="selectedPing != null"
          :opened="selectedPing != null"
          @closeclick="selectedPing = null"
          :position="coordinatesToLatLng(selectedPing.coordinates)">
          <div>
            {{ formatTime(selectedPing.time) }}
          </div>
          <div v-if="driversById && driversById[selectedPing.driverId]">
            By: <b>{{ driversById[selectedPing.driverId].transportCompanies[0].driverCompany.name }}</b>
          </div>
          <div v-if="vehiclesById && vehiclesById[selectedPing.vehicleId]">
            By: <b style="text-transform: uppercase">{{ vehiclesById[selectedPing.vehicleId].vehicleNumber }}</b>
          </div>
        </gmap-info-window>

        <!-- <PingLine :pings="pings" :options="pingOptions" :sample-rate="5"></PingLine> -->

        <!-- Start and end markers -->
        <template v-for="(driverPings, driverId) in otherPings">
          <gmap-marker
            :key="`start-${driverId}`"
            :position="firstPing(driverPings)"
            :icon="MapIcons.startPoint"
            title="Start Position"
          />

          <gmap-marker
            :key="`end-${driverId}`"
            :position="lastPing(driverPings)"
            :icon="MapIcons.endPoint"
            title="Last Position"
          />

          <PingLine
            :key="`ping-line-${driverId}`"
            :pings="driverPings"
            :options="otherPingOptions"
            :sampleRate="5"
            @selectPing="selectPing"
          />
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
import PingLine from './PingLine.vue'
import leftPad from 'left-pad'
import Vue from 'vue'
import PollingQuery from './utils/PollingQuery'
import MapIcons from './utils/MapIcons'
import _ from 'lodash'
import assert from 'assert';
import querystring from 'querystring';

import {TRACKING_URL} from './env.json'
import {authAjax, sharedData} from './login';
import {spinnerOn} from './LoadingOverlay';

module.exports = {
  props: ['tripId'],

  components: {
    PingLine,
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

      MapIcons,
    };
  },

  created: function() {
    this.$map = null;

    this.$poller = new PollingQuery(30000, () => {
      return this.requery()
    })
  },

  destroyed() {
    this.$poller.stop()
  },

  computed: {
    vehiclesById () {
      return sharedData.vehiclesById
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
    },
  },

  watch: {
    'trip.route.transportCompanyId' (companyId) {
      authAjax(`/companies/${companyId}/drivers`)
        .then((result) => {
          this.driversById = _.keyBy(result.data, 'id')
        })
    },

    tripId () {
      this.$poller.executeNow()
        .then(() => {
          this.setBounds()
        })
    }
  },

  beforeRouteEnter (to, from, next) {
    next(vm => vm.$nextTick(() => {
      vm.$gmapDefaultResizeBus.$emit('resize')
    }))
  },

  methods: {
    requery () {
      // This optionally tries to re-fetch the vehicles,
      // only if it had not been successfully fetched
      sharedData.fetchVehicles()

      if (!this.tripId) return Promise.resolve(null)

      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);

      const tripPromise = authAjax(`/trips/${this.tripId}`)
        .then(result => result.data);
      const passengersPromise = authAjax(`/trips/${this.tripId}/passengers`)
        .then(result => result.data);

      // Pings of other drivers who also claimed this trip id
      const queryParamsPromise = tripPromise.then((trip) => {
        const tripStartTime = new Date(_.minBy(trip.tripStops, 'time').time).getTime()
        const tripEndTime = new Date(_.maxBy(trip.tripStops, 'time').time).getTime()
        return this.$route.query && this.$route.query.time ? { from: this.startTime, to: this.endTime }
          : (Date.now() < tripEndTime) ? { from: midnight, limit: 1200 }
          : {from: tripStartTime - 30 * 60e3, to: tripEndTime + 60 * 60e3, limit: 1200}
      })

      const pingsPromise = queryParamsPromise.then((queryParams) =>
        authAjax(
          `/trips/${this.tripId}/pings?${querystring.stringify(queryParams)}`,
          { baseURL: TRACKING_URL }
        ).then((response) => {
          this.otherPings = _.groupBy(response.data, 'driverId');
        })
      )

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

      return Promise.all([tripPromise, passengersPromise, pingsPromise])
    },

    selectStop (stop) {
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
