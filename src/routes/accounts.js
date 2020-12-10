var express = require('express');
var router = express.Router({});

/* The login page. */
router.get('/login', function(req, res, next) {
  res.render('accounts/login.njk');
});

/* The page of some user. */
router.get('/users/:username', function(req, res, next) {
  res.render('accounts/account.njk');
});

module.exports = router;
