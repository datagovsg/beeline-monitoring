import Vue from 'vue'

export default new Vue({
  data () {
    return {
      /**
       * This is the trip ID that the page "wants" to scroll to. This variable
       * will remain set to non-null until a component has "consumed" it and
       * scrolled the page to that particular trip.
       *
       * --
       *
       * We are not using events to denote a scroll request because events may be fired
       * when the page is not ready (e.g. the list of routes is still loading, so
       * we have nothing to scroll to).
       *
       * We are not using a queue, because at any point, you have only one
       * browser window, so you can only scroll to a single location. You could simply replace
       * scrollToTripId with the latest request.
       *
       * A component that provides a view into a `tripId` should mark this request
       * as met by setting `scrollToTripId = null`. A component that could potentially
       * meet a request to scroll to a particular `tripId` should watch this var, e.g.
       *
       * ScrollBus.$watch('scrollToTripId', (tripId) => {
       *   if (tripId !== null) {
       *     if (this.tripId === tripId) {
       *       // scroll to position as required
       *       ScrollBus.scrollToEl(this.$el)
       *
       *       // consume the request
       *       ScrollBus.scrollToTripId = null
       *     }
       *   }
       * })
       */
      scrollToTripId: null
    }
  },

  watch: {
    scrollToTripId (tripId) {
      console.log(`Scroll to ${tripId} requested`)
    }
  },

  methods: {
    scrollToEl (el) {
      let netTop = 0
      let curr = el
      while (curr) {
        netTop += curr.offsetTop
        curr = curr.offsetParent
      }
      console.log(el, `Scroll to`, netTop)
      window.scrollTo(0, netTop - 90) // header height
    }
  },
})
