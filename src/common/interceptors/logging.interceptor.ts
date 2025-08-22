import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, query, params, user } = req;
    const now = Date.now();

    // ✅ 1. Log incoming requests with relevant details (excluding sensitive fields)
    const safeBody = { ...body };
    if (safeBody.password) delete safeBody.password; // hide password
    if (safeBody.token) delete safeBody.token; // hide tokens

    this.logger.log(
      `Incoming Request: ${method} ${url} | Params: ${JSON.stringify(params)} | Query: ${JSON.stringify(
        query,
      )} | Body: ${JSON.stringify(safeBody)} | User: ${user?.id || 'anonymous'}`,
    );

    return next.handle().pipe(
      tap({
        // ✅ 2. Measure and log response time
        // ✅ 3. Log outgoing responses
        next: responseBody => {
          const duration = Date.now() - now;

          // Prevent logging huge payloads or sensitive data
          let safeResponse: any = responseBody;
          if (safeResponse?.token) safeResponse = { ...safeResponse, token: '[HIDDEN]' };
          if (JSON.stringify(safeResponse).length > 2000) {
            safeResponse = '[Large Response Omitted]';
          }

          this.logger.log(
            `Outgoing Response: ${method} ${url} | ${duration}ms | User: ${user?.id || 'anonymous'} | Response: ${JSON.stringify(
              safeResponse,
            )}`,
          );
        },

        // ✅ 4. Log errors with context
        error: err => {
          const duration = Date.now() - now;
          this.logger.error(
            `Request Failed: ${method} ${url} | ${duration}ms | User: ${user?.id || 'anonymous'} | Error: ${
              err.message
            }`,
            err.stack,
          );
        },
      }),
    );
  }
}
