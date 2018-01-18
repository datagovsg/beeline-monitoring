<template>
  <div class="severity-filter">
    <button :class="{selected: showOnlyFavourites}"
        @click="toggleFavourites(!showOnlyFavourites)"
        class="toggle-button">
      <div class="mdi mdi-star favourite-button" />
    </button>
    <button :class="{selected: showOK}"
        @click="change('showOK', !showOK)"
        :disabled="showOnlyFavourites"
        class="toggle-button">
      <RouteIndicator
        :upperIndicator="false"
        :lowerIndicator="false"
        :ignoreLower="false"
        :ignoreUpper="false"
        :noPassengers="false"
        />
    </button>
    <button :class="{selected: showBad}"
        @click="change('showBad', !showBad)"
        :disabled="showOnlyFavourites"
        class="toggle-button">
      <RouteIndicator
        :upperIndicator="true"
        :lowerIndicator="true"
        :ignoreLower="false"
        :ignoreUpper="false"
        :noPassengers="false" />
    </button>
    <button :class="{selected: showNoPassengers}"
        @click="change('showNoPassengers', !showNoPassengers)"
        :disabled="showOnlyFavourites"
        class="toggle-button">
      <RouteIndicator
        :upperIndicator="false"
        :lowerIndicator="false"
        :ignoreLower="true"
        :ignoreUpper="true"
        :noPassengers="true" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.route-indicator {
  display: inline-flex;
  flex-direction: column;
  width: 1.2em;
  height: 1.2em;

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

.toggle-button {
  // box-shadow: inset 0.2em 0.2em 0.2em #888;
  border-radius: 0.2em;
  border: solid 0.75px #666;
  min-height: 2.5em;

  &.selected {
    background-color: #F90;
  }

  &[disabled] {
    opacity: 0.5;
  }
}

.favourite-button {
  font-size: 12px;
  color: #FF0;
  text-shadow: 0px 0px 3px #000;
}

.severity-filter {
  display: inline-flex;
  flex-direction: row;
  width: 13.5em;

  & > button {
    flex: 0 0 2.7em;
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
    showNotYet() { return this.settings.showNotYet },
    showNoPassengers() { return this.settings.showNoPassengers },
  },
  methods: {
    change (which, value) {
      this.$emit('settingsChanged', {
        ...this.settings,
        [which]: value,
      })
    },
    toggleFavourites (value) {
      this.$emit('settingsChanged', {
        showOnlyFavourites: value,
        showBad: false,
        showOK: false,
        showNotYet: false,
        showNoPassengers: false,
      })
    }
  }
}
</script>
