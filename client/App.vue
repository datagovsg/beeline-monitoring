<template>
  <div>
    <header>
      <div style="position: absolute; top: 0px; left: 0px;
          width: 40px; height: 40px"
        v-show="$route.path != '/'"
        class="backButton"
      >
        <router-link :to="{ path: '/' }">&#x25c0;</router-link>
      </div>

      <div style="position: absolute; left:40px; top:0px;
          height: 40px; right: 40px; text-overflow: ellipsis;
          overflow: hidden;
           font-size: 80%;line-height: 1.0 "
         v-if="$route.params.svc && ServiceData.services[$route.params.svc]"
      >
        {{ServiceData.services[$route.params.svc].stops[0].route_service_id}}:
        {{ServiceData.services[$route.params.svc].stops[0].from_name
            }}
            &mdash;
        {{ServiceData.services[$route.params.svc].stops[0].to_name
            }}
      </div>
      <div v-else
       style="position: absolute; left:40px; top:0px;
          height: 40px; right: 40px; text-overflow: ellipsis;"
      >
      Service Overview
      </div>
      <div style="position: absolute; top: 0px; right: 0px; font-size: 50%; margin: 3px; width: 45px;">
        <button onclick="Login.logOut()"
          class="btn btn-sm btn-default logout-button">
          <i class="mdi mdi-logout" />
        </button>
      </div>
    </header>

    <main v-cloak>
      <router-view keep-alive></router-view>
    </main>

    <loading-overlay id="loading-overlay">
    </loading-overlay>
  </div>
</template>
<script>
export default {
  data () {
    return {
      Login: require('./login'),
      ServiceData: require('./service_data')
    }
  },
}
</script>
