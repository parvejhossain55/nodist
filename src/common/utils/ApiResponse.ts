import { Response } from 'express';

interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

export class ApiResponse {
  static send(
    res: Response,
    statusCode: number,
    message: string,
    data: unknown = null,
    meta?: Meta,
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      ...(meta ? { meta } : {}),
    });
  }

  static ok(res: Response, data: unknown, message = 'Success', meta?: Meta) {
    return this.send(res, 200, message, data, meta);
  }

  static created(res: Response, data: unknown = null, message = 'Created') {
    return this.send(res, 201, message, data);
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }
}
