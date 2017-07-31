<template>
  <div class="overview">
    {{date}}
    <input type="text" v-model="filter" placeholder="Search for Route">
    <table>
        <thead>
        <tr>
            <th data-column="label"  @click="sortBy ='label'"
              style="width: calc(50% - 5em)">
              Route
            </th>
            <th data-column="led">App is on</th>
            <th data-column="led">ETA (1<sup>st</sup> stop)</th>
        </tr>
        </thead>
          <tr v-if="servicesByStartTime.length == 0">
            <td colspan="3">
                You have no bus services today.
                You might not be authorized to view the bus service status.
                Please contact the Beeline team if this is incorrect.
            </td>
          </tr>
          <template v-if="favourited.length">
            <tr>
              <th colspan="3">
                Favourite Routes
              </th>
            </tr>
            <RouteRow v-for="service in favourited"
              :key='service.trip.route.id'
              :isFavourite="true"
              :service="service" />
          </template>
          <template v-if="notFavourited.length">
            <tr>
              <th colspan="3">
                Remaining Routes
              </th>
            </tr>
            <RouteRow v-for="service in notFavourited"
              :key='service.trip.route.id'
              :isFavourite="false"
              :service="service" />
          </template>
    </table>
  </div>
</template>

<script>
var Vue = require('vue');
var _ = require('lodash')

var months = 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(',');
var tzo = (new Date()).getTimezoneOffset() * 60000;
var authAjax = require('./login').authAjax;
import {watch} from './loading-overlay';
const ServiceData = require('./service_data')
const Favourites = require('./favourites')
import RouteRow from './RouteRow.vue'

Date.prototype.localISO = function () {
    return (new Date(this.getTime() - tzo)).toISOString();
}

module.exports = {
    data() {
        return {
            services: {},
            sortBy: 'time',
            sortByTemplates: {
              time: ['trip.tripStops[0].time', 'trip.route.label'],
              label: ['trip.route.label', 'trip.tripStops[0].time'],
            },
            filter: '',
        };
    },
    components: {
      RouteRow
    },
    computed: {
        date: function () {
            // FIXME use server date?
            var d = new Date();
            return d.getDate() + ' ' +
                months[d.getMonth()] + ' ' +
                d.getFullYear();
        },

        servicesByStartTime: function () {
            var rv = [];
            var self = this;
            var ss = self.services;

            ss = _.values(ss)
            ss = _.orderBy(ss, this.sortByTemplates[this.sortBy]
              .map(t => s => _.get(s, t))
            )
            if (this.filter) {
              ss = ss.filter(s =>
                s.trip.route.from.toUpperCase().indexOf(this.filter.toUpperCase()) != -1
                ||
                s.trip.route.to.toUpperCase().indexOf(this.filter.toUpperCase()) != -1
                ||
                s.trip.route.label.toUpperCase().indexOf(this.filter.toUpperCase()) != -1
              )
            }

            return ss;
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
    created: function() {
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
        showService: function (svc) {
            if (mapVue)
                mapVue.service = svc;
        },
        requery: function(timeout) {
            var self = this;
            return authAjax('/monitoring', {
                method: 'GET',
            })
            .then(function (result) {
                ServiceData.services = self.services = result.data;
            })
            .then(null, function (err) {
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
