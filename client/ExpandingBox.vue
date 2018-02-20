<!--

If you put an <input> in the ExpandingBox, normally it will share the width with
the controls in <slot=expanding-box-aux>.

However, when you focus on the <input> its width will become 100%

-->


<template>
  <div class="expanding-box">

    <div class="expanding-box-main" :style="expectedWidthStyle" @focusout="blur" @focusin="focus">
      <slot>
      </slot>
    </div>

    <div class="expanding-box-aux" :style="expectedWidthStyleAux">
      <slot name="auxiliary">
      </slot>
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
  props: ['auxWidth'],

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