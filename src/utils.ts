export function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && Object.getPrototypeOf(value) === Object.prototype;
}
