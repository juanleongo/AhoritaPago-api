const validateForms = require('../middlewares/validate-forms');
const authVerify  = require('../middlewares/authVerify');


module.exports = {
    ...validateForms
    ,...authVerify
}