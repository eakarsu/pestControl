class EvidenceError extends Error {
  constructor(code, message, status = 400, retryable = false) {
    super(message);
    this.name = 'EvidenceError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function asEvidenceError(error) {
  if (error instanceof EvidenceError) return error;
  return new EvidenceError('INTERNAL_ERROR', 'The operation could not be completed', 500);
}

module.exports = { EvidenceError, asEvidenceError };
