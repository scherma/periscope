let db = require('./database');
let options = require('./options');
const logger = require("./logger");
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const moment = require('moment');
const saltRounds = 10;
const nodemailer = require('nodemailer');
const { resolve } = require('path');
const transport = nodemailer.createTransport({
  host: options.get("mail", "host"),
  port: 465,
  secure: true,
  auth: {
    user: options.get("mail", "user"),
    pass: options.get("mail", "pass")
  }
});

const sendConfirmationMail = (username, email, account_activation_link) => {
  return new Promise((resolve, reject) => {
    transport.sendMail({
      from: options.get("mail", "user"),
      to: email,
      subject: `Validate your account for ${options.get("http", "host")}`,
      html: `<h2>Confirm account creation</h2>
      <h3>Hi ${username}</h3>
      <p>This email was used to sign up for the Periscope service at ${options.get("http", "host")}</p>
      <p>If you wish to confirm the account creation, please click the following link:</p>
      <p><a href="${account_activation_link}">${account_activation_link}</a></p>`
    }).then((mailresult) => {
      let msg = `Account creation mail sent to ${username} with email ${email}`
      logger.info(null, {message: msg, action: "sendConfirmationMail"});
      resolve({message: msg, mailresult: mailresult, status: "success"});
    }).catch(err => {
      logger.error(null, {message: err.message, action: "sendConfirmationMail"});
      reject({message: err.message, reason: "mail_send", status: "fail"});
    });
    
  });
}

const sendEmailUpdateMail = (username, oldmail, newmail, email_confirmation_link) => {
  return new Promise((resolve, reject) => {
    transport.sendMail({
      from: options.get("mail", "user"),
      to: newmail,
      subject: `Confirm email change`,
      html: `<h2>Confirm change of email</h2>
      <h3>Hi ${username}</h3>
      <p>A request was made to update the email email address for your account on ${options.get("http", "host")} from ${oldmail} to ${newmail}</p>
      <p>If you wish to confirm the alteration, please click the following link:</p>
      <p><a href="${email_confirmation_link}">${email_confirmation_link}</a></p>`
    }).then((mailresult) => {
      let msg = `Email alteration mail sent to ${username} with email ${oldmail} for change to ${newmail}`;
      logger.info(null, {message: msg, action: "sendEmailUpdateMail"});
      resolve({message: msg, mailresult: mailresult, status: "success"});
    }).catch(err => {
      logger.error(null, {message: err.message, action: "sendEmailUpdateMail", reason: "mail_send", status: "fail"});
      reject({message: err.message, reason: "mail_send", status: "fail"});
    });
  });
}

const sendEmailChangeNotification = (username, oldmail, newmail) => {
  return new Promise((resolve, reject) => {
    transport.sendMail({
      from: options.get("mail", "user"),
      to: oldmail,
      subject: `Account email changed`,
      html: `<h2>Notification of email change</h2>
      <h3>Hi ${username}</h3>
      <p>The email for your account on ${options.get("http", "host")} was changed to ${newmail}</p>`
    }).then((mailresult) => {
      let msg = `Email alteration notification sent to ${username} with email ${oldmail} for change to ${newmail}`;
      logger.info(null, {message: msg, action: "sendEmailChangeNotification"});
      resolve({message: msg, mailresult: mailresult, status: "success"});
    }).catch(err => {
      logger.error(null, {message: err.message, action: "sendEmailChangeNotification", reason: "mail_send", status: "fail"});
      reject({message: err.message, reason: "mail_send", status: "fail"});
    });
  });
}

const sendPasswordResetMail = (username, email, pw_reset_link) => {
  return new Promise((resolve, reject) => {
    transport.sendMail({
      from: options.get("mail", "user"),
      to: email,
      subject: `Reset account password for ${options.get("http", "host")}`,
      html: `<h2>Reset password</h2>
      <h3>Hi ${username}</h3>
      <p>A password reset was request for your account at ${options.get("http", "host")}</p>
      <p>To reset your password, please click the following link:</p>
      <p><a href="${pw_reset_link}">${pw_reset_link}</a></p>`
    }).then((mailresult) => {
      let msg = `Password reset mail sent to ${username} with email ${email}`;
      logger.info(null, {message: msg, action: "sendPasswordResetMail"});
      resolve({message: msg, mailresult: mailresult, status: "success"});
    }).catch(err => {
      logger.error(null, {message: err.message, action: "sendPasswordResetMail"});
      reject({message: err.message, reason: "mail_send", status: "fail"});
    });
  });
}

const sendAccountCreateMail = (account_create_link, email) => {
  return new Promise((resolve, reject) => {
    transport.sendMail({
      from: options.get("mail", "user"),
      to: email,
      subject: `Account creation token issued for ${options.get("http", "host")}`,
      html: `<h2>Create account</h2>
      <h3>Hi,</h3>
      <p>You were issued an account creation token for ${options.get("http", "host")}</p>
      <p>To create your account, please click the following link:</p>
      <p><a href="${account_create_link}">${account_create_link}</a></p>
      <p>This token will be valid for 7 days.</p>`
    }).then((mailresult) => {
      let msg = `Account creation mail sent to ${email}`;
      logger.info(null, {message: msg, action: "sendAccountCreateMail"});
      resolve({message: msg, mailresult: mailresult, status: "success"});
    }).catch(err => {
      logger.error(null, {message: err.message, action: "sendAccountCreateMail"});
      reject({message: err.message, reason: "mail_send", status: "fail"});
    });
  });
}

const hashNewPassword = (password) => {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(saltRounds, (err, salt) => {
      if (err) {
        reject(err);
      } else {
        bcrypt.hash(password, salt, (err, hash) => {
          if (err) {
            reject(err);
          } else {
            resolve(hash);
          }
        });
      }
    });
  });
}

const genValidationToken = () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(64, (err, buffer) => {
      if (err) { 
        reject(err);
      } else {
        resolve(buffer.toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=+$/, ''));
      }
    })
  });
}

const genEmailValidationLink = (email_validate_token, email) => {
  return `https://${options.get("http", "host")}/#/account/confirm-email?token=${email_validate_token}&email=${encodeURI(email)}`;
}

const genAccountActivationLink = (account_activate_token, email) => {
  return `https://${options.get("http", "host")}/#/account/activate?token=${account_activate_token}&email=${encodeURI(email)}`;
}

const genPasswordResetLink = (pw_reset_token, email) => {
  return `https://${options.get("http", "host")}/#/account/reset-password?token=${pw_reset_token}&email=${encodeURI(email)}`;
}

const genAccountCreateLink = (account_create_token) => {
  return `https://${options.get("http", "host")}/#/account/create?token=${account_create_token}`;
}

let add = function(new_account_data) {
  return new Promise((resolve, reject) => {
    // do some validation
    // if password is too long, don't even hash
    if (new_account_data.password.length > 1024 || new_account_data.password.length < 8) {
      reject({message: "passwords must be between 8 and 1024 characters", reason: "password_length", status: "fail"});
    }

    if (new_account_data.username.length < 8 || new_account_data.email.length < 6) {
      reject({message: "email or username too short", reason: "username_or_email_length", status: "fail"});
    }

    // ensure email/username fit max length
    // this max is mainly for readability purposes, not because a long username/email is a technical problem
    if (new_account_data.username.length > 100 || new_account_data.email.length > 100) {
      reject({message: "exceeds max length for email or username", reason: "username_or_email_length", status: "fail"});
    }

    // make sure user didn't make a typo in password!
    if (new_account_data.password != new_account_data.password_confirm) {
      reject({message: "passwords do not match", reason: "password_match_fail", status: "fail"});
    }

    let pw_promise = hashNewPassword(new_account_data.password);
    let vt_promise = genValidationToken();
    let createtime = moment();

    Promise.all([pw_promise, vt_promise])
    .then(([crypted_password, account_activate_token]) => {
      db.add_account(new_account_data.username, new_account_data.email, crypted_password, account_activate_token, createtime, new_account_data.src_ip)
      .then((user_id) => {
        sendConfirmationMail(new_account_data.username, new_account_data.email, genAccountActivationLink(account_activate_token, new_account_data.email))
        .then(() => {
          resolve({message: `An account activation email has been sent`, status: "success", user_id: user_id});
        });
      }).catch((err) => {
        let detail = "";
        if (err.routine && err.routine == "_bt_check_unique") {
          if (err.constraint == "users_username_key") {
            detail = `username ${new_account_data.username} already taken`;
          } else if (err.constraint == "users_email_key") {
            detail = `email ${new_account_data.email} already used`;
          } else {
            detail = `unexpected constraint violation`;
          }
        } else {
          detail = `unknown db insert error`;
        }
        reject({message: detail, reason: "db_insert_fail", status: "fail", base_message: err.message});
      });
    }).catch((err) => {
      reject({message: "failed to create requested account token and password hash", reason: "account_create_fail", status: "fail", base_message: err.message});
    });
  })
}

let set_must_change_password = function(user_id) {
  return db.set_must_change_password(user_id);
}

let create_signup_token = function() {
  return new Promise((resolve, reject) => {
    genValidationToken()
    .then((token) => {
      let expiry = moment().add(7, "d");
      db.add_signup_token(token, expiry)
      .then(() => {
        resolve(token);
      });
    })
  });
}

let issue_account_create = function(email) {
  return new Promise((resolve, reject) => {
    create_signup_token()
    .then((token) => {
      sendAccountCreateMail(genAccountCreateLink(token), email)
      .then(() => {
        resolve({message: `An account creation mail has been sent`, status: "success"});
      })
    })
  })
}

let confirm_signup_token = function(token) {
  return new Promise((resolve, reject) => {
    // if signing up with token, check that it is valid and remove if so
    if (token.length > 1024) {
      reject({message: "invalid token", reason: "token_length", status: "fail"})   ;
    } 

    db.get_signup_token(token)
    .then((result) => {
      if (result) {
        if (moment(result.token_expiry) > moment()) {
          db.remove_signup_token(token)
          .then(() => {
            resolve({message: "token validated and removed", status: "success"});
          });
        } else {
          reject({message: "this token has expired", status: "fail", reason: "token_expired"})
        }
      } else {
        reject({message: "no such token found", status: "fail", reason: "token_not_found"});
      }
    });
  });
}

let activate_account = function(account_activate_token, email) {
  return new Promise((resolve, reject) => {
    // discard large values to prevent resource exhaustion DoS
    if (account_activate_token.length > 100 || email.length > 100) {
      reject({message: "invalid value", reason: "token_length", status: "fail"});
    }

    logger.debug(null, {message: "checking activation token", action: "activate_account"});
    db.check_account_activate_token(account_activate_token, email)
    .then((account) => {
      logger.debug(null, {message: "checking if account exists", action: "activate_account", sub_action: "check_account_activate_token"});
      if (account) {
        logger.debug(null, {message: "account exists, activating user", action: "activate_account", sub_action: "check_account_activate_token", account_data: account});
        let activate_time = moment();
        db.activate_user(account.user_id, activate_time)
        .then((output) => {
          let msg = `account for ${email} activated at ${activate_time.format('YYYY-mm-dd HH:MM:SS')}`;
          logger.debug(null, {message: msg, action: "activate_account", sub_action: "activate_user", activate_user_data: output});
          resolve({message: msg, status: "success"});
        });
      } else {
        let msg = "No matching account found";
        logger.debug(null, {message: msg, action: "activate_account", sub_action: "check_account_activate_token"});
        reject({message: msg, reason: "account_not_found", status: "fail"});
      }
    }).catch((err) => {
      reject({message: err.message, reason: "activation_failed", status: "fail"});
    });
  });
}

let request_reset_password = function(userid) {
  // discard large values to prevent resource exhaustion DoS
  return new Promise((resolve, reject) => {
    if (userid.length > 100) {
      reject({message: "invalid value", reason: "userid_lenth", status: "fail"});
    }

    db.find_username_or_email(userid)
    .then((account) => {
      if (account) {
        genValidationToken()
        .then((pw_reset_token) => {
          let reset_request_time = moment();
          let token_expiry_time = reset_request_time.add(24, "h");
          db.add_pw_reset_token(account.user_id, pw_reset_token, token_expiry_time)
          .then(() => {
            sendPasswordResetMail(account.username, account.email, genPasswordResetLink(pw_reset_token, account.email))
            .then(() => {
              resolve({message: "Password reset mail sent", status: "success"});
            });
          });
        });
      } else {
        reject({message: `Account ${userid} not found`, reason: "account_not_found", status: "fail"})
      }
    });
  })
}

let submit_reset_password = function(pw_reset_token, email, password, password_confirm) {
  return new Promise((resolve, reject) => {
    if (!pw_reset_token || !email || !password || !password_confirm) {
      reject({message: "invalid value", reason: "value_null", status: "fail"});
    }

    if (pw_reset_token.length > 100 || email.length > 100 || password.length > 1024 || password_confirm.length > 1024
      || email.length < 6 || password.length < 8 || password_confirm.length < 8) {
      reject({message: "invalid value", reason: "value_length", status: "fail"});
    }

    if (password != password_confirm) {
      reject({message: "passwords do not match", reason: "password_match_fail", status: "fail"});
    }

    db.check_pw_reset_token(pw_reset_token, email)
    .then((account) => {
      if (!account) {
        reject({message: "invalid value", reason: "value_null", status: "fail"});
      }

      if (account.password_reset_token_used) {
        reject({message: "this token has already been used", reason: "token_used", status: "fail"});
      }

      if (moment(account.password_reset_token_expiry) < moment()) {
        reject({message: "this token has expired", reason: "token_expired", status: "fail"});
      }
      
      bcrypt.compare(password, account.password, (err, result) => {
        if (result) {
          reject({message: "password must be different", reason: "password_matches_old", status: "fail"});
        } else {
          hashNewPassword(password)
          .then((crypted_password) => {
            let reset_time = moment();
            db.reset_password(account.user_id, crypted_password, reset_time)
            .then(() => {
              resolve({message: "password updated", status: "success"});
            });
          });   
        }
      });
    });
  });
}

let set_new_password = function(email, oldpass, newpass, confirm_newpass) {
  return new Promise((resolve, reject) => {
    if (!email || !oldpass || !newpass || !confirm_newpass) {
      reject({message: "invalid value", reason: "value_null", status: "fail"});
    }

    if (oldpass.length > 1024 || newpass.length > 1024 || confirm_newpass.length > 1024 
      || oldpass.length < 8 || newpass.length < 8 || confirm_newpass.length < 8 || email.length > 100) {
      reject({message: "invalid value", reason: "value_length", status: "fail"});
    }

    if (newpass != confirm_newpass) {
      reject({message: "passwords do not match", reason: "password_match_fail", status: "fail"});
    }

    if (oldpass == newpass) {
      reject({message: "new password must be different", reason: "password_matches_old", status: "fail"});
    }

    db.find_username_or_email(email)
    .then((account) => {
      if (account) {
        bcrypt.compare(oldpass, account.password, (err, result) => {
          if (result) {
            hashNewPassword(newpass)
            .then((crypted_password) => {
              let set_time = moment();
              db.set_password(account.user_id, crypted_password, set_time)
              .then(() => {
                resolve({message: "password updated", status: "success"});
              });
            });
          } else {
            reject({message: "current password incorrect", reason: "invalid_password", status: "fail"});
          }
        });
      } else {
        reject({message: `account ${email} not found`, reason: "account_not_found", status: "fail"});
      }
    });
  });
}

let set_new_email = function(email, proposed_email, password) {
  return new Promise((resolve, reject) => {
    if (!email || !proposed_email || !password) {
      reject({message: "invalid value", reason: "value_null", status: "fail"});
    }

    if (email.length > 100 || proposed_email.length > 100 || password.length > 1024
      || proposed_email.length < 6) {
      reject({message: "invalid value", reason: "value_length", status: "fail"});
    }

    db.find_username_or_email(email)
    .then((account) => {
      if (account) {
        bcrypt.compare(password, account.password, (err, result) => {
          if (result) {
            genValidationToken()
            .then((email_update_token) => {
              db.add_proposed_email(account.user_id, email_update_token, proposed_email)
              .then(() => {
                sendEmailUpdateMail(account.username, account.email, proposed_email, genEmailValidationLink(email_update_token, account.email))
                .then(() => {
                  resolve({message: "Email update mail sent", status: "success"});
                });
              })
            })
          } else {
            reject({message: "password incorrect", reason: "invalid_password", status: "fail"});
          }
        })
      } else {
        reject({message: `account ${email} not found`, reason: "account_not_found", status: "fail"});
      }
    })
  });
}

let confirm_new_email = function(email_validate_token, oldemail) {
  return new Promise((resolve, reject) => {
    if (!email_validate_token || !oldemail) {
      reject({message: "invalid value", reason: "value_null", status: "fail"});
    }

    if (email_validate_token.length > 100 || oldemail.length > 100) {
      reject({message: "invalid value", reason: "value_length", status: "fail"});
    }

    db.check_email_validate_token(email_validate_token, oldemail)
    .then((account) => {
      if (!account) {
        reject({message: "invalid value", reason: "value_null", status: "fail"});
      }
      
      if (account.email_validate_token_used) {
        reject({message: "this token has already been used", reason: "token_used", status: "fail"});
      }
      
      db.set_confirmed_email(account.user_id, account.proposed_email)
      .then(() => {
        sendEmailChangeNotification(account.username, account.email, account.proposed_email)
        .then(() => {
          resolve({message: "email updated", status: "success"});
        });
      })
    });
  });
}

let delete_user = function(user_session, password) {
  return new Promise((resolve, reject) => {
    if (!password || password.length < 8 || password.length > 1024) {
      reject({message: "invalid value", reason: "value_length", status: "fail"});
    }

    db.find_user_by_id(user_session.user_id)
    .then((account) => {
      if (account.user_id) {
        bcrypt.compare(password, account.password, (err, result) => {
          if (result) {
            let delete_time = moment();
            db.delete_user(account, delete_time, "user deleted")
            .then((delete_result) => {
              resolve({message: "account deleted", status: "success"});
            });
          } else {
            reject({message: "invalid password", reason: "invalid_password", status: "fail"});
          }
        })
      } else {
        reject({message: "invalid value", reason: "id_not_found", status: "fail"});
      }
    });
  });
}

let auth_user = function(useridstr, password, src_ip) {
  return new Promise((resolve, reject) => {
    if (!password || !useridstr) {
      reject({message: "invalid value", reason: "value_length", status: "fail"});
    }

    if (password.length > 1024 || useridstr.length > 100) {
      reject({message: "invalid value", reason: "value_length", status: "fail"});
    }

    db.find_username_or_email(useridstr)
    .then((account) => {
      if (!account) {
        reject({message: "username or password incorrect", reason: "account_not_found", status: "fail"});
      }

      if (account.locked_out) {
        reject({message: "username or password incorrect", reason: "account_locked_out", status: "fail"});
      }

      if (account.account_deleted) {
        reject({message: "username or password incorrect", reason: "account_deleted", status: "fail"});
      }

      if (!account.account_activated) {
        reject({message: "account has not been activated", reason: "account_not_activated", status: "fail"});
      }

      bcrypt.compare(password, account.password, (err, result) => {
        if (result) {
          if (account.must_change_password) {
            genValidationToken()
            .then((pw_reset_token) => {
              let reset_request_time = moment();
              let token_expiry_time = reset_request_time.add(1, "h");
              db.add_pw_reset_token(account.user_id, pw_reset_token, token_expiry_time)
              .then(() => {
                reject({
                  message: "password must change", 
                  reason: "must_change_password", 
                  status: "incomplete",
                  token: pw_reset_token,
                  email: account.email
                });
              });
            }).catch((error) => {
              logger.error(null, {
                message: `error initiating must_change_password: ${error.message}`, 
                action: "auth_user", 
                sub_action: "password reset token",
                reason: "pw_reset_token_set_fail"
              });
            });
          } else {
            let login_time = moment();
            db.update_last_login(account.user_id, login_time, src_ip).then(()=> {});
            resolve({message: "username and password correct", status: "success", account: account});
          }
        } else {
          db.failed_login(account.user_id).then(() => {});
          reject({message: "username or password incorrect", reason: "invalid_password", status: "fail"});
        }
      });
    });
  });
}

let get_account_data = function(user_id, data="user") {
  return new Promise((resolve, reject) => {
    db.find_user_by_id(user_id)
    .then((account) => {
      if (!account) {
        reject({message: `account for ${user_id} not found`, reason: "account_not_found", status: "fail"});
      } else {
        if (data=="user") {
          let return_account_data = {
            user_id: account.user_id,
            username: account.username,
            email: account.email,
            password_modified_time: account.password_modified_time,
            account_created_time: account.account_created_time,
            last_login: account.last_login,
            last_login_ip: account.last_login_ip,
            roles: account.roles
          }

          resolve(return_account_data);
        } else if (data=="admin") {
          resolve(account);
        }
      }
    })
  })
}

function require_auth(role) {
  return function(req, res, next) {
    if (typeof(role) != "string") {
      // if no role required, allow
      next();
    } else if (req.session.user && req.cookies.user_sid) {
      if (req.session.user.roles.indexOf(role) > -1) {
        // if role required and user has role, allow
        next();
      } else {
        // if role required and user does not have role, send forbidden
        res.sendStatus(403);
      }
    } else {
      // if role required but user is not logged in, send unauthorized
      res.sendStatus(401);
    }
  } 
}

module.exports = {
  require_auth: require_auth,
  auth_user: auth_user,
  add: add,
  delete_user: delete_user,
  activate_account: activate_account,
  request_reset_password: request_reset_password,
  submit_reset_password: submit_reset_password,
  set_new_password: set_new_password,
  set_must_change_password: set_must_change_password,
  get_account_data: get_account_data,
  set_new_email: set_new_email,
  confirm_new_email: confirm_new_email,
  issue_account_create: issue_account_create,
  confirm_signup_token: confirm_signup_token
}