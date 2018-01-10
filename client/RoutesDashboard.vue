<template>
  <tbody>
    <tr>
      <th class="header-cell">
        {{ header }}

        <SeverityFilter
          @settingsChanged="$emit('visibilitySettingsChanged', $event)"
          :settings="visibilitySettings"
          />
      </th>
    </tr>
    <tr>
      <td @click="routeDetailsShown = !routeDetailsShown">
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
      <tr v-if="routeDetailsShown">
        <td>
            <table v-if="routeDetailsShown">
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

  props: ['routes', 'header', 'visibilitySettings'],
}
</script>
