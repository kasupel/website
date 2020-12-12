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

/* Page to edit user details. */
router.get('/edit', function(req, res, next) {
  res.render('accounts/edit.njk');
});

module.exports = router;
