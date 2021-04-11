var express = require("express");
var router = express.Router();
const logger = require("../lib/logger");
let accounts = require("../lib/accounts");
let options = require("../lib/options");

let account_role = "user";

router.get("/view", accounts.require_auth(account_role), function (req, res, next) {
  accounts.get_account_data(req.session.user.user_id)
  .then((account) => {
    res.send(account);
  });
});

router.post("/new", function(req, res, next) {
  /*
  expected:
  body { username, email, password, password_confirm } 
  */

  // permit if public signup is allowed, or if user is admin
  if (options.get("periscope", "public_signup_allowed") || (req.session.user && req.session.user.roles.indexOf("admin") > -1)) {
    let ua = req.headers['user-agent'] || "";
    let new_account_data = req.body;
    new_account_data.src_ip = req.ip;
    accounts.add(new_account_data)
    .then((result) => {
      logger.info(null, {
        message: "account created", 
        action: "/account/new", 
        src_ip: req.ip, 
        ua: ua,
        username: new_account_data.username,
        email: new_account_data.email
      })
      res.send({message: result.message, user_id: result.user_id});
    }).catch((err) => {
      res.status(400);
      res.send({message: err.message});
    });
  } else if (req.body.token) {
    accounts.confirm_signup_token(req.body.token).then(() => {
      let ua = req.headers['user-agent'] || "";
      let new_account_data = req.body;
      new_account_data.src_ip = req.ip;
      accounts.add(new_account_data)
      .then((result) => {
        logger.info(null, {
          message: "account created", 
          action: "/account/new", 
          src_ip: req.ip, 
          ua: ua,
          username: new_account_data.username,
          email: new_account_data.email
        })
        res.send({message: result.message, user_id: result.user_id});
      });
    }).catch((err) => {
      res.status(400);
      res.send({message: err.message});
    });
  } else {
    res.status(401);
    res.send({message: "public signup is currently not available", reason: "public_signup_disallowed", status: "fail"});
  }
});

router.all("/activate", function(req, res, next) {
  /*
  expected:
  query { token, email (uri encoded) }
  */
  let ua = req.headers['user-agent'] || "";
  let account_activate_token = req.query.token;
  let email = decodeURI(req.query.email);
  accounts.activate_account(account_activate_token, email)
  .then((response) => {
    logger.info(null, {message: response, action: "/account/activate", src_ip: req.ip, email: email, ua: ua});
    res.send({email: email, message: "account activated"});
  }).catch((err) => {
    logger.error(null, {message: err.message, action: "/account/activate", email: email, src_ip: req.ip, ua: ua});
    res.status(400);
    res.send({message: err.message});
  });
});

router.post("/password-reset/request", function(req, res, next) {
  /*
  expected:
  body { userid (username or email) }
  */
  let ua = req.headers['user-agent'] || "";
  accounts.request_reset_password(req.body.userid)
  .then((result) => {
    logger.info(null, {message: result.message, action: "/account/password-reset/request", userid: userid, src_ip: req.ip, ua: ua});  
  }).catch((err) => {
    logger.error(null, {message: err.message, action: "/account/password-reset/request", userid: userid, src_ip: req.ip, ua: ua});
  }).finally(() => {
    // do not indicate success/fail in response - prevents account enumeration/reset abuse
    res.send({message: `Request to reset password for ${userid} recieved; please check your email`});
  });
});

router.post("/password-reset/submit", function(req, res, next) {
  /*
  expected:
  body { token, email, password, password_confirm }
  */
  let ua = req.headers['user-agent'] || "";
  accounts.submit_reset_password(req.body.token, req.body.email, req.body.password, req.body.password_confirm)
  .then((result) => {
    logger.info(null, {
      message: "Password successfully reset", 
      action: "/account/password-reset/submit", 
      email: req.body.email, 
      src_ip: req.ip, 
      ua: ua
    });
    res.send(result);
  }).catch((err) => {
    logger.error(null, {
      message: "Password reset failed", 
      action: "/account/password-reset/submit",
      email: req.body.email, 
      src_ip: req.ip, 
      reason: err.reason, 
      ua: ua
    });
    res.status(400);
    res.send({message: err.message});
  });
});

router.post("/password/set", accounts.require_auth(account_role), function(req, res, next) {
  /*
  expected:
  body { email, oldpass, newpass, newpass_confirm }
  */
  let ua = req.headers['user-agent'] || "";
  let username = null;
  let user_id = null;
  if (req.session.user) {username = req.session.user.username; user_id = req.session.user.user_id}

  accounts.set_new_password(req.body.email, req.body.oldpass, req.body.newpass, req.body.newpass_confirm)
  .then((result) => {
    logger.info(null, {
      message: "Password successfully updated", 
      action: "/account/password/set", 
      email: req.body.email, 
      src_ip: req.ip,
      ua: ua,
      user_id: user_id,
      username: username
    });
    res.send(result);
  }).catch((err) => {
    logger.error(null, {
      message: err.message, 
      action: "/account/password/set", 
      email: req.body.email, 
      src_ip: req.ip, 
      reason: err.reason,
      user_id: user_id,
      username: username
    });
    res.status(400);
    res.send({message: err.message});
  });
});

router.post("/email/set", accounts.require_auth(account_role), function(req, res, next) {
  /*
  expected:
  body { email, proposed_email, password }
  */
  let ua = req.headers['user-agent'] || "";
  let username = null;
  let user_id = null;
  if (req.session.user) {username = req.session.user.username; user_id = req.session.user.user_id}

  accounts.set_new_email(req.body.email, req.body.proposed_email, req.body.password)
  .then((result) => {
    logger.info(null, {
      message: "Email update messages sent", 
      action: "/account/email/set", 
      email: req.body.email, 
      src_ip: req.ip,
      ua: ua,
      user_id: req.session.user.user_id,
      username: req.session.user.username
    });
    res.send(result);
  }).catch((err) => {
    logger.error(null, {
      message: err.message, 
      action: "/account/email/set", 
      email: req.body.email, 
      src_ip: req.ip, 
      reason: err.reason,
      user_id: user_id,
      username: username
    });
    res.status(400);
    res.send({message: err.message});
  });
});

router.all("/email/confirm", function(req, res, next) {
  /*
  expected:
  query { token, email }
  */
  let ua = req.headers['user-agent'] || "";
  let username = null;
  let user_id = null;
  if (req.session.user) {username = req.session.user.username; user_id = req.session.user.user_id}

  accounts.confirm_new_email(req.query.token, req.query.email)
  .then((result) => {
    logger.info(null, {
      message: "Email updated successfully", 
      action: "/account/email/confirm", 
      email: req.body.email, 
      src_ip: req.ip,
      ua: ua,
      user_id: user_id,
      username: username
    });
    res.send(result);
  }).catch((err) => {
    logger.error(null, {
      message: err.message, 
      action: "/account/email/confirm", 
      email: req.body.email, 
      src_ip: req.ip, 
      reason: err.reason,
      user_id: user_id,
      username: username
    });
    res.status(400);
    res.send({message: err.message});
  });
});

router.post("/delete", accounts.require_auth("user"), function(req, res, next) {
  let ua = req.headers['user-agent'] || "";

  accounts.delete_user(req.session.user, req.body.password)
  .then((success) => {
    res.clearCookie('user_sid');
    logger.info(null, {
      message: "Account successfully deleted", 
      action: "/account/delete", 
      src_ip: req.ip,
      ua: ua,
      user_id: req.session.user_id,
      username: req.session.username
    });
    res.send(success);
  }).catch((err) => {
    logger.error(null, {
      message: err.message, 
      action: "/account/delete", 
      src_ip: req.ip, 
      reason: err.reason,
      user_id: req.session.user_id,
      username: req.session.username
    });
    if (err.reason && err.reason == "invalid_password") {
      res.status(401);
      res.send({message: err.message});
    } else {
      res.status(400);
      res.send({message: err.message});
    }
  });
});

module.exports = router;