import Vue from 'vue'
import {loaded} from 'vue2-google-maps'
import leftPad from 'left-pad'

export default new Vue({
  data () {
    return {
      startPoint: null,
      endPoint: null,
      mapLoaded: false,
    }
  },

  created () {
    loaded.then(() => {
      _.assign(this, {
        mapLoaded: true,
        startPoint: {
          url: 'img/routeStartMarker.png',
          size: new google.maps.Size(200, 40),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(100, 40)
        },
        endPoint: {
          url: 'img/routeEndMarker.png',
          size: new google.maps.Size(200, 40),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(100, 40)
        }
      })
    })
  },

  methods: {
    stopIcon (stop, index) {
      return this.mapLoaded && {
        url: 'img/stop' +
          (stop.canBoard ? 'Board' : 'Alight') +
          leftPad(index + 1, 3, '0') + '.png',
        size: new google.maps.Size(100, 100),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(20, 20),
        scaledSize: new google.maps.Size(40, 40),
      }
    },
  }
})
