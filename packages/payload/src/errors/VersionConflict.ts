import { status as httpStatus } from 'http-status'

import { APIError } from './APIError.js'

export class VersionConflict extends APIError {
  constructor(id: number | string) {
    super(
      `Document "${id}" has been modified by another user and cannot be updated. Please reload and try again.`,
      httpStatus.CONFLICT,
    )
  }
}
