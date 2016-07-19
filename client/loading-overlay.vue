<template>
    <div v-bind:class="{hide: hide}">
      <img src="img/spinner.svg">
    </div>
</template>

<script>
const Vue = require('vue');
const LoadingOverlay = require('./loading-overlay.js')

export default {
  data() {
    return {
      counter: null,
    }
  },
  created() {
    LoadingOverlay.registerOverlay(this)
  },
  destroyed() {
    LoadingOverlay.deregisterOverlay(this);
  },
  computed: {
    hide() {
      return !this.counter || this.counter.count == 0;
    }
  },
  events: {
    useCounter(counter) {
      this.counter = counter;
    }
  }

}

</script>
