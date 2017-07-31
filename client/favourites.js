import Vue from 'vue'
const _ = require('lodash')

module.exports = new Vue({
  data () {
    return {
      favourites: []
    }
  },
  created () {
    this.favourites = (window.localStorage['favourites'] || '').split(',')
      .map(s => parseInt(s))
      .filter(s => isFinite(s))
  },
  methods: {
    addFavourite (routeId) {
      routeId = parseInt(routeId)

      if (!this.favourites.includes(routeId)) {
        this.favourites.push(routeId)
      }
      this.updateStorage()
    },
    removeFavourite (routeId) {
      this.favourites = this.favourites.filter(f => f !== parseInt(routeId))
      this.updateStorage()
    },
    updateStorage () {
      window.localStorage.favourites = _.uniq(this.favourites).join(',')
    }
  }
})
