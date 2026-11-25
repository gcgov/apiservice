/**
 * An error from the API or the API service.
 *
 * TData is the type of the error data. It is unknown by default, because the data comes from the
 * API response. Pass a type to describe the data your API returns, for example
 * `e as ApiError<{ message: string, fields: string[] }>`.
 */
class ApiError<TData = unknown> extends Error {
    public code: number|string = 0
    public data: TData
    public guid: string = ''

    constructor(
        message: string,
        code: number|string = 0,
        data: TData = {} as TData,
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
