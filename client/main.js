import Vue from 'vue';
import Overview from './Overview.vue';
import MapView from './MapView.vue';
import App from './App.vue';
import Navi from './nav.vue';
import PassengerList from './PassengerList.vue';
import VueRouter from 'vue-router';
import VueResource from 'vue-resource';
import * as VueGoogleMaps from 'vue2-google-maps'
import * as Login from './login';
import 'mdi/scss/materialdesignicons.scss';

const ServiceData = require('./ServiceDataStore')

Vue.use(VueResource);

Login.initAuth0();

Vue.component('Navi', Navi);

window.Login = Login;

window.addEventListener('DOMContentLoaded', function () {
    Vue.use(VueRouter)
    Vue.use(VueGoogleMaps, {
      load: {
        client: 'gme-infocommunications'
      }
    });

    var router = new VueRouter({
      routes: [
        {
          path: '/',
          component: Overview,
        },
        {
          path: '/map/:tripId',
          name: 'map-view',
          component: MapView,
          props: (route) => ({ tripId: parseInt(route.params.tripId) }),
        },
        {
          path: '/passengers/:tripId',
          name: 'passenger-list',
          component: PassengerList,
          props: (route) => ({ tripId: parseInt(route.params.tripId) }),
        },
        { // If users saved the old bookmark, it would take them to #!/
          // which needs to be redirected to #/
          path: '/:anything*',
          redirect: (to) => {
            if (to.fullPath.indexOf('access_token') === -1) {
              return '/'
            }
          },
        }
      ],

      scrollBehavior (to, from, savedPosition) {
        if (savedPosition) {
          return savedPosition
        } else {
          return { x: 0, y: 0 }
        }
      }
    });

    Login.postLoginPromise.then(() => {
      new Vue({
        data() { return {} },
        render(h) { return h(App) },
        router
      }).$mount('#app');
    })
});
