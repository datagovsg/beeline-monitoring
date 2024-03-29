<template>
  <tbody>
    <tr>
      <th
        class="header-cell"
        @click="toggleRouteDetailsShown">
        {{ header }}
      </th>
    </tr>
    <tr class="indicator-row">
      <td @click="toggleRouteDetailsShown">
        <div class="flex-row">
          <transition-group
            name="expand"
            class="route-indicators"
            tag="div">
            <RouteIndicator
              v-for="route in routes"
              :key="route.trip.routeId"
              :upperIndicator="route.status.ping >= 2"
              :lowerIndicator="route.status.distance >= 2"
              :ignoreUpper="route.status.ping === -1"
              :ignoreLower="route.status.distance === -1"
              :title="route.trip.route.label + ' - ' + route.trip.route.name"
              :noPassengers="route.nobody && !route.notifyWhenEmpty"
            />
          </transition-group>
          <i
            v-if="!routeDetailsShown"
            class="expanded-indicator glyphicon glyphicon-chevron-right" />
          <i
            v-else
            class="expanded-indicator glyphicon glyphicon-chevron-down"/>
        </div>
      </td>
    </tr>
    <transition name="expand">
      <tr v-if="routeDetailsShown || expanded">
        <td class="route-list-in-routes">
          <table class="route-listing">
            <thead>
              <tr>
                <th>Route</th>
                <th style="text-align: center">Tracking</th>
                <th style="text-align: center">On Time</th>
              </tr>
            </thead>

            <RouteRow
              v-for="route in routes"
              ref="routeRows"
              :key="route.trip.routeId"
              :isFavourite="route.isFavourite"
              :service="route"
              :class="{ selected: selectedTripId === route.trip.tripId }"
              @routeSelected="$emit('routeSelected', $event)"
            />
          </table>
        </td>
      </tr>
    </transition>
  </tbody>
</template>

<style lang="scss">
.expand-enter-active, .expand-leave-active, .expand-item {
  transition: all 0.2s;
  transform-origin: top;
}
.expand-enter, .expand-leave-to {
  transform: scaleY(0);
}
.expand-enter-to, .expand-leave {
  transform: scaleY(1.0);
}

.expand-move {
  transition: all 0.2s;
}

.header-cell .severity-filter {
  float: right;
}

.indicator-row .route-indicator {
  vertical-align: middle;
}

.flex-row {
  display: flex;
  flex-direction: row;
  width: 100%;

  .route-indicators {
    flex: 1 1 0;
  }
  .expanded-indicator {
    padding: 0.2em;
    flex: 0 0 auto;
  }
}

.route-list-in-routes table {
  margin: 0.5em;
  tr {
    border-top: solid 1px #ddd;
  }
}

.route-listing{
  thead{
    color: #999;
    text-transform: uppercase;
    font-size: 0.8em;
  }
}

.selected .route-row {
  background-color: #FFC;
}
</style>

<script>
import RouteIndicator from './RouteIndicator.vue'
import RouteRow from './RouteRow.vue'
import SeverityFilter from './SeverityFilter.vue'
import ScrollBus from './utils/ScrollBus'

export default {
  components: {
    RouteIndicator, RouteRow, SeverityFilter,
  },

  props: {
    routes: {
      type: Array,
      required: true,
    },
    header: {
      type: String,
      required: true,
    },
    visibilitySettings: {
      type: Object,
      required: true,
    },
    expanded: {
      type: Boolean,
      default: false,
    },
    selectedTripId: {
      type: Number,
      default: null,
    }
  },

  data () {
    return {
      routeDetailsShown: false,
    }
  },

  mounted () {
    this.$unwatchScrollToTripId = ScrollBus.$watch('scrollToTripId', (tripId) => {
      if (tripId !== null &&
          !this.routeDetailsShown &&
          this.routes.find(r => r.trip.tripId === tripId)) {

        this.routeDetailsShown = true
        // Event will be consumed by RouteRow when it appears
      }
    })
  },

  destroyed () {
    if (this.$unwatchScrollToTripId) {
      this.$unwatchScrollToTripId()
    }
  },

  methods: {

    scrollToMe () {
      this.$nextTick(() => {
        ScrollBus.scrollToEl(this.$el)
      })
    },

    toggleRouteDetailsShown () {
      this.routeDetailsShown = !this.routeDetailsShown
      if (this.routeDetailsShown) {
        this.scrollToMe()
      }
    }
  }
}
</script>
