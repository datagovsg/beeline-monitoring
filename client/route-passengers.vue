<template>
<div>
    <navi :service="service"></navi>
    <h1>{{title}}</h1>
    <h2>{{subtitle}}</h2>

    <div>
    <template v-for="stop in stops">
        <h3>{{stop.passengers[0].stop_name}}</h3>
        <h4>Boarding time: {{stop.passengers[0].time}}</h4>

        <div v-for="passenger in stop.passengers">
            {{passenger.index + 1}}.
            {{passenger.name}}
        </div>

    </template>
</div>
</template>

<style>
</style>

<script>

var authAjax = require('./login').authAjax;

module.exports = {
    data () {
        return {
            title: '',
            subtitle: '',

            service: null,
            stops: [],
        };
    },

    route: {
        activate() {
            this.service = this.$route.params.svc;
        },
    },

    watch: {
        service: function () {
            this.requery();
        },
    },

    ready: function () {
        this.requery();
    },

    methods: {
        requery: function (timeout) {
            clearTimeout(this.$timeout);

            timeout = timeout || 30000;

            var self = this;
            authAjax('/get_passengers/' + this.service, {
            })
            .done(function (passengers) {
                var stops = [];
                for (var i=0; i<passengers.length; i++) {
                    passengers[i].index = i;
                    if (stops.length == 0 ||
                        stops[stops.length-1].rsst_id_board != passengers[i].rsst_id_board) {
                        
                        stops.push({
                            rsst_id_board: passengers[i].rsst_id_board,
                            passengers: []
                        });
                    }

                    stops[stops.length-1].passengers.push(passengers[i]);
                    //console.log(passengers[i]);
                }
                self.stops = stops;
                self.$timeout = setTimeout(() => {self.requery(timeout);}, timeout);
            });
        },
    }
}

</script>
