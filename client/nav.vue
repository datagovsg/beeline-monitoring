<template>
    <ul>
        <li><router-link :to="{ path: '/map/' + service}">Map</router-link></li>
        <li><router-link :to="{ path: '/passengers/' + service}">Passenger List</router-link></li>
    </ul>
</template>

<style scoped>
ul {
    padding: 0;
    margin: 0;
    position: absolute;
    height: 40px;
    background: #FFF;
    width: 100%;
    border: none;
    top: 0;
    left: 0;
    right: 0;
}
ul li {
    display: block;
    float: left;
    position: relative;
    border: none;
    height: 40px;
    width: 50%;
    text-align: center;
    padding: 10px;
    border-right: solid 1px #999;
    border-bottom: solid 1px #999;
}
ul li a {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    box-sizing: border-box;
    background-color: #ebeff2;
    padding: 10px;
}
</style>

<script>
module.exports = {
    props: ['service'],
}
</script>
