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
  add_visit: function(target_id, submittime, settings) {
    var formatted = submittime.format("YYYY-MM-DD HH:mm:ss ZZ");
    return pg.insert({
      target_id: target_id,
      createtime: formatted,
      settings: settings
    }).returning("*").into("visits");
  },
  get_visit_results: function(visit_id) {
    let reqs = pg("requests").select("*").leftJoin("request_headers", "requests.request_id", "request_headers.request_id").where({"requests.visit_id": visit_id});
    let resps = pg("responses").select("*").leftJoin("response_headers", "responses.response_id", "response_headers.response_id").where({"responses.visit_id": visit_id});
    let dfpm = pg("dfpm_detections").select("*").where({visit_id: visit_id});
    return Promise.all([reqs, resps, dfpm]);
  },
  get_visit: function(visit_id) {
    return pg("visits").select(
      "targets.target_id",
      "targets.query",
      "visits.*"
    ).leftJoin("targets", "visits.target_id", "targets.target_id").where({"visits.visit_id": visit_id});
  },
  add_requests: async function(requests, visit_id) {
    let req_sql = "WITH req(visit_id, request_time, request_post_data, request_url, request_method) AS (VALUES (?::integer, ?::timestamp with time zone, ?, ?, ?)), " +
    "req_h(header_name, header_value) AS (SELECT header_name, header_value FROM headers_to_rows(?)), " +
    "ir AS (INSERT INTO requests(visit_id, request_time, request_post_data, request_url, request_method) SELECT * FROM req RETURNING request_id) " +
    "INSERT INTO request_headers(request_id, header_name, header_value) SELECT ir.request_id, req_h.header_name, req_h.header_value FROM ir, req_h " +
    "RETURNING *";
    
    let resp_sql = "WITH resp(request_id, visit_id, file_id, response_time, response_size, response_code, response_data_length) " +
    "AS (VALUES (?::integer, ?::integer, ?::integer, ?::timestamp with time zone, ?::integer, ?::integer, ?::integer)), " +
    "resp_h(header_name, header_value) AS (SELECT header_name, header_value FROM headers_to_rows(?)), " +
    "ir AS (INSERT INTO responses(request_id, visit_id, file_id, response_time, response_size, response_code, response_data_length) SELECT * FROM resp RETURNING response_id) " +
    "INSERT INTO response_headers(response_id, header_name, header_value) SELECT ir.response_id, resp_h.header_name, resp_h.header_value FROM ir, resp_h";

    let reqrows = 0;
    let resprows = 0;
    requests.forEach((request) => {
      // need to fix addition of rowCount - not working because it's inside a knex promise
      pg.raw(req_sql, [visit_id, request.request_time, request.request_post_data, request.request_url, request.request_method, request.request_headers])
      .then((reqs) => {
        if (request.response_headers && reqs.rows) {
          pg.raw(resp_sql, [reqs.rows[0].request_id, visit_id, request.file_id, request.response_time, request.response_size, request.response_code, request.response_body.length, request.response_headers])
          .then((resps) => {
            resprows += resps.rowCount;
          })
          .catch((err) => {
            console.error([reqs.rows[0].request_id, visit_id, request.file_id, request.response_time, request.response_size, request.response_code, request.response_body.length, request.response_headers]);
            console.error(err.message);
          });
          reqrows += reqs.rowCount;
        }
      }).catch((err) => {
        console.error([visit_id, request.request_time, request.request_post_data, request.request_url, request.request_method, request.request_headers]);
        console.error(err.message);
      });
    });

    return [reqrows, resprows];
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
  list_visits: function(perPage=20, currentPage=1) {
    return pg("targets").select(
      "targets.target_id",
      "targets.query",
      "visits.*"
    ).leftJoin("visits", "targets.target_id", "visits.target_id")
    .orderBy("visits.visit_id", "desc")
    .paginate({perPage: perPage, currentPage: currentPage, isLengthAware: true});
  },
  list_targets: function(perPage=20, currentPage=1) {
    return pg("targets").select("*").orderBy("targets.target_id", "desc").paginate({perPage: perPage, currentPage: currentPage, isLengthAware: true});
  },
  list_target_visits: function(target_id, perPage=20, currentPage=1) {
    return pg("targets").select(
      "targets.target_id",
      "targets.query",
      "visits.*"
    ).leftJoin("visits", "targets.target_id", "visits.target_id").where({"targets.target_id": target_id})
    .paginate({perPage: perPage, currentPage: currentPage, isLengthAware: true});
  },
  mark_complete: function(visit_id) {
    return pg("visits").update({completed: true}).where({visit_id: visit_id});
  },
  search_requests_and_responses: function(searchterm, perPage=20, currentPage=1) {
    return pg.select("*").from(pg.raw("(SELECT visits.*, targets.*, rq.request_url, rq.request_id, rqh.header_id, rqh.header_name, rqh.header_value, 'request' etype \
      FROM request_headers rqh \
      LEFT JOIN requests rq ON rq.request_id = rqh.request_id LEFT JOIN visits ON visits.visit_id = rq.visit_id \
      LEFT JOIN targets ON targets.target_id = visits.target_id \
      WHERE to_tsvector('English', rqh.header_value) @@ to_tsquery('English', ?) \
      OR to_tsvector('English', rqh.header_name) @@ to_tsquery('English', ?)) rqt \
    UNION SELECT * FROM \
    (SELECT visits.*, targets.*, rq.request_url, rsp.request_id, rsph.header_id, rsph.header_name, rsph.header_value, 'response' etype \
      FROM response_headers rsph \
      LEFT JOIN responses rsp ON rsp.response_id = rsph.response_id LEFT JOIN visits ON visits.visit_id = rsp.visit_id \
      LEFT JOIN requests rq ON rsp.request_id = rq.request_id \
      LEFT JOIN targets ON targets.target_id = visits.target_id \
      WHERE to_tsvector('English', rsph.header_value) @@ to_tsquery('English', ?) \
      OR to_tsvector('English', rsph.header_name) @@ to_tsquery('English', ?)) rspt", [searchterm, searchterm, searchterm, searchterm]))
      .paginate({perPage: perPage, currentPage: currentPage, isLengthAware: true});
  }
}
