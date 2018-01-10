<template>
  <div class="overview">
    <div class="date-and-search">
      <div>{{date}}</div>
      <input type="text" v-model="filter" placeholder="Search for Route">
    </div>
    <table>
      <!-- <thead>
        <tr>
          <th data-column="label"  @click="sortBy ='label'"
            style="width: calc(50% - 5em)">
            Route
          </th>
        </tr>
      </thead> -->
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
        :header="hour + ':00 hrs'"
        @visibilitySettingsChanged="visibilitySettings = ($event)"
        :visibilitySettings="visibilitySettings"
        :data-hour="hour"
        ref="dashboards"
        />

      <tfoot>
        <tr>
          <th>
            Filters:
            <SeverityFilter :settings="visibilitySettings"
              @settingsChanged="visibilitySettings = ($event)" />
          </th>
        </tr>
      </tfoot>
    </table>

  </div>
</template>

<style lang="scss">
.date-and-search {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0.2em;
  & > * {
    margin: 0.2em;
  }
  input {
    flex: 1 1 auto;
    padding: 0.2em;
  }
}
</style>

<script>
var Vue = require('vue');
var _ = require('lodash')

var months = 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(',');
var tzo = (new Date()).getTimezoneOffset() * 60000;
import {authAjax, sharedData} from './login';
import {watch} from './loading-overlay';
const ServiceData = require('./service_data')
const Favourites = require('./favourites')
import RouteRow from './RouteRow.vue'
import RoutesDashboard from './RoutesDashboard.vue'
import SeverityFilter from './SeverityFilter.vue'
import {isServiceGood, isPingGood, isDistanceGood,
        isIgnorable, notYetTime, hasNoPassengers} from './serviceInterpretation'

Date.prototype.localISO = function () {
    return (new Date(this.getTime() - tzo)).toISOString();
}

module.exports = {
    data() {
      return {
        servicesByRouteId: null,
        sortBy: 'time',
        sortByTemplates: {
          time: ['trip.tripStops[0].time', 'trip.route.label'],
          label: ['trip.route.label', 'trip.tripStops[0].time'],
        },
        filter: '',
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
      RouteRow, RoutesDashboard, SeverityFilter
    },
    computed: {
      authData: () => sharedData.authData,

      date: function () {
        // FIXME use server date?
        var d = new Date();
        return d.getDate() + ' ' +
            months[d.getMonth()] + ' ' +
            d.getFullYear();
      },

      routesByHour () {
        const ss = this.servicesByRouteId;

        if (!ss) return []

        const favouritesByRouteId = _.keyBy(Favourites.favourites)

        const result = _(ss)
          .values()
          .groupBy(
            s => (s.trip.tripStops[0].time.getUTCHours() + 8) % 24
          )
          .toPairs()
          .map(([hour, routes]) => {
            return [
              hour,
              _.sortBy(routes, s => [s.trip.tripStops[0].time, s.id])
                .map(r => ({
                  ...r,
                  isFavourite: r.trip.routeId in favouritesByRouteId,
                }))
            ]
          })
          .sortBy(x => parseInt(x[0]))
          .value()


        const textFilteredResult = this.filter
          ? result.map(([hour, routes]) => [hour, routes.filter(s =>
            s.trip.route.from.toUpperCase().indexOf(this.filter.toUpperCase()) != -1
            ||
            s.trip.route.to.toUpperCase().indexOf(this.filter.toUpperCase()) != -1
            ||
            s.trip.route.label.toUpperCase().indexOf(this.filter.toUpperCase()) != -1
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
                    (this.visibilitySettings.showNotYet && notYetTime(r) && !hasNoPassengers(r)) ||
                    (this.visibilitySettings.showNoPassengers && hasNoPassengers(r)) ||
                    (this.visibilitySettings.showOK && isServiceGood(r) && !hasNoPassengers(r) && !notYetTime(r)) ||
                    (this.visibilitySettings.showBad && !isServiceGood(r))
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

      servicesByRouteId (s, prev) {
        if (s && !prev) {
          this.firstScroll()
        }
      }
    },
    created () {
      var queryAgain = () => {
        this.$queryTimeout = null;
        return this.requery()
          .catch((err) => console.error(err))
          .then(() => {
            if (this.$queryTimeout === null) {
              this.$queryTimeout = setTimeout(queryAgain, 20000);
            }
          })
      };
      watch(queryAgain());
    },
    destroyed() {
      if (this.$queryTimeout) {
        clearTimeout(this.$queryTimeout);
      }
      this.$queryTimeout = false;
    },
    methods: {
      firstScroll () {
        this.$nextTick(() => {
          const firstAfterNow = this.$refs.dashboards.find(
            d => parseInt(d.$el.dataset.hour) >=
              18
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

      requery (timeout) {
        return authAjax('/monitoring', {
          method: 'GET',
        })
        .then((result) => {
          // Convert the time fields
          Object.keys(result.data).forEach(routeId => {
            const service = result.data[routeId]
            service.trip.tripStops.forEach(ts => {
              ts.time = new Date(ts.time)
            })
          })
          ServiceData.servicesByRouteId = this.servicesByRouteId = result.data;
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
  th {
      background-color: #EBEFF2;
      color: #493761;
      font-size: 80%;
      height: 30px;
  }
}

</style>
