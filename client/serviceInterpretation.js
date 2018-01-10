

export const isPingGood = s => s.status.ping < 2
export const isDistanceGood = s => s.status.distance < 2
export const isServiceGood = s => isPingGood(s) && isDistanceGood(s)

export const hasNoPassengers = s => s.nobody &&
  (s.trip.route.tags.indexOf('notify-when-empty') === -1)
export const notYetTime = s => s.status.ping === -1 && s.status.distance === -1
export const isIgnorable = s => hasNoPassengers(s) && notYetTime(s)
