import ApiError from "./ApiError";

class ApiAuthError
	extends ApiError {
	constructor(message:string, code:number=0, data:any={}, guid:string='') {
		// Pass remaining arguments (including vendor specific ones) to parent constructor
		super(message, code, data, guid)

	}
}
export default ApiAuthError;
