var Vue = require('vue');
var Overview = require('./overview.vue');
var Map = require('./route-map.vue');
var Navi = require('./nav.vue');
var PassengerList = require('./route-passengers.vue');
var VueRouter = require('vue-router');

Vue.use(VueRouter);
Vue.component('navi', Navi);

$(document).ready( () => {
    var router = new VueRouter();

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

    router.start(Vue.extend({}), '#app');
});



