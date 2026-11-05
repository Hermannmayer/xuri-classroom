// webpack module 48156 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
exports.ZP = undefined;
var o = i(require("./69721.js"));
var a = n(require("./59496.js"));
var s = "RC_FORM_INTERNAL_HOOKS";
function u() {
  (0, o.default)(false, "Can not find FormContext. Please make sure you wrap Field under Form.");
}
var l = a.createContext({
  getFieldValue: u,
  getFieldsValue: u,
  getFieldError: u,
  getFieldWarning: u,
  getFieldsError: u,
  isFieldsTouched: u,
  isFieldTouched: u,
  isFieldValidating: u,
  isFieldsValidating: u,
  resetFields: u,
  setFields: u,
  setFieldValue: u,
  setFieldsValue: u,
  validateFields: u,
  submit: u,
  getInternalHooks: function () {
    u();
    return {
      dispatch: u,
      initEntityValue: u,
      registerField: u,
      useSubscribe: u,
      setInitialValues: u,
      destroyForm: u,
      setCallbacks: u,
      registerWatch: u,
      getFields: u,
      setValidateMessages: u,
      setPreserve: u,
      getInitialValue: u
    };
  }
});
var c = l;
exports.ZP = c;
};
