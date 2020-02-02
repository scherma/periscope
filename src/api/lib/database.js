var options = require("./options");
var dbparams = {
  client: "pg",
  connection: {
    database: options.dbname,
    user: options.dbuser,
    password: options.dbpass,
    host:"localhost"
  }
};
var pg = require("knex")(dbparams);
var moment = require("moment");
const { attachPaginate } = require("knex-paginate");
attachPaginate();

module.exports = {
  add_target: function(submitted_url, submittime) {
    var formatted = submittime.format("YYYY-MM-DD HH:mm:ss ZZ");
    return pg.insert({
      query: submitted_url,
      createtime: formatted
    }).returning("*").into("targets");
  },
  add_visit: function(target_id, submittime) {
    var formatted = submittime.format("YYYY-MM-DD HH:mm:ss ZZ");
    return pg.insert({
      target_id: target_id,
      createtime: formatted
    }).returning("*").into("visits");
  },
  get_visit_results: function(visit_id) {
    let reqs = pg("requests").select("*").leftJoin("request_headers", "requests.request_id", "request_headers.request_id").where({"requests.visit_id": visit_id});
    let resps = pg("responses").select("*").leftJoin("response_headers", "responses.response_id", "response_headers.response_id").where({"responses.visit_id": visit_id});
    return Promise.all([reqs, resps]);
  },
  get_visit: function(visit_id) {
    return pg("visits").select(
      "targets.target_id",
      "targets.query",
      "visits.*"
    ).leftJoin("targets", "visits.target_id", "targets.target_id").where({"visits.visit_id": visit_id});
  },
  add_requests: async function(requests, visit_id) {
    let req_sql = "WITH req(visit_id, request_time, request_post_data, request_url) AS (VALUES (?::integer, ?::timestamp with time zone, ?, ?)), " +
    "req_h(header_name, header_value) AS (SELECT header_name, header_value FROM headers_to_rows(?)), " +
    "ir AS (INSERT INTO requests(visit_id, request_time, request_post_data, request_url) SELECT * FROM req RETURNING request_id) " +
    "INSERT INTO request_headers(request_id, header_name, header_value) SELECT ir.request_id, req_h.header_name, req_h.header_value FROM ir, req_h " +
    "RETURNING *";
    
    let resp_sql = "WITH resp(request_id, visit_id, file_id, response_time, response_size) AS (VALUES (?::integer, ?::integer, ?::integer, ?::timestamp with time zone, ?::integer)), " +
    "resp_h(header_name, header_value) AS (SELECT header_name, header_value FROM headers_to_rows(?)), " +
    "ir AS (INSERT INTO responses(request_id, visit_id, file_id, response_time, response_size) SELECT * FROM resp RETURNING response_id) " +
    "INSERT INTO response_headers(response_id, header_name, header_value) SELECT ir.response_id, resp_h.header_name, resp_h.header_value FROM ir, resp_h";

    let reqrows = 0;
    let resprows = 0;
    requests.forEach((request) => {
      let r = pg.raw(req_sql, [visit_id, request.request_time, request.request_post_data, request.request_url, request.request_headers])
      .then((reqs) => {
        if (request.response_headers && reqs.rows) {
          pg.raw(resp_sql, [reqs.rows[0].request_id, visit_id, request.file_id, request.response_time, request.response_size, request.response_headers])
          .then((resps) => {
            resprows += resps.rowCount;
          })
          .catch((err) => {
            console.error(err.message);
          });
          reqrows += reqs.rowCount;
        }
      }).then(() => {
        pg("visits").update({completed: true}).where({visit_id: visit_id});
      }).catch((err) => {
        console.error(err.message);
      });
    });

    return [reqrows, resprows];
  },
  set_actioned_time: function(visit_id, action_time) {
    let formatted = action_time.format("YYYY-MM-DD HH:mm:ss.SSS ZZ");
    return pg("visits").where({"visits.visit_id": visit_id}).update({time_actioned: formatted});
  },
  set_screenshot_path: function(screenshot_path, visit_id) {
    return pg("visits").update({screenshot_path: screenshot_path}).where({visit_id: visit_id});
  },
  list_visits: function(perPage=20, currentPage=1, completed) {
    if (completed === null) {
      return pg("targets").select(
        "targets.target_id",
        "targets.query",
        "visits.*"
      ).leftJoin("visits", "targets.target_id", "visits.target_id").paginate({perPage: perPage, currentPage: currentPage});
    } else {
      return pg("visits").select(
        "targets.target_id",
        "targets.query",
        "visits.*"
      ).leftJoin("visits", "targets.target_id", "visits.target_id").where({completed: completed}).paginate({perPage: perPage, currentPage: currentPage});
    }
  },
  list_targets: function(perPage=20, currentPage=1) {
    return pg("targets").select("*").paginate({perPage: perPage, currentPage: currentPage});
  },
  list_target_visits: function(target_id, perPage=20, currentPage=1, complete=false) {
    if (complete) {
      return pg("targets").select(
        "targets.target_id",
        "targets.query",
        "visits.*"
      ).leftJoin("visits", "targets.target_id", "visits.target_id").where({"targets.target_id": target_id, completed: complete})
      .paginate({perPage: perPage, currentPage: currentPage});
    } else {
      return pg("targets").select(
        "targets.target_id",
        "targets.query",
        "visits.*"
      ).leftJoin("visits", "targets.target_id", "visits.target_id").where({"targets.target_id": target_id})
      .paginate({perPage: perPage, currentPage: currentPage});
    }
  },
  search_requests: function(searchterm, perPage=20, currentPage=1) {
    return pg("request_headers").select("*").leftJoin("requests", "request_headers.request_id", "requests.request_id").leftJoin("visits", "requests.visit_id", "visits.visit_id")
    .whereRaw("to_tsvector('English', header_value) @@ to_tsquery('English', ?)", [searchterm]).paginate({perPage: perPage, currentPage: currentPage});
  },
  search_responses: function(searchterm, perPage=20, currentPage=1) {
    return pg("response_headers").select("*").leftJoin("responses", "response_headers.response_id", "responses.response_id").leftJoin("visits", "responses.visit_id", "visits.visit_id")
    .whereRaw("to_tsvector('English', header_value) @@ to_tsquery('English', ?)", [searchterm]).paginate({perPage: perPage, currentPage: currentPage});
  }
}
