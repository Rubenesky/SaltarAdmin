export const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) return err.message
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message
  }
  return fallback
}

export const getErrorCode = (err: unknown): string | undefined => (err as { code?: string })?.code
