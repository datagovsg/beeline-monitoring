<template>
  <div>
    <b>Current Message:</b>
    <i v-if="currentMessage === null">Loading...</i>
    <i v-if="currentMessage === ''">(none)</i>
    <label>
      Use template:
      <select v-model="message">
        <option
          v-for="(template, index) in announcementTemplates"
          :key="index"
          :value="template[1]">
          {{ template[0] }}
        </option>
      </select>
    </label>
    <span
      v-if="currentMessage"
      class="message-box">
      {{ currentMessage }}

      <button
        class="message-button"
        type="button"
        @click.prevent="clearMessage">Clear message</button>
    </span>
    <form @submit.prevent="updateRouteAnnouncements">
      <div>
        <label>
          New message<br>
        </label>
        <textarea
          v-model="message"
          style="display: block; width: 100%; height: 100px"
          name="message"/>
      </div>
      <div>
        <button
          :disabled="!message"
          class="message-button"
          type="submit">
          Submit
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.message-box {
  border: solid 1px #888;
  background-color: #FFD;
  padding: 0.5em;
  font-size: 120%;
  display: inline-block;
}
label {
  display: block;
}
</style>

<script>
const {authAjax} = require('./login');
import AnnouncementTemplates from './announcement-templates'
import _ from 'lodash'

export default {
  props: {
    tripId: {
      type: Number,
      required: true,
    }
  },

  data() {
    return {
      message: AnnouncementTemplates[0][1],
      currentMessage: null,
    }
  },

  computed: {
    announcementTemplates(){
      return AnnouncementTemplates
    }
  },

  watch: {
    tripId: {
      immediate: true,
      handler() {
        this.requery();
      }
    }
  },

  created () {
    this.requery();
  },

  methods: {
    requery() {
      if (this.tripId) {
        authAjax(`/trips/${this.tripId}`, {
          method: 'GET',
        })
        .then(r => r.data.messages)
        .then((result) => {
          // Get and show the one with the latest time
          if (result.length === 0)
            this.currentMessage = '';
          else
            this.currentMessage = _.maxBy(result, 'time').message;
        })
        .then(() => {

        })
      } else {
        this.currentMessage = null;
      }
    },
    updateRouteAnnouncements() {
      authAjax(`/trips/${this.tripId}/messages`, {
          method: 'POST',
          data: {
            status: 'normal',
            message: this.message,
          }
      })
      .then(r => r.data)
      .then((result) => {
          this.requery();
      })
      .then(null, (err) => {
          alert("There was an error updating the announcements");
      })
      return false
    },
    clearMessage() {
      authAjax(`/trips/${this.tripId}/messages`, {
          method: 'POST',
          data: {
            status: 'normal',
            message: '',
          }
      })
      .then(r => r.data)
      .then((result) => {
          this.requery();
      })
      .then(null, (err) => {
          alert("There was an error updating the announcements");
      })
    }
  }
}

</script>
