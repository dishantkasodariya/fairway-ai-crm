/** Thrown when a lease would take more space than the warehouse can give; maps to HTTP 409. */
export class LeaseCapacityError extends Error {
  status = 409;
}

/** Thrown for bad input, a missing record or a closed deal; carries its HTTP status. */
export class DealError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
