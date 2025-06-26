"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BANK_DISPLAY_NAMES = exports.BankId = void 0;
var BankId;
(function (BankId) {
    BankId["STRIPE"] = "stripe";
    BankId["PAYPAL"] = "paypal";
    BankId["SQUARE"] = "square";
    BankId["ADYEN"] = "adyen";
    BankId["BRAINTREE"] = "braintree";
})(BankId || (exports.BankId = BankId = {}));
exports.BANK_DISPLAY_NAMES = {
    [BankId.STRIPE]: 'Stripe',
    [BankId.PAYPAL]: 'PayPal',
    [BankId.SQUARE]: 'Square',
    [BankId.ADYEN]: 'Adyen',
    [BankId.BRAINTREE]: 'Braintree'
};
//# sourceMappingURL=bank-id.enum.js.map