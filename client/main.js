import Vue from 'vue';
import Overview from './overview.vue';
import Map from './route-map.vue';
import Navi from './nav.vue';
import PassengerList from './route-passengers.vue';
import VueRouter from 'vue-router';
import VueResource from 'vue-resource';
import {load} from 'vue-google-maps'
import LoadingOverlay from './loading-overlay.vue';
import * as Login from './login';

Vue.use(VueResource);

Login.initAuth0();

Vue.component('navi', Navi);
Vue.component('loadingOverlay', LoadingOverlay);

window.Login = Login;
window.ServiceData = { services: {} };

Vue.use(VueRouter);

window.addEventListener('DOMContentLoaded', function () {
    load({
        key: 'AIzaSyDC38zMc2TIj1-fvtLUdzNsgOQmTBb3N5M'
    });

    var router = new VueRouter({
        saveScrollPosition: true,
    });

    router.map({
        '/': {
            component: Overview,
        },
        '/map/:svc': {
            component: Map,
        },
        '/passengers/:svc': {
            component: PassengerList,
        },
    });

    /* Load once... */
    Login.authAjax('/monitoring', {
        method: 'GET',
    })
    .then(function (result) {
        window.ServiceData.services = self.services = result.json();
    })

    router.start(Vue.extend({
        data: function() {
            return {
                ServiceData: window.ServiceData,
            };
        }
    }), 'body');
});
