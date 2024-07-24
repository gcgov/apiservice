import ApiRequestQueueItem from "./ApiRequestQueueItem";

class ApiAdvancedResponse {
    public id: string
    public response: Promise<Response>

    constructor(
        requestQueueItem: ApiRequestQueueItem,
        response: Promise<Response>
    ) {
        this.id = requestQueueItem.id
        this.response = response
    }
}

export default ApiAdvancedResponse;
