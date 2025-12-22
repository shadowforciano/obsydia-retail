const DEFAULT_PAYMENT_NUMBER = null;

function getPaymentNumber() {
  const value = process.env.ATH_MOBILE_NUMBER || DEFAULT_PAYMENT_NUMBER;
  if (!value) {
    throw new Error('ATH_MOBILE_NUMBER is not set');
  }
  return value;
}

function applyPaymentNumber(template) {
  if (!template) {
    return '';
  }
  return template.replace(/\{\{\s*paymentNumber\s*\}\}/g, getPaymentNumber());
}

module.exports = {
  applyPaymentNumber,
  getPaymentNumber,
};
