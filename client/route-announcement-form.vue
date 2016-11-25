<template>
  <div>
    <b>Current Message:</b>
    <i v-if="currentMessage === null">Loading...</i>
    <i v-if="currentMessage === ''">(none)</i>
    <span class="message-box" v-if="currentMessage">
      {{currentMessage}}
    </span>
  </div>
  <form @submit="updateRouteAnnouncements">
    <div>
      <label>
        New message (leave blank to clear the message)<br/>
        <textarea v-model="message"
            style="display: block; width: 100%; height: 100px"
            name="message"></textarea>
      </label>
    </div>
    <div>
      <button class="message-button" type="submit">Submit</button>
    </div>
  </form>
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

export default {
  props: ['tripId'],

  data() {
    this.requery();
    return {
      message: '',
      currentMessage: null,
    }
  },

  watch: {
    tripId() {
      this.requery();
    }
  },

  methods: {
    requery() {
      if (this.tripId) {
        authAjax(`/trips/${this.tripId}/statuses`, {
          method: 'GET',
        })
        .then(r => r.json())
        .then((result) => {
          // Get and show the one with the latest time
          if (result.length === 0)
            this.currentMessage = '';
          else
            this.currentMessage = _.maxBy(result, 'createdAt').message;
        })
        .then(() => {

        })
      } else {
        this.currentMessage = null;
      }
    },
    updateRouteAnnouncements($event) {
      event.preventDefault()

      authAjax(`/trips/${this.tripId}/statuses`, {
          method: 'POST',
          body: {
            status: 'normal',
            message: this.message,
          }
      })
      .then(r => r.json())
      .then((result) => {
          this.requery();
      })
      .then(null, (err) => {
          alert("There was an error updating the announcements");
      })
      return false
    }
  }
}

</script>
