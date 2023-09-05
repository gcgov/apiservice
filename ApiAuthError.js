import ApiError from "./ApiError";

class ApiAuthError
	extends ApiError {
	constructor(message, code=0, data={}, guid='') {
		// Pass remaining arguments (including vendor specific ones) to parent constructor
		super(message, code, data, guid)

	}
}
export default ApiAuthError;
