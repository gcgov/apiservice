class ApiError
	extends Error {
	constructor(message, code=0, data={}, guid='') {
		// Pass remaining arguments (including vendor specific ones) to parent constructor
		super(message)
		this.name = this.constructor.name;

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ApiError)
		}

		// Custom debugging information
		this.message = message
		this.code = code
		this.data = data
		this.guid = guid
	}
}
export default ApiError;
