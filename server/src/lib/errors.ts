export class AppError extends Error {
  status: number;
  // Set for field-level conflicts (e.g. a 409 on a unique constraint) so the
  // error middleware can shape the response as { field, message } instead
  // of the generic { message }.
  field?: string;

  constructor(status: number, message: string, field?: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.field = field;
  }
}
