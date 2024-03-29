<template>
  <tbody>
    <tr
      :class="{
        emergency: service.trip.cancelled,
        nobody: service.nobody && !service.notifyWhenEmpty,
      }"
      class="route-row"
    >
      <td>
        <div class="service-description">
          <FavouriteButton
            :isFavourite="isFavourite"
            class="favourite-button"
            @click="setFavourite($event, service.trip.routeId)"
          />

          <div class="label-and-description">
            <div class="service-name">
              <big>{{ service.trip.route.label }}</big>
              ({{ service.trip.routeId }})
              {{ takeTime(service.trip.startTime) }}
            </div>

            <div class="from-and-to">
              {{ service.trip.route.from }}<br>
              {{ service.trip.route.to }}
            </div>
          </div>
        </div>
      </td>
      <td data-column="led">
        <router-link
          :to="{name: 'map-view', params: {tripId: service.trip.tripId}}"
          :class="{
            led: true,
            s0 : service.status.ping == 0,
            s1 : service.status.ping == 1,
            s2 : service.status.ping == 2,
            s3 : service.status.ping >= 3,
            sU : service.status.ping == -1,
          }"
          @click.native="$emit('routeSelected', service)">
          <template v-if="service.status.arrivalTime">
            (arrived)
          </template>
          <template v-else>
            <template v-if="service.lastPing">
              {{ humanizeRelative(service.lastPing) }}
            </template>
          </template>
        </router-link>
      </td>
      <td data-column="led">
        <router-link
          :to="{name: 'map-view', params: {tripId: service.trip.tripId}}"
          :class="{
            led: true,
            s0 : service.status.distance == 0,
            s1 : service.status.distance == 1,
            s2 : service.status.distance == 2,
            s3 : service.status.distance >= 3,
            sU : service.status.distance == -1,
          }"
          @click.native="$emit('routeSelected', service)"
        >
          <template v-if="service.status.arrivalTime">
            {{ takeTime(service.status.arrivalTime) }} (arrived)
          </template>
          <template v-else>
            {{ takeTime(service.status.eta) }} (est)
          </template>
        </router-link>
      </td>
    </tr>
  </tbody>
</template>

<style lang="scss">
  tr {
    .emergency td {
      background-color: #FFECEC;
    }

    .nobody td {
      opacity: 0.3;
      background-color: #ccc;
    }
  }

  th, td {
    padding: 0.5em;

    &[data-column="route"] {
      min-width: 60px;
    }
    &[data-column="led"] {
      width: 60px;
    }
    &[data-column="next"] {
      width: 20px;
      position: relative;

      &:hover {
        background-color: #dddddd;
      }
    }
  }

  .service-description {
    display: flex;
    flex-direction: row;
    width: 100%;

    .favourite-button {
      flex: 0 0 auto;
      display: block;
      margin: 0.1em;
      font-size: 150%;
    }

    .label-and-description {
      flex: 1 1 auto;
      flex-direction: column;

      .service-name {
        color: #666;
        font-size: 80%;
      }
    }
  }

  .led {
    color: #000;
    display: block;
    min-width: 50px;
    min-height: 50px;
    border-radius: 25px;
    box-sizing: border-box;
    margin: 10px;
    text-align: center;
    overflow: visible;
    font-size: 80%;
    line-height: 1.3;
    padding-top: 0.4em;
  }

  .led {
    &.sU {
      background-color: #c9c9c9;
    }
    &.s0, &.s1 {
      background-color: #14c3a6;
    }
    &.s2, &.s3 {
      background-color: #ff6f6f;
    }
  }

  .details_button {
      display: block;
      width: 100%;
      position: absolute;
      top: 0px;
      bottom: 0px;
      left: 0px;
  }
</style>

<script>
import FavouriteButton from './FavouriteButton.vue'
import ScrollBus from './utils/ScrollBus'
const Favourites = require('./favourites')

export default {
  components: {
    FavouriteButton,
  },
  props: {
    service: {
      type: Object,
      required: true,
    },
    isFavourite: {
      type: Boolean,
      required: true,
    }
  },
  mounted () {
    // Note: this is rather inefficient, because it's an O(n), where n == number of rows
    // But it shouldn't be a big problem
    this.$unwatchScrollToTripId = ScrollBus.$watch('scrollToTripId', (tripId) => {
      if (tripId !== null &&
          tripId === this.service.trip.tripId) {
        ScrollBus.scrollToTripId = null
        // Need to wait for $nextTick in order to guarantee in-document
        // https://vuejs.org/v2/api/#mounted
        this.$nextTick(() => {
          ScrollBus.scrollToEl(this.$el)
        })
      }
    }, {immediate: true})
  },

  destroyed () {
    if (this.$unwatchScrollToTripId) {
      this.$unwatchScrollToTripId()
    }
  },

  methods: {
    setFavourite(isFav, routeId) {
      if (isFav) {
        Favourites.addFavourite(routeId)
      } else {
        Favourites.removeFavourite(routeId)
      }
    },


    /*************** Filters ***************/
    humanizeRelative (dt) {
      if (!dt) {
        return ''
      } else {
        const difference = Date.now() - (new Date(dt.time)).getTime()
        const magnitude = Math.abs(difference)

        const interval = (magnitude < 60000) ? `${Math.round(magnitude / 1000)}s`
          : (magnitude < 3600e3) ? `${Math.round(magnitude / 60e3)} mins`
          : `${Math.round(magnitude / 3600e3)} hrs`

        return interval + ' ' + (difference > 0 ? 'ago' : 'in the future')
      }
    },
    takeTime (dt, t) {
        if (dt) {
            return (new Date(dt)).localISO().substr(11,5);
        }
        return '';
    },
    firstStopETA (svc) {
        if (svc.lastPing) {
            var time_part = new Date(svc.lastPing.time);
            var distance = svc.lastPing.distance;

            var hours = (distance / 1000 / 60);
            var estimatedArrivalTime = new Date(time_part.getTime() + hours*60*60*1000);

            return estimatedArrivalTime.localISO().substr(11,5);
            //var arrival_time = new Date(firstStop.time);
            //arrival_time.setHours(parseInt(firstStop.time.substr(0,2)));
            //arrival_time.setMinutes(parseInt(firstStop.time.substr(2,4)));
            //arrival_time.setSeconds(0);
        }


        return '';
    },
  },
}
</script>
