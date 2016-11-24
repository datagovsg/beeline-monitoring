<template>
  <form @submit="updateRouteAnnouncements">
      <textarea v-model="message"
          style="display: block; width: 100%; height: 100px"
          name="message"></textarea>
      <button class="message-button" type="submit">Submit</button>
  </form>
</template>

<script>
const {authAjax} = require('./login');

export default {
  props: ['tripId'],
  
  data() {
    return {
      message: '',
    }
  },

  methods: {
    updateRouteAnnouncements($event) {
      event.preventDefault()

      authAjax(`/trips/${this.tripId}/statuses`, {
          method: 'POST',
          body: {
            status: 'normal',
            message: this.message,
          }
      })
      .then(() => {
          alert("Announcement updated!");
      })
      .then(null, (err) => {
          alert("There was an error updating the announcements");
      })
      return false
    }
  }
}

</script>
