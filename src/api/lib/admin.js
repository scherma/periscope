const db = require("./database");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
var options = require("./options");

let base_config = function() {
  return options.get("periscope");
}

let list_users = function(perPage=20, currentPage=1, order=[{column: "user_id", order:"desc"}]) {
  return db.list_users(perPage, currentPage, order);
}

let lock_user = function(user_id, reason) {
  let lock_time = moment();
  return new Promise((resolve, reject) => {
    db.lock_user(user_id, lock_time, reason)
    .then((result) => {
      if (result) {
        resolve({message: "account was locked"});
      } else {
        reject({message: "no matching account"});
      }
    });
  })
}

let unlock_user = function(user_id) {
  return new Promise((resolve, reject) => {
    db.unlock_user(user_id)
    .then((result) => {
      if (result) {
        resolve({message: "account was unlocked"});
      } else {
        reject({message: "no matching account"});
      }
    });
  });
}

let set_user_roles = function(user_id, roles) {
  return new Promise((resolve, reject) => {
    if (!"user" in roles) {
      reject({message: "user role cannot be removed"});
    }

    db.set_user_roles(user_id, roles)
    .then((result) => {
      if (result) {
        resolve({message: "roles successfully set"});
      } else {
        reject({message: "no matching account"});
      }
    });
  });
}

let set_permissions = function(option, setting) {
  return new Promise((resolve, reject) => {
    if (["public_can_view", "public_can_submit", "public_signup_allowed"].indexOf(option) > -1 && typeof(setting) == 'boolean') {
      options.set('periscope', option, setting);
      resolve({message: "successfully updated settings", status: "success"});
    } else {
      reject({message: "invalid value", reason: `${option} : ${setting} not a valid choice`, status: "fail"});
    }
  });
}

let set_log_level = function(level) {
  return new Promise((resolve, reject) => {
    level = parseInt(level);
    if (typeof(level) == 'number' && level >= 1 && level <= 5) {
      options.set('periscope', 'loglevel', level);
      resolve({message: "successfully updated loglevel", status: "success"});
    } else {
      reject({message: "invalid value", reason: `${level} is not a valid level setting`, status: "fail"});
    }
  })
}

module.exports = {
  base_config: base_config,
  list_users: list_users,
  lock_user: lock_user,
  unlock_user: unlock_user,
  set_user_roles: set_user_roles,
  set_periscope_options: function(option, setting) {
    if (option == 'loglevel') {
      return set_log_level(setting);
    } else {
      return set_permissions(option, setting);
    }
  }
}