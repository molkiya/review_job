// Common type definitions

export type Nullable<T> = T | null;

export type AsyncResult<T, E = Error> = Promise<
  | { success: true; data: T }
  | { success: false; error: E }
>;

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Entity base interface
export interface Entity {
  id: number | string;
}

// Value object marker interface
export interface ValueObject {
  equals(other: ValueObject): boolean;
}

// Repository base interface
export interface Repository<T extends Entity> {
  findById(id: T['id']): Promise<Nullable<T>>;
  save(entity: T): Promise<T>;
}

// Use case interface
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}

