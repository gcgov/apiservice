import ApiError from "./ApiError";

class ApiAuthError<TData = unknown>
	extends ApiError<TData> {
	constructor(message:string, code:number=0, data:TData={} as TData, guid:string='') {
		// Pass remaining arguments (including vendor specific ones) to parent constructor
		super(message, code, data, guid)

	}
}
export default ApiAuthError;
