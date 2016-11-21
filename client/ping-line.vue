<template>
<!-- Pings -->
  <template v-if="pings">
    <gmap-marker
                  v-for="ping in pings | everyN"
                  track-by="$index"
                  :position="{
                      lat: ping.coordinates.coordinates[1],
                      lng: ping.coordinates.coordinates[0],
                  }"
                  :icon="pingPoint"
                  @g-mouseover="selectPing(ping)"
                  >
    </gmap-marker>
  </template>

  <gmap-polyline v-if="pings" :options="polylineOptions" :path="pingPath">
  </gmap-polyline>
</template>

<script>
import {
  Map,
  load,
  InfoWindow,
  Polyline,
  Marker
} from 'vue-google-maps'
import leftPad from 'left-pad'
import Vue from 'vue'
import _ from 'lodash'

export default {
  components: {
    'gmap-marker': Marker,
    'gmap-polyline': Polyline,
    'gmap-infowindow': InfoWindow,
  },
  props: ['pings', 'options', 'sampleRate'],
  data() {
    return {
      selectedPing: null,
      selectedStop: null,
    }
  },
  computed: {
    pingPoint() {
      return {
        url: 'img/routePtMarker.png',
        size: new google.maps.Size(15, 15),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(7, 7)
      };
    },

    polylineOptions() {
      return _.defaults(this.options.polyline, {
        strokeColor: '#33F',
        strokeOpacity: 1.0,
        strokeWeight: 2,
      })
    },

    pingPath() {
      return this.pings.map(ping => ({
        lat: ping.coordinates.coordinates[1],
        lng: ping.coordinates.coordinates[0],
      }));
    }
  },
  methods: {
    selectPing(ping) {
      this.$dispatch('selectPing', ping);
    },
  },
  filters: {
    everyN(s) {
      return _.filter(s, (value, key) => key % this.sampleRate === 0)
    },
  }
}
</script>
