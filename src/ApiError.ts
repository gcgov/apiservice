class ApiError extends Error {
    public code: number|string = 0
    public data: any = {}
    public guid: string = ''

    constructor(
        message: string,
        code: number|string = 0,
        data: any = {},
        guid: string = ''
    ) {
        // Pass remaining arguments (including vendor specific ones) to parent constructor
        super(message)

        this.name = this.constructor.name;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        const v8Error = Error as ErrorConstructor & {
            captureStackTrace?: (targetObject: object, constructorOpt?: unknown) => void
        }
        if (v8Error.captureStackTrace) {
            v8Error.captureStackTrace(this, ApiError)
        }

        // Custom debugging information
        this.code = code
        this.data = data
        this.guid = guid
    }
}

export default ApiError;
