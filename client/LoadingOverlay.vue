<template>
  <div 
    v-show="!hide" 
    class="loading-overlay">
    <img src="img/spinner.svg">
  </div>
</template>
<style>
.loading-overlay {
  text-align: center;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
}
</style>
<script>
import * as LoadingOverlay from './LoadingOverlay.js'

export default {
  data() {
    return {
      counter: null,
    }
  },
  computed: {
    hide() {
      return !this.counter || this.counter.count == 0;
    }
  },
  created() {
    LoadingOverlay.registerOverlay(this)
  },
  destroyed() {
    LoadingOverlay.deregisterOverlay(this);
  },
  methods: {
    useCounter(counter) {
      this.counter = counter;
    }
  }
}

</script>
