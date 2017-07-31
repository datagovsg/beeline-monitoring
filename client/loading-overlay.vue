<template>
    <div :class="{hide: hide}">
      <img src="img/spinner.svg">
    </div>
</template>

<script>
import * as LoadingOverlay from './loading-overlay.js'

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
  methods: {
    useCounter(counter) {
      this.counter = counter;
    }
  }
}

</script>
