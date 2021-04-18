var options = require("./options");
var dbparams = {
  client: "pg",
  connection: {
    database: options.get("db", "name"),
    user: options.get("db", "user"),
    password: options.get("db", "pass"),
    host:"localhost"
  }
};
var pg = require("knex")(dbparams);
const { attachPaginate } = require("knex-paginate");
attachPaginate();
const logger = require("./logger");

module.exports = {

  // admin functions

  list_users: function(perPage=20, currentPage=1, order=[{column: "user_id", order:"desc"}]) {
    return pg("users").select([
      "user_id", "username", "email", "proposed_email", "account_activated", "account_activated_time",
      "email_validated", "email_validated_time", "password_modified_time", "account_created_time", "creation_ip",
      "account_locked_out", "account_locked_out_time", "account_locked_out_reason", "auth_failures_since_login",
      "account_deleted", "account_deleted_time", "last_login", "last_login_ip", "roles"
    ]).orderBy(order).paginate({perPage: perPage, currentPage: currentPage, isLengthAware: true});
  },
  lock_user: function(user_id, lock_time, reason) {
    let formatted = lock_time.format("YYYY-MM-DD HH:mm:ss ZZ");
    return pg("users").update({
      account_locked_out: true,
      account_locked_out_time: formatted,
      account_locked_out_reason: reason,
    }).where({
      user_id: user_id,
      account_locked_out: false
    });
  },
  unlock_user: function(user_id) {
    return pg("users").update({
      account_locked_out: false,
      account_locked_out_time: null,
      account_locked_out_reason: null
    }).where({
      user_id: user_id,
      account_locked_out: true
    });
  },
  set_user_roles: function(user_id, roles) {
    return pg("users").update({
      roles: JSON.stringify(roles)
    }).where({
      user_id: user_id
    })
  },

  // User account functions

  add_account: function(username, email, crypted_password, account_activate_token, createtime, creation_ip) {
    var formatted_createtime = createtime.format("YYYY-MM-DD HH:mm:ss ZZ");
    return pg.insert({
      username: username,
      password: crypted_password,
      email: email,
      account_activate_token: account_activate_token,
      account_created_time: formatted_createtime,
      creation_ip: creation_ip,
      roles: '["user"]'
    }).returning("user_id").into("users");
  },
  check_account_activate_token: function(account_activate_token, email) {
    return pg("users").select("*").where({
      email: email, 
      account_activate_token: account_activate_token, 
      account_activate_token_used: false
    }).first();
  },
  activate_user: function(user_id, activate_time) {
    var formatted = activate_time.format("YYYY-MM-DD HH:mm:ss ZZ");
    return pg("users").update({
      account_activated: true, 
      account_activated_time: formatted, 
      account_activate_token_used: true,
      email_validated: true,
      email_validated_time: formatted
    }).where({user_id: user_id});
  },
  find_username_or_email: function(useridstr) {
    return pg("users").where({email: useridstr}).orWhere({username: useridstr}).first();
  },
  find_user_by_id: function(user_id) {
    return pg("users").where({user_id: user_id}).first();
  },
  failed_login: function(user_id) {
    return pg("users").increment("auth_failures_since_login", 1).where({user_id: user_id});
  },
  add_pw_reset_token: function(user_id, password_reset_token, password_reset_token_expiry) {
    var formatted = password_reset_token_expiry.format("YYYY-MM-DD HH:mm:ss ZZ");
    return pg("users").update({
      password_reset_token: password_reset_token,
      password_reset_token_expiry: formatted,
      password_reset_token_used: false
    }).where({
      user_id: user_id
    })
  },
  check_pw_reset_token: function(pw_reset_token, email) {
    return pg("users").select("*").where({
      email: email, 
      password_reset_token: pw_reset_token, 
    }).first();
  },
  reset_password: function(user_id, crypted_password, reset_time) {
    var formatted = reset_time.format("YYYY-MM-DD HH:mm:ss ZZ");
    return pg("users").update({
      password: crypted_password,
      password_modified_time: formatted,
      password_reset_token_used: true,
      must_change_password: false
    }).where({
      user_id: user_id
    });
  },
  set_password: function(user_id, crypted_password, set_time) {
    var formatted = set_time.format("YYYY-MM-DD HH:mm:ss ZZ");
    return pg("users").update({
      password: crypted_password,
      password_modified_time: formatted
    }).where({
      user_id: user_id
    });
  },
  set_must_change_password: function(user_id) {
    return pg("users").update({
      must_change_password: true
    }).where({
      user_id: user_id
    });
  },
  add_proposed_email: function(user_id, email_validate_token, proposed_email) {
    return pg("users").update({
      email_validate_token: email_validate_token,
      email_validate_token_used: false,
      proposed_email: proposed_email
    }).where({
      user_id: user_id
    });
  },
  check_email_validate_token: function(email_validate_token, oldemail) {
    return pg("users").select("*").where({
      email_validate_token: email_validate_token, 
      email: oldemail
    }).first();
  },
  set_confirmed_email: function(user_id, new_email) {
    return pg("users").update({
      email: new_email,
      proposed_email: null,
      email_validate_token_used: true
    }).where({
      user_id: user_id
    });
  },
  update_last_login: function(user_id, login_time, src_ip) {
    let formatted = login_time.format("YYYY-MM-DD HH:mm:ss ZZ");
    return pg("users").update({
      last_login: formatted,
      last_login_ip: src_ip,
      auth_failures_since_login: 0
    }).where({
      user_id: user_id
    });
  },
  delete_user: function(account, delete_time, reason) {
    let formatted = delete_time.format("YYYY-MM-DD HH:mm:ss ZZ");
    let email_removed = account.username + "_email_removed";
    return pg("users").update({
      account_deleted: true,
      account_deleted_time: formatted,
      email: email_removed
    }).where({
      user_id: account.user_id
    });
  },
  add_signup_token: function(token, expiry) {
    return pg.insert({token: token, token_expiry: expiry}).into("signup_tokens");
  },
  get_signup_token: function(token) {
    return pg("signup_tokens").select("*").where({token: token}).first();
  },
  remove_signup_token: function(token) {
    return pg("signup_tokens").where({token: token}).del();
  },

  // periscope app functions

  add_target: function(submitted_url, submittime, user, private=false) {
    let formatted = submittime.format("YYYY-MM-DD HH:mm:ss ZZ");
    return pg.insert({
      query: submitted_url,
      createtime: formatted,
      added_by: user ? user.user_id : null,
      private: private
    }).returning("*").into("targets");
  },
  add_visit: function(target_id, submittime, settings, referrer, user, private=false) {
    let formatted = submittime.format("YYYY-MM-DD HH:mm:ss ZZ");
    return pg.insert({
      target_id: target_id,
      createtime: formatted,
      settings: settings,
      referrer: referrer,
      status: "created",
      added_by: user ? user.user_id : null,
      private: private
    }).returning("*").into("visits");
  },
  get_visit_results: function(visit_id) {
    let reqs = pg("requests").select("*").leftJoin("request_headers", "requests.request_id", "request_headers.request_id").where({"requests.visit_id": visit_id});
    let resps = pg("responses").select("*").leftJoin("response_headers", "responses.response_id", "response_headers.response_id").where({"responses.visit_id": visit_id});
    let dfpm = pg("dfpm_detections").select("*").where({visit_id: visit_id});
    return Promise.all([reqs, resps, dfpm]);
  },
  get_target: function(target_id, user) {
    if (user && user.roles && user.roles.indexOf("admin") > -1) {
      return pg("targets").select("targets.*", "users.username").leftJoin("users", "targets.added_by", "users.user_id").where({target_id: target_id});
    } else {
      return pg("targets").select("targets.target_id", "targets.createtime", "targets.query", "targets.private")
      .where({target_id: target_id, private: false}).orWhere({target_id: target_id, added_by: user ? user.user_id : null});
    }
  },
  find_target: function(query) {
    return pg("targets").select("*").where({query: query}).first();
  },
  set_target_privacy(target_id, privacy) {
    return pg("targets").update({private: privacy}).where({target_id: target_id});
  },
  get_visit: function(visit_id, user) {
    if (user && user.roles && user.roles.indexOf("admin") > -1) {
      return pg("visits").select(
        "targets.target_id",
        "targets.query",
        "visits.*",
        "users.username"
      ).leftJoin("targets", "visits.target_id", "targets.target_id")
      .leftJoin("users", "visits.added_by", "users.user_id")
      .where({
        "visits.visit_id": visit_id
      }).first();
    } else { 
      return pg("visits").select(
        "targets.target_id",
        "targets.query",
        "visits.visit_id", "visits.target_id", "visits.createtime", "visits.time_actioned", "visits.completed", 
        "visits.status", "visits.screenshot_path", "visits.settings", "visits.private", "visits.referrer"
      ).leftJoin("targets", "visits.target_id", "targets.target_id")
      .where({
        "visits.visit_id": visit_id,
        "visits.private": false
      }).orWhere({
        "visits.visit_id": visit_id,
        "visits.added_by": user ? user.user_id : null
      }).first();
    }
  },
  set_visit_privacy(visit_id, privacy) {
    return pg("visits").update({private: privacy}).where({visit_id: visit_id});
  },
  add_requests: async function(requests, visit_id) {
    let req_sql = "WITH req(visit_id, request_time, request_post_data, request_url, request_method) AS (VALUES (?::integer, ?::timestamp with time zone, ?, ?, ?)), " +
    "req_h(header_name, header_value) AS (SELECT header_name, header_value FROM headers_to_rows(?)), " +
    "ir AS (INSERT INTO requests(visit_id, request_time, request_post_data, request_url, request_method) SELECT * FROM req RETURNING request_id, visit_id) " +
    "INSERT INTO request_headers(request_id, visit_id, header_name, header_value) SELECT ir.request_id, ir.visit_id, req_h.header_name, req_h.header_value FROM ir, req_h " +
    "RETURNING *";
    
    let resp_sql = "WITH resp(request_id, visit_id, file_id, response_time, response_size, response_code, response_data_length) " +
    "AS (VALUES (?::integer, ?::integer, ?::integer, ?::timestamp with time zone, ?::integer, ?::integer, ?::integer)), " +
    "resp_h(header_name, header_value) AS (SELECT header_name, header_value FROM headers_to_rows(?)), " +
    "ir AS (INSERT INTO responses(request_id, visit_id, file_id, response_time, response_size, response_code, response_data_length) SELECT * FROM resp RETURNING response_id, visit_id) " +
    "INSERT INTO response_headers(response_id, visit_id, header_name, header_value) SELECT ir.response_id, ir.visit_id, resp_h.header_name, resp_h.header_value FROM ir, resp_h";

    let reqrows = 0;
    let resprows = 0;
    let rows_added = [];
    requests.forEach((request) => {
      // there's probably a cleaner way to count the rows
      // omg this is ugly. but it works!
      let outdata = pg.raw(
        req_sql, 
        [
          visit_id, 
          request.request_time, 
          request.request_post_data, 
          request.request_url, 
          request.request_method, 
          request.request_headers
        ]
      ).then((reqs) => {
        let resp_data;
        if (request.response_headers && reqs.rows.length) {
          resp_data = pg.raw(
            resp_sql, 
            [
              reqs.rows[0].request_id, 
              visit_id, 
              request.file_id, 
              request.response_time, 
              request.response_size, 
              request.response_code, 
              request.response_body.length, 
              request.response_headers
            ]
          ).then((resps) => {
            return resps;
          })
          .catch((err) => {
            logger.error(
              null, 
              { 
                message: err.message, 
                action: "add_requests",
                sub_action: "add response data",
                data: [
                  reqs.rows[0].request_id, 
                  visit_id, 
                  request.file_id,
                  request.response_time, 
                  request.response_size, 
                  request.response_code, 
                  request.response_body.length, 
                  request.response_headers
                ]
              });
          });

          return Promise.resolve(resp_data)
          .then((resp_out) => {
            return [reqs, resp_out];
          });
        }
      }).catch((err) => {
        logger.error(
          null, 
          { 
            message: err.message, 
            action: "add_requests",
            sub_action: "add request data",
            data: [
              visit_id, 
              request.request_time, 
              request.request_post_data, 
              request.request_url, 
              request.request_method, 
              request.request_headers
            ]
          });
      });
      rows_added.push(outdata);
    });

    return Promise.all(rows_added)
    .then((results) => {
      results.forEach((result) => {
        if (Array.isArray(result) && result.length > 0 && result[0].rowCount) {
          reqrows = reqrows + result[0].rowCount;
        }
        
        if (Array.isArray(result) && result.length > 1 && result[1].rowCount) {
          resprows = resprows + result[1].rowCount;
        }
      })
  
      return [reqrows, resprows];
    });
  },
  add_dfpm: async function(detections) {
    return pg.insert(detections).into("dfpm_detections");
  },
  set_actioned_time: function(visit_id, action_time) {
    let formatted = action_time.format("YYYY-MM-DD HH:mm:ss.SSS ZZ");
    return pg("visits").where({"visits.visit_id": visit_id}).update({time_actioned: formatted});
  },
  set_screenshot_path: function(screenshot_path, visit_id) {
    return pg("visits").update({screenshot_path: screenshot_path}).where({visit_id: visit_id});
  },
  list_visits: function(user, perPage=20, currentPage=1, order=[{column: "visits.visit_id", order: "desc"}]) {
    if (user && user.roles && user.roles.indexOf("admin") > -1) {
      return pg("targets").select(
        "targets.target_id",
        "targets.query",
        "visits.*",
        "users.username"
      ).leftJoin("visits", "targets.target_id", "visits.target_id")
      .leftJoin("users", "targets.added_by", "users.user_id")
      .orderBy(order)
      .paginate({perPage: perPage, currentPage: currentPage, isLengthAware: true});
    } else {
      return pg("targets").select(
        "targets.target_id",
        "targets.query",
        "visits.visit_id", "visits.target_id", "visits.createtime", "visits.time_actioned", "visits.completed", 
        "visits.status", "visits.screenshot_path", "visits.settings", "visits.private", "visits.referrer"
      ).leftJoin("visits", "targets.target_id", "visits.target_id").where({'visits.private': false})
      .orWhere({"visits.added_by": user ? user.user_id : null})
      .orderBy(order)
      .paginate({perPage: perPage, currentPage: currentPage, isLengthAware: true});
    }
  },
  list_targets: function(user, perPage=20, currentPage=1, order=[{column: "targets.target_id", order: "desc"}]) {
    if (user && user.roles && user.roles.indexOf("admin") > -1) {
      return pg("targets").select("targets.*", "users.username")
      .count("visits.*")
      .leftJoin("visits", "targets.target_id", "visits.target_id")
      .leftJoin("users", "targets.added_by", "users.user_id")
      .groupBy("targets.target_id", "users.username")
      .orderBy(order).paginate({perPage: perPage, currentPage: currentPage, isLengthAware: true});
    } else {
      return pg("targets").select("targets.target_id", "targets.createtime", "targets.query", "targets.private")
      .count("visits.*")
      .leftJoin("visits", "targets.target_id", "visits.target_id")
      .where({'targets.private': false})
      .orWhere({"targets.added_by": user ? user.user_id : null})
      .groupBy("targets.target_id")
      .orderBy(order).paginate({perPage: perPage, currentPage: currentPage, isLengthAware: true});
    }
  },
  list_target_visits: function(target_id, user, perPage=20, currentPage=1, order=[{column: "visits.visit_id", order: "desc"}]) {
    if (user && user.roles && user.roles.indexOf("admin") > -1) {
      return pg("targets").select("targets.target_id", "targets.query", "visits.*", "users.username")
      .leftJoin("visits", "targets.target_id", "visits.target_id")
      .leftJoin("users", "targets.added_by", "users.user_id")
      .where({'targets.target_id': target_id})
      .orderBy(order).paginate({perPage: perPage, currentPage: currentPage, isLengthAware: true});
    } else {
      return pg("targets").select("targets.target_id", "targets.query", 
      "visits.visit_id", "visits.target_id", "visits.createtime", "visits.time_actioned", "visits.completed", 
      "visits.status", "visits.screenshot_path", "visits.settings", "visits.private", "visits.referrer")
      .leftJoin("visits", "targets.target_id", "visits.target_id")
      .where({'visits.private': false, 'targets.target_id': target_id})
      .orWhere({"visits.added_by": user ? user.user_id : null, 'targets.target_id': target_id})
      .orderBy(order).paginate({perPage: perPage, currentPage: currentPage, isLengthAware: true});
    }
  },
  set_status: function(visit_id, status) {
    logger.debug(null, {message: `Setting status ${status} for visit ${visit_id}`, action: "set_status"});
    return pg("visits").update({status: status}).where({visit_id: visit_id});
  },
  mark_complete: function(visit_id) {
    return pg("visits").update({completed: true}).where({visit_id: visit_id});
  },
  search_trgm_indexes: function(searchterm, user, perPage=20, currentPage=1, order=[{column: 'sml', order: 'desc'}, {column: 'createtime', order: 'desc'}]) {
    let search_base = pg.select('results.*', 'visits.createtime', 'targets.query').from(function() {
      this.select(pg.raw(`header_value AS hit, 'request header value' AS loc, word_similarity(?, header_value) AS sml, visit_id 
        FROM request_headers WHERE ? <% request_headers.header_value`, [searchterm, searchterm]))
      .union(
        [    
          pg.raw(`SELECT header_name AS hit, 'request header name' AS loc, word_similarity(?, header_name) AS sml, visit_id 
            FROM request_headers WHERE ? <% request_headers.header_name`, [searchterm, searchterm]),
          pg.raw(`SELECT header_value AS hit, 'response header value' AS loc, word_similarity(?, header_value) AS sml, visit_id 
            FROM response_headers WHERE ? <% response_headers.header_value`, [searchterm, searchterm]),
          pg.raw(`SELECT header_name AS hit, 'response header name' AS loc, word_similarity(?, header_name) AS sml, visit_id 
            FROM response_headers WHERE ? <% response_headers.header_name`, [searchterm, searchterm]),
          pg.raw(`SELECT request_url AS hit, 'request url' AS loc, word_similarity(?, request_url) AS sml, visit_id 
            FROM requests WHERE ? <% requests.request_url`, [searchterm, searchterm]),
          pg.raw(`SELECT request_post_data AS hit, 'request POST data' AS loc, word_similarity(?, request_post_data) AS sml, visit_id 
            FROM requests WHERE ? <% requests.request_post_data`, [searchterm, searchterm])
        ])
      .as('results');
    })
    .leftJoin('visits', 'visits.visit_id', 'results.visit_id')
    .leftJoin('targets', 'visits.target_id', 'targets.target_id')
    .union([pg.raw(`SELECT query AS hit, 'targets' AS loc, word_similarity(?, query) AS sml, null AS visit_id, createtime, query 
      FROM targets WHERE ? <% query`, [searchterm, searchterm])]);
    
    if (user && user.roles && user.roles.indexOf("admin") > -1) {
      return search_base.orderBy(order)
      .paginate({perPage: perPage, currentPage: currentPage, isLengthAware: false});
    } else if (user && user.user_id) {
      return search_base.where({'visits.private': false})
      .orWhere({'visits.added_by': user.user_id})
      .orderBy(order)
      .paginate({perPage: perPage, currentPage: currentPage, isLengthAware: false});
    } else {
      return search_base.where({'visits.private': false})
      .orderBy(order)
      .paginate({perPage: perPage, currentPage: currentPage, isLengthAware: false});
    }
    
  }
}
