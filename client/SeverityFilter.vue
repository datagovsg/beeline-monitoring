<template>
  <div class="severity-filter">
    <button
      :class="{selected: showOnlyFavourites}"
      class="toggle-button"
      @click="toggleFavourites(!showOnlyFavourites)">
      <div class="glyphicon glyphicon-star favourite-button" />
    </button>
    <button
      :disabled="showOnlyFavourites"
      :class="{selected: showOK}"
      class="toggle-button"
      @click="change('showOK', !showOK)">
      <RouteIndicator
        :upperIndicator="false"
        :lowerIndicator="false"
        :ignoreLower="false"
        :ignoreUpper="false"
        :noPassengers="false"
      />
    </button>
    <button
      :disabled="showOnlyFavourites"
      :class="{selected: showBad}"
      class="toggle-button"
      @click="change('showBad', !showBad)">
      <RouteIndicator
        :upperIndicator="true"
        :lowerIndicator="true"
        :ignoreLower="false"
        :ignoreUpper="false"
        :noPassengers="false" />
    </button>
    <button
      :disabled="showOnlyFavourites"
      :class="{selected: showNoPassengers}"
      class="toggle-button"
      @click="change('showNoPassengers', !showNoPassengers)">
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


  &:first-of-type {
    border-top-left-radius: 0.2em;
    border-bottom-left-radius: 0.2em;
  }
  &:last-of-type {
    border-top-right-radius: 0.2em;
    border-bottom-right-radius: 0.2em;
  }

  // box-shadow: inset 0.2em 0.2em 0.2em #888;
  background: #fff;
  padding: 0.2em;
  margin: 0;
  border: solid 0.5px #ccc;
  min-height: 2.4em;

  &.selected {
    background-color: #F90;
  }

  &[disabled] {
    opacity: 0.5;
  }
}

.favourite-button {
  font-size: 20px;
  color: #FF0;
  text-shadow: 0px 0px 3px #000;
}

.severity-filter {
  display: inline-flex;
  flex-direction: row;
  width: 10.8em;

  & > button {
    flex: 0 0 2.7em;
    width: 2.7em;
  }
}
</style>

<script>
import RouteIndicator from './RouteIndicator.vue'

export default {
  components: {
    RouteIndicator,
  },
  props: {
    settings: { type: Object, required: true },
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
