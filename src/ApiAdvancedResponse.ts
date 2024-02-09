import ApiRequestQueueItem from "./ApiRequestQueueItem";
import {AxiosResponse} from "axios";

class ApiAdvancedResponse {
    public id: string
    public response: Promise<AxiosResponse<any>>

    constructor(
        requestQueueItem: ApiRequestQueueItem,
        response: Promise<AxiosResponse<any>>
    ) {
        this.id = requestQueueItem.id
        this.response = response
    }
}

export default ApiAdvancedResponse;
