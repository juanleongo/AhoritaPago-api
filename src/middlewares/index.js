const validateForms = require('../middlewares/validate-forms');
const authVerify  = require('../middlewares/authVerify');
const asyncHandler = require('../middlewares/asyncHandler');
const errorHandler = require('../middlewares/errorHandler');


module.exports = {
    ...validateForms,
    ...authVerify,
    ...asyncHandler,
    ...errorHandler
}
