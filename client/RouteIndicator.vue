<template>
  <div 
    class="route-indicator"
    :title="title"
    :class="{ 'status-nobody': noPassengers }">
    <div 
      class="indicator-half"
      :class="{
        'status-bad': upperIndicator && !ignoreUpper,
        'status-ignore': ignoreUpper,
      }"
    />
    <div 
      class="indicator-half"
      :class="{
        'status-bad': lowerIndicator && !ignoreLower,
        'status-ignore': ignoreLower,
    }"/>
  </div>
</template>

<style lang="scss">
.route-indicator {
  display: inline-flex;
  flex-direction: row;
  width: 1.5em;
  height: 1.5em;
  margin: 0.05em;
  // border: solid 0.7px #000;
  border-radius: 0.75em;
  overflow: hidden;

  .indicator-half {
    flex: 1 1 auto;
    &.status-bad {
      background-color: #ff6f6f;
    }
    &:not(.status-bad) {
      background-color: #14c3a6;
    }
    &.status-ignore {
      background-color: #c9c9c9;
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
  props: ['upperIndicator', 'lowerIndicator',
    'ignoreLower', 'ignoreUpper', 'title',
    'noPassengers'],
}
</script>
