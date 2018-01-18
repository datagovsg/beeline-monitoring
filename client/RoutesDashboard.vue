<template>
  <tbody>
    <tr>
      <th class="header-cell" @click="routeDetailsShown = !routeDetailsShown; scrollToMe()">
        {{ header }}
      </th>
    </tr>
    <tr class="indicator-row">
      <td @click="routeDetailsShown = !routeDetailsShown; scrollToMe()">
        <div class="flex-row">
          <transition-group name="expand" class="route-indicators" tag="div">
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
          <i class="expanded-indicator glyphicon glyphicon-chevron-right" v-if="!routeDetailsShown" />
          <i class="expanded-indicator glyphicon glyphicon-chevron-down" v-else />
        </div>
      </td>
    </tr>
    <transition name="expand">
      <tr v-if="routeDetailsShown || expanded">
        <td class="route-list-in-routes">
            <table v-if="routeDetailsShown || expanded" class="route-listing">
              <thead>
                <tr>
                  <th>Route</th>
                  <th style="text-align: center">Tracking</th>
                  <th style="text-align: center">On Time</th>
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
  tr{
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
