import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { format } from 'date-fns';

@Injectable()
export class LocalTimeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        return this.transform(data);
      }),
    );
  }

  private transform(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (data instanceof Date) {
      // Format all Date objects to Vietnam local time string
      return format(data, 'dd-MM-yyyy HH:mm:ss');
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.transform(item));
    }

    if (typeof data === 'object') {
      const result: any = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          // Process all fields including system fields
          result[key] = this.transform(data[key]);
        }
      }
      return result;
    }

    return data;
  }
}
