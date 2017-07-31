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
  methods: {
    delayedFavourite($event) {
      this.wantFavourite = !this.wantFavourite
      this.emit()
    },
    emit: _.debounce(function () {
      this.$emit('click', this.wantFavourite)
    }, 2000, {leading: false, trailing: true})
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
