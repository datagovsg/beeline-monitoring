<!--

If you put an <input> in the ExpandingBox, normally it will share the width with
the controls in <slot=expanding-box-aux>.

However, when you focus on the <input> its width will become 100%

-->


<template>
  <div class="expanding-box">

    <div
      :style="expectedWidthStyle"
      class="expanding-box-main"
      @focusout="blur"
      @focusin="focus">
      <slot/>
    </div>

    <div
      :style="expectedWidthStyleAux"
      class="expanding-box-aux">
      <slot name="auxiliary"/>
    </div>
  </div>
</template>

<style lang="scss">
.expanding-box {
  display: flex;

  .expanding-box-main {
    flex: 1 1 auto;
  }

  .expanding-box-aux {
    flex: 1 1 auto;
    transition: width 0.1s;
  }
}

</style>

<script>
export default {
  props: {
    auxWidth: {
      type: String,
      required: true,
    }
  },

  data () {
    return {
      isFocused: false,
    }
  },

  computed: {
    expectedWidthStyle () {
      if (this.isFocused) {
        return {
          width: '100%'
        }
      } else {
        return {
          width: `calc(100% - (${this.auxWidth}))`
        }
      }
    },

    expectedWidthStyleAux () {
      if (this.isFocused) {
        return {
          width: '0',
          overflow: 'hidden',
        }
      } else {
        return {
          width: this.auxWidth,
          overflow: 'hidden',
        }
      }
    }
  },

  methods: {
    focus () {
      this.isFocused = true
    },
    blur () {
      this.isFocused = false
    }
  }
}
</script>