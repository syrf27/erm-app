export class DomainError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "DomainError";
    this.status = status;
    this.details = details;
  }
}
