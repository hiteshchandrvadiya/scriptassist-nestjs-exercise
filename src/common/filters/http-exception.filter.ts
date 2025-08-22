import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Normalize error message
    let errorMessage: string | string[];
    let errorDetails: Record<string, any> | null = null;

    if (typeof exceptionResponse === 'string') {
      errorMessage = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const res = exceptionResponse as Record<string, any>;
      errorMessage = res.message || exception.message;
      errorDetails = { ...res };
      delete errorDetails.message; // don’t duplicate
    } else {
      errorMessage = exception.message || 'Unexpected error';
    }

    // Logging (client vs server errors)
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} -> ${status} | ${errorMessage}`,
        exception.stack,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} -> ${status} | ${errorMessage}`,
      );
    }

    // Consistent response format
    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message: errorMessage,
      ...(errorDetails ? { details: errorDetails } : {}),
    });
  }
}
