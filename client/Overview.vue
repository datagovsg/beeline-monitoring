<template>
  <div class="overview">
    <ExpandingBox class="date-and-search" auxWidth="10.8em">
      <input type="text" v-model="filter" placeholder="Search for Route" style="width: 100%"
        class="form-control">
      <div slot="auxiliary">
        <SeverityFilter :settings="visibilitySettings" @settingsChanged="visibilitySettings = $event" />
      </div>
    </ExpandingBox>

    <table>
      <tr v-if="routesByHour.length == 0">
        <td colspan="3">
            You have no bus services today.
            You might not be authorized to view the bus service status.
            Please contact the Beeline team if this is incorrect.
        </td>
      </tr>

      <RoutesDashboard
        v-for="[hour, routesInHour] of routesByHour"
        v-if="routesInHour.length"
        :key="routesInHour.id"
        :routes="routesInHour"
        :header="dateformat(hour * 3600e3, 'h:MM TT', true)"
        @visibilitySettingsChanged="visibilitySettings = ($event)"
        :visibilitySettings="visibilitySettings"
        :data-hour="hour"
        :expanded="numResults < 10"
        :selectedTripId="lastSelectedTripId"
        ref="dashboards"
        @routeSelected="lastSelectedTripId = $event.trip.tripId"
        />
    </table>

  </div>
</template>

<style lang="scss">

.overview {
  padding-top: 40px;
}

.expanding-box {
  background-color: white;
  height: 40px;
  top: 40px;
  left: 0;
  width: 100%;
  position: fixed;
  z-index: 2;
}
</style>

<script>
var Vue = require('vue');
var _ = require('lodash')

var months = 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(',');
var tzo = (new Date()).getTimezoneOffset() * 60000;
import {authAjax, sharedData} from './login';
import {spinnerOn} from './LoadingOverlay';
const ServiceData = require('./ServiceDataStore')
const Favourites = require('./favourites')
import RouteRow from './RouteRow.vue'
import RoutesDashboard from './RoutesDashboard.vue'
import SeverityFilter from './SeverityFilter.vue'
import ExpandingBox from './ExpandingBox.vue'
import {isServiceGood, isPingGood, isDistanceGood,
        isIgnorable, notYetTime, hasNoPassengers} from './serviceInterpretation'
import dateformat from 'dateformat'

import PollingQuery from './utils/PollingQuery'
import ScrollBus from './utils/ScrollBus'

import {TRACKING_URL} from './env.json'

Date.prototype.localISO = function () {
    return (new Date(this.getTime() - tzo)).toISOString();
}

module.exports = {
    data() {
      return {
        servicesByRouteId: null,
        filter: '',
        actualFilter: '',
        selectedRoute: null,
        lastSelectedTripId: null,
        visibilitySettings:  {
          showOK: false,
          showBad: false,
          showNotYet: false,
          showNoPassengers: false,
          showOnlyFavourites: false,
        },
      };
    },
    components: {
      RouteRow, RoutesDashboard, SeverityFilter, ExpandingBox
    },
    computed: {
      authData: () => sharedData.authData,

      numResults () {
        return _.sum(this.routesByHour.map(([h, r]) => r.length))
      },

      routesByHour () {
        const ss = this.servicesByRouteId;

        if (!ss) return []

        const favouritesByRouteId = _.keyBy(Favourites.favourites)

        const result = _(ss)
          .values()
          .groupBy(
            s => (s.trip.startTime.getUTCHours() + 8) % 24
          )
          .toPairs()
          .map(([hour, routes]) => {
            return [
              hour,
              _.sortBy(routes, s => [s.trip.startTime, s.id])
                .map(r => ({
                  ...r,
                  isFavourite: r.trip.routeId in favouritesByRouteId,
                }))
            ]
          })
          .sortBy(x => parseInt(x[0]))
          .value()

        const filter = this.actualFilter
        const textFilteredResult = filter
          ? result.map(([hour, routes]) => [hour, routes.filter(s =>
            s.trip.route.from.toUpperCase().indexOf(filter.toUpperCase()) != -1
            ||
            s.trip.route.to.toUpperCase().indexOf(filter.toUpperCase()) != -1
            ||
            s.trip.route.label.toUpperCase().indexOf(filter.toUpperCase()) != -1
          )])
          : result

        const visibilityFilterResult =
          // everything false ==> no filter
          (!this.visibilitySettings.showBad && !this.visibilitySettings.showOK &&
            !this.visibilitySettings.showNotYet && !this.visibilitySettings.showNoPassengers &&
            !this.visibilitySettings.showOnlyFavourites)
            ? textFilteredResult
            // showOnlyFavourites ==> apply just this filter
            : textFilteredResult.map(([hour, routes]) => [
              hour,
              routes.filter(r => {
                return this.visibilitySettings.showOnlyFavourites
                  ? r.isFavourite
                  : (
                    (this.visibilitySettings.showNoPassengers && hasNoPassengers(r)) ||
                    (this.visibilitySettings.showOK && (isServiceGood(r) || notYetTime(r)) && !hasNoPassengers(r)) ||
                    (this.visibilitySettings.showBad && (!isServiceGood(r) || notYetTime(r)) && !hasNoPassengers(r))
                  )
              })
            ])

        return visibilityFilterResult
      },

      favouritesAndNotFavourites () {
        const favouritesByRouteId = _.keyBy(Favourites.favourites)
        return _.partition(
          this.servicesByStartTime,
          t => t.trip.routeId in favouritesByRouteId
        )
      },

      favourited () {
        return this.favouritesAndNotFavourites[0]
      },

      notFavourited () {
        return this.favouritesAndNotFavourites[1]
      }
    },
    watch: {
      authData() {
        this.requery()
      },

      filter: _.debounce(function () {
        this.actualFilter = this.filter
      }, 200),

      servicesByRouteId (s, prev) {
        if (s && !prev) {
          this.firstScroll()
        }
      }
    },

    created () {
      this.$poller = new PollingQuery(30000, () => this.requery())

      if (!ServiceData.servicesByRouteId) { // first time fetching -- show spinner
        spinnerOn(this.$poller.executeNow())
      } else {
        this.servicesByRouteId = ServiceData.servicesByRouteId
      }
    },

    beforeRouteEnter (to, from, next) {
      next((vm) => {
        if (from.params.tripId) {
          ScrollBus.scrollToTripId = parseInt(from.params.tripId)
        }
      })
    },

    destroyed() {
      this.$poller.stop()
    },

    methods: {
      dateformat,

      firstScroll () {
        this.$nextTick(() => {
          const firstAfterNow = this.$refs.dashboards.find(
            d => parseInt(d.$el.dataset.hour) >= ((new Date().getUTCHours() + 8) % 24)
          )

          if (firstAfterNow) {
            window.scrollTo(0, firstAfterNow.$el.offsetTop)
          }
        })
      },

      showService: function (svc) {
        if (mapVue)
          mapVue.service = svc;
      },

      requery () {
        return ServiceData.fetch()
          .then((result) => {
            this.servicesByRouteId = result;
          })
          .catch((err) => {
            console.log(err);
          })
      },
    },
}
</script>

<style lang="scss">

.overview {
  table {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;

  }
  td,th{
    padding: 0.5em;
  }
  th {
    border-top: solid 1px #ddd;
  }
  tr{
    margin: 0.5em;
  }
}

</style>
