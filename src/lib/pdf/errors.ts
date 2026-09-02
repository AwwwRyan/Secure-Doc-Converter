/** Errors the UI knows how to explain. Workers throw these; the shell maps them to copy. */

export class EncryptedPdfError extends Error {
  constructor() {
    super('This PDF is password-protected. Unlock it first, then try again.');
    this.name = 'EncryptedPdfError';
  }
}

export class CorruptPdfError extends Error {
  constructor(detail?: string) {
    super(detail ? `This PDF could not be read (${detail}).` : 'This PDF could not be read.');
    this.name = 'CorruptPdfError';
  }
}

export class EmptyResultError extends Error {
  constructor() {
    super('That selection would leave the PDF with no pages.');
    this.name = 'EmptyResultError';
  }
}
