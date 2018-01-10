<template>
    <i class="mdi mdi-star favourite-button"
      :class="{
        isFavourite: wantFavourite
        }"
      @click="delayedFavourite"
    />
</template>

<script>
import _ from 'lodash'

export default {
  props: ['isFavourite'],
  data () {
    return {
      wantFavourite: null,
    }
  },
  watch: {
    isFavourite: {
      immediate: true,
      handler() {
        this.wantFavourite = this.isFavourite
      }
    }
  },
  created () {
    // Cannot declare under methods because
    // we need a unique debouncer for every instance
    this.emit = _.debounce(function () {
      this.$emit('click', this.wantFavourite)
    }, 200, {leading: false, trailing: true})
  },
  methods: {
    delayedFavourite($event) {
      this.wantFavourite = !this.wantFavourite
      this.emit()
    },
  }
}
</script>

<style>
.favourite-button {
  cursor: pointer;
}
.favourite-button.isFavourite {
  color: #FF0;
  text-shadow: 0px 0px 3px #000;
}
</style>
