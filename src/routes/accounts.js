var express = require('express');
var router = express.Router({});

/* The login page. */
router.get('/login', function(req, res, next) {
  res.render('accounts/login.njk');
});

module.exports = router;
