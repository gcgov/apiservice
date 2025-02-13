class ApiError extends Error {
    public code: number|string = 0
    public data: any = {}
    public request: Request|undefined = undefined
    public response: Response|undefined = undefined
    public guid: string = ''

    constructor(
        message: string,
        code: number|string = 0,
        request: Request|undefined = undefined,
        response: Response|undefined = undefined,
        data: any = {},
        guid: string = ''
    ) {
        // Pass remaining arguments (including vendor specific ones) to parent constructor
        super(message)

        this.name = this.constructor.name;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApiError)
        }

        // Custom debugging information
        this.code = code
        this.data = data
        this.request = request
        this.response = response
        this.guid = guid
    }
}

export default ApiError;
