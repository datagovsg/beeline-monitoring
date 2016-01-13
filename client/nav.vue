<template>
    <ul>
        <li><a v-link="{ path: '/' }">Back</a></li>
        <li><a v-link="{ path: '/map/' + service}">Map</a></li>
        <li><a v-link="{ path: '/passengers/' + service}">Passenger List</a></li>
    </ul>
    <br clear="both">
</template>

<style scoped>
ul li {
    display: block;
    float: left;
    line-height: 1.5;
    padding: 5px;
    min-width: 50px;
    text-align: center;
}
</style>

<script>
module.exports = {
    props: ['service'],
}
</script>
