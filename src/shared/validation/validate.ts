import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  constraints: string[];
}

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  errors: ValidationErrorDetail[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

function formatErrors(errors: ValidationError[]): ValidationErrorDetail[] {
  const result: ValidationErrorDetail[] = [];

  for (const error of errors) {
    const constraints = error.constraints 
      ? Object.values(error.constraints) 
      : [];
    
    result.push({
      field: error.property,
      message: constraints[0] ?? 'Validation failed',
      constraints,
    });

    // Handle nested errors
    if (error.children !== undefined && error.children.length > 0) {
      const nestedErrors = formatErrors(error.children);
      for (const nested of nestedErrors) {
        result.push({
          field: `${error.property}.${nested.field}`,
          message: nested.message,
          constraints: nested.constraints,
        });
      }
    }
  }

  return result;
}

type ClassConstructor<T> = new (...args: unknown[]) => T;

export async function validateDto<T extends object>(
  dtoClass: ClassConstructor<T>,
  plain: unknown
): Promise<ValidationResult<T>> {
  const instance = plainToInstance(dtoClass, plain);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  });

  if (errors.length > 0) {
    return {
      success: false,
      errors: formatErrors(errors),
    };
  }

  return {
    success: true,
    data: instance,
  };
}
