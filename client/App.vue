<template>
  <div>
    <header>
      <div style="position: absolute; top: 0px; left: 0px;
          width: 40px; height: 40px"
        v-show="$route.path != '/'"
      >
        <router-link :to="{ path: '/' }"
          class="btn btn-sm btn-default">
          <i class="mdi mdi-arrow-left" />
        </router-link>
      </div>

      <div style="position: absolute; left:40px; top:0px;
          height: 40px; right: 40px; text-overflow: ellipsis;
          overflow: hidden;
           font-size: 80%;line-height: 1.0 "
         v-if="$route.params.svc && ServiceData.servicesByRouteId[$route.params.svc]"
      >
        {{ServiceData.servicesByRouteId[$route.params.svc].stops[0].route_service_id}}:
        {{ServiceData.servicesByRouteId[$route.params.svc].stops[0].from_name}}
            &mdash;
        {{ServiceData.servicesByRouteId[$route.params.svc].stops[0].to_name}}
      </div>
      <div v-else
       style="position: absolute; left:40px; top:0px;
          height: 40px; right: 40px; text-overflow: ellipsis;"
      >
        {{ date }}
      </div>
      <div style="position: absolute; top: 0px; right: 0px; font-size: 50%; margin: 3px; width: 45px;">
        <button onclick="Login.logOut()"
          class="btn btn-sm btn-default logout-button">
          <i class="mdi mdi-logout" />
        </button>
      </div>
    </header>

    <main>
      <keep-alive>
        <router-view></router-view>
      </keep-alive>
    </main>

    <loading-overlay id="loading-overlay">
    </loading-overlay>
  </div>
</template>
<style lang="scss">

$height: 50px;

header {
  width: 100%;
  background-color: #493761;
  color: #FFF;
  font-size: 130%;
  line-height: 2.0;
  text-align: center;

  position: fixed;
  height: $height;
  top: 0px;
  left: 0px;
}

main {
    margin-top: $height;
    width: 100%;
}

.contents-with-nav {
    position: absolute;
    top: $height; /* must match <navi> height+ header height*/
    bottom: 0px;
    right: 0;
    left: 0;
    overflow: auto;
}

h1 {
    font-size: 20px;
}
h2 {
    font-size: 18px;
}
h3 {
    font-size: 16px;
}
h4 {
    font-size: 14px;
}
</style>
<script>
import dateformat from 'dateformat'

export default {
  data () {
    return {
      Login: require('./login'),
      ServiceData: require('./service_data')
    }
  },
  computed: {
    date () {
      return dateformat(new Date(), 'dddd, dd mmm yyyy')
    }
  }
}
</script>
