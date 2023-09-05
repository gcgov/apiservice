import {AxiosResponse} from "axios";

class ApiAdvancedResponse {
	/**
	 *
	 * @param {ApiRequestQueueItem} requestQueueItem
	 * @param {Promise<AxiosResponse<any>>} response
	 */
	constructor(requestQueueItem, response) {
		this.id = requestQueueItem.id
		this.response = response
	}
}

export default ApiAdvancedResponse;
