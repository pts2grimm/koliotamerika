export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
export const PASSWORD_MESSAGE = 'Паролата трябва да е между 8 и 128 символа.'
export const validPassword = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH
