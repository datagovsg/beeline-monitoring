<template>
  <div class="severity-filter">
    <label>
      <input type="checkbox" :checked="showOnlyFavourites"
        @change="change('showOnlyFavourites', $event)">
      <i class="mdi mdi-star favourite-button" />
    </label>
    <label>
      <input type="checkbox" :checked="showOK"
        @change="change('showOK', $event)">
      <RouteIndicator
        :upperIndicator="false"
        :lowerIndicator="false"
        :ignoreLower="false"
        :ignoreUpper="false"
        :noPassengers="false"
        />
    </label>
    <label>
      <input type="checkbox" :checked="showBad"
        @change="change('showBad', $event)">
      <RouteIndicator
        :upperIndicator="true"
        :lowerIndicator="true"
        :ignoreLower="false"
        :ignoreUpper="false"
        :noPassengers="false" />
    </label>
    <label>
      <input type="checkbox" :checked="showIgnorable"
        @change="change('showIgnorable', $event)">
      <RouteIndicator
        :upperIndicator="false"
        :lowerIndicator="false"
        :ignoreLower="true"
        :ignoreUpper="true"
        :noPassengers="true" />
    </label>
  </div>
</template>

<style lang="scss" scoped>
.route-indicator {
  display: inline-flex;
  flex-direction: column;
  width: 1.5em;
  height: 1.5em;
  margin: 0.05em;
  border: solid 1px #000;

  .indicator-half {
    flex: 1 1 auto;
    &.status-bad {
      background-color: #F00;
    }
    &:not(.status-bad) {
      background-color: #0F0;
    }
    &.status-ignore {
      background-color: #CCC;
    }
  }

  &.status-nobody {
    opacity: 0.3;
  }
}
</style>

<script>
import RouteIndicator from './RouteIndicator.vue'

export default {
  props: ['settings'],
  components: {
    RouteIndicator,
  },
  computed: {
    showOK () { return this.settings.showOK },
    showBad() { return this.settings.showBad },
    showIgnorable() { return this.settings.showIgnorable },
    showOnlyFavourites() { return this.settings.showOnlyFavourites },
  },
  methods: {
    change (which, event) {
      this.$emit('settingsChanged', {
        ...this.settings,
        [which]: event.target.checked,
      })
    }
  }
}
</script>
