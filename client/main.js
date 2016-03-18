var Vue = require('vue');
var Overview = require('./overview.vue');
var Map = require('./route-map.vue');
var Navi = require('./nav.vue');
var PassengerList = require('./route-passengers.vue');
var VueRouter = require('vue-router');
import {load} from 'vue-google-maps'
var Login = require('./login');

Vue.use(VueRouter);
Vue.component('navi', Navi);

window.Login = Login;
window.ServiceData = { services: {} };

$(document).ready( function () {
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
    Login.authAjax('/current_status', {
        method: 'GET',
        dataType: 'json',
        cache: false,
    })
    .done(function (s) {
        window.ServiceData.services = self.services = s;
    })

    router.start(Vue.extend({
        data: function() {
            return {
                ServiceData: window.ServiceData,
            };
        }
    }), 'body');
});



