import type { ValidationErrorDetail } from '@/shared/validation/validate.js';

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ValidationErrorDetail[];
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
    public readonly details?: ValidationErrorDetail[]
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toResponse(): ApiErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }

  // Common errors
  static validationError(details: ValidationErrorDetail[]): ApiError {
    return new ApiError(
      'VALIDATION_ERROR',
      'Request validation failed',
      400,
      details
    );
  }

  static notFound(resource: string): ApiError {
    return new ApiError(
      'NOT_FOUND',
      `${resource} not found`,
      404
    );
  }

  static insufficientFunds(): ApiError {
    return new ApiError(
      'INSUFFICIENT_FUNDS',
      'Insufficient funds for this operation',
      400
    );
  }

  static internalError(): ApiError {
    return new ApiError(
      'INTERNAL_ERROR',
      'Internal server error',
      500
    );
  }

  static externalServiceError(service: string): ApiError {
    return new ApiError(
      'EXTERNAL_SERVICE_ERROR',
      `Failed to fetch data from ${service}`,
      502
    );
  }

  static conflict(message: string): ApiError {
    return new ApiError(
      'CONFLICT',
      message,
      409
    );
  }
}

