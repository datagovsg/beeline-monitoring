import Vue from 'vue';
import Overview from './Overview.vue';
import MapView from './MapView.vue';
import App from './App.vue';
import Navi from './nav.vue';
import PassengerList from './PassengerList.vue';
import VueRouter from 'vue-router';
import VueResource from 'vue-resource';
import * as VueGoogleMaps from 'vue2-google-maps'
import LoadingOverlay from './loading-overlay.vue';
import * as Login from './login';
import 'mdi/scss/materialdesignicons.scss';

const ServiceData = require('./service_data')

Vue.use(VueResource);

Login.initAuth0();

Vue.component('navi', Navi);
Vue.component('loadingOverlay', LoadingOverlay);

window.Login = Login;

window.addEventListener('DOMContentLoaded', function () {
    Vue.use(VueRouter)
    Vue.use(VueGoogleMaps, {
      load: {
        key: 'AIzaSyDC38zMc2TIj1-fvtLUdzNsgOQmTBb3N5M'
      }
    });

    var router = new VueRouter({
      routes: [
        {
          path: '/',
          component: Overview,
        },
        {
          path: '/map/:svc',
          name: 'map-view',
          component: MapView,
        },
        {
          path: '/passengers/:svc',
          component: PassengerList,
        },
      ]
    });

    /* Load once... */
    Login.authAjax('/monitoring', {
        method: 'GET',
    })
    .then(function (result) {
        ServiceData.services = self.services = result.data
    })

    new Vue({
      data() { return {} },
      render(h) { return h(App) },
      router
    }).$mount('#app');
});
