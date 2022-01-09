/**
 * The type of sanitized input.
 * 
 * Note: As users can obviously include `"__openstore_sanitized": true` in their input,
 * this should **not** be used as a runtime check.
 */
type Sanitized<T> = T & { __openstore_sanitized: true };
