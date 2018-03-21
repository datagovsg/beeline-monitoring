import Vue from 'vue';
import {authAjax, sharedData} from './login';
import {TRACKING_URL} from './env.json'

module.exports = new Vue({
  data: {
    servicesByRouteId: null,
  },

  methods: {
    fetch (soft=false) {
      if (soft && this.$dataPromise) {
        return this.$dataPromise
      }

      this.$dataPromise = authAjax('/monitoring', { baseURL: TRACKING_URL })
        .then((result) => {
          // Convert the time fields
          Object.keys(result.data).forEach(routeId => {
            const service = result.data[routeId]
            if (service.trip && service.trip.startTime) {
              service.trip.startTime = new Date(service.trip.startTime)
            }
          })

          this.servicesByRouteId = result.data;
          return result.data
        })
      return this.$dataPromise
    }
  }
})
