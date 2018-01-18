<template>
  <tbody>
    <tr>
      <th class="header-cell" @click="routeDetailsShown = !routeDetailsShown; scrollToMe()">
        {{ header }}
      </th>
    </tr>
    <tr class="indicator-row">
      <td @click="routeDetailsShown = !routeDetailsShown; scrollToMe()">
        <i class="mdi mdi-menu-right" v-if="!routeDetailsShown" />
        <i class="mdi mdi-menu-down" v-else />
        <transition-group name="expand"
          >
          <RouteIndicator
            v-for="route in routes"
            :key="route.trip.route.id"
            :upperIndicator="route.status.ping >= 2"
            :lowerIndicator="route.status.distance >= 2"
            :ignoreUpper="route.status.ping === -1"
            :ignoreLower="route.status.distance === -1"
            :title="route.trip.route.label + ' - ' + route.trip.route.name"
            :noPassengers="route.nobody && (route.trip.route.tags.indexOf('notify-when-empty') === -1)"
            />
        </transition-group>
      </td>
    </tr>
    <transition name="expand">
      <tr v-if="routeDetailsShown || expanded">
        <td>
            <table v-if="routeDetailsShown || expanded">
              <thead>
                <tr>
                  <th>Route</th>
                  <th style="text-align: center">Switched on</th>
                  <th style="text-align: center">ETA</th>
                </tr>
              </thead>
              <!-- TODO: sort by priority -->
              <RouteRow v-for="route in routes"
                :key='route.id'
                :isFavourite="route.isFavourite"
                :service="route" />
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
</style>

<script>
import RouteIndicator from './RouteIndicator.vue'
import RouteRow from './RouteRow.vue'
import SeverityFilter from './SeverityFilter.vue'

export default {
  components: {
    RouteIndicator, RouteRow, SeverityFilter,
  },

  data () {
    return {
      routeDetailsShown: false,
    }
  },

  props: ['routes', 'header', 'visibilitySettings', 'expanded'],

  methods: {
    scrollToMe () {
      this.$nextTick(() => {
        window.scrollTo(0, this.$el.offsetTop)
      })
    }
  }
}
</script>