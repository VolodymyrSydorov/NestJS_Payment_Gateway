"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENCY_SYMBOLS = exports.Currency = void 0;
var Currency;
(function (Currency) {
    Currency["USD"] = "USD";
    Currency["EUR"] = "EUR";
    Currency["GBP"] = "GBP";
    Currency["UAH"] = "UAH";
})(Currency || (exports.Currency = Currency = {}));
exports.CURRENCY_SYMBOLS = {
    [Currency.USD]: '$',
    [Currency.EUR]: '€',
    [Currency.GBP]: '£',
    [Currency.UAH]: '₴'
};
//# sourceMappingURL=currency.enum.js.map