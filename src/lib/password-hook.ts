import { ValidationError, type CollectionBeforeOperationHook } from 'payload'
import { PASSWORD_MESSAGE, validPassword } from './password-policy'

// Reset operations hash passwords before field hooks, so validate the operation input.
export const enforcePasswordPolicy: CollectionBeforeOperationHook = ({ args, operation }) => {
  if (operation !== 'create' && operation !== 'update' && operation !== 'resetPassword') return
  const data = 'data' in args ? args.data : undefined
  if (!data || typeof data !== 'object' || !('password' in data)) return
  // Payload accepts an omitted/empty password when updating unrelated profile fields.
  if (data.password === undefined || (operation === 'update' && data.password === '')) return
  if (!validPassword(data.password)) {
    throw new ValidationError({ errors: [{ path: 'password', message: PASSWORD_MESSAGE }] })
  }
}
