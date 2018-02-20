/**
 * A utility class to help you manage your polling queries.
 *
 * Has an `executeNow()` method. If you call this method, the
 * polling timer will be reset.
 *
 * Exposes the result of the current poll in the `promise` property.
 *
 * So if you are not interested in forcing a poll, you can just
 * extract the current result using `this.promise.then((result) => {...})`
 *
 * If you need to stop the polling, call the `stop()` method.
 *
 * In a Vue component:
 *
 * {
 *   created () {
 *     this.$poller = new PollingQuery(30000, () => this.requery()) // every 30s
 *   },
 *
 *   computed: {
 *     bunchOfDependencies () {
 *       return {this.queryFilters, this.queryPage, this.queryOptions, (etc.) }
 *     }
 *   },
 *
 *   watch: {
 *     bunchOfDependencies () { // Force an immediate update if the dependencies change
 *       this.$poller.executeNow()
 *     } // Otherwise, if there's no change, the poller will just execute 30s after the last query
 *   },
 * }
*/
export default class PollingQuery {
  constructor (interval, fn) {
    this.interval = interval
    this.timeout = null
    this.fn = fn

    this._execute()
  }

  clearTimeout () {
    if (this.timeout !== null) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
  }

  _execute () {
    this.promise = Promise.resolve(this.fn())

    this.promise
      .catch((err) => {console.log(err)})
      .then(() => {
        this.timeout = setTimeout(() => this._execute(), this.interval)
      })

    return this.promise
  }

  executeNow () {
    this.clearTimeout()
    return this._execute()
  }

  stop () {
    this.clearTimeout()
  }
}