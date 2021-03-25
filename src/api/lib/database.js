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
const { attachPaginate } = require("knex-paginate");
attachPaginate();
const logger = require("./logger");

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
      settings: settings,
      status: "created"
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
    return pg("targets").select("targets.*")
    .count("visits.*")
    .leftJoin("visits", "targets.target_id", "visits.target_id")
    .groupBy("targets.target_id")
    .orderBy("targets.target_id", "desc").paginate({perPage: perPage, currentPage: currentPage, isLengthAware: true});
  },
  list_target_visits: function(target_id, perPage=20, currentPage=1) {
    return pg("targets").select("targets.target_id", "targets.query", "visits.*")
    .leftJoin("visits", "targets.target_id", "visits.target_id").where({"targets.target_id": target_id})
    .paginate({perPage: perPage, currentPage: currentPage, isLengthAware: true});
  },
  set_status: function(visit_id, status) {
    logger.debug(null, {message: `Setting status ${status} for visit ${visit_id}`, action: "set_status"});
    return pg("visits").update({status: status}).where({visit_id: visit_id});
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
      .paginate({perPage: perPage, currentPage: currentPage, isLengthAware: false});
  },
  search_trgm_indexes: function(searchterm, perPage=20, currentPage=1) {
    /*return pg.raw(`SELECT results.*, visits.createtime FROM (
      SELECT header_value AS hit, 'request header value' AS loc, word_similarity(?, header_value) AS sml, visit_id FROM request_headers WHERE ? <% request_headers.header_value
      UNION
      SELECT header_name AS hit, 'request header name' AS loc, word_similarity(?, header_name) AS sml, visit_id FROM request_headers WHERE ? <% request_headers.header_name
      UNION
      SELECT header_value AS hit, 'response header value' AS loc, word_similarity(?, header_value) AS sml, visit_id FROM response_headers WHERE ? <% response_headers.header_value
      UNION
      SELECT header_name AS hit, 'response header name' AS loc, word_similarity(?, header_name) AS sml, visit_id FROM response_headers WHERE ? <% response_headers.header_name
      UNION
      SELECT request_url AS hit, 'request url' AS loc, word_similarity(?, request_url) AS sml, visit_id FROM requests WHERE ? <% requests.request_url
      UNION
      SELECT request_post_data AS hit, 'request POST data' AS loc, word_similarity(?, request_post_data) AS sml, visit_id FROM requests WHERE ? <% requests.request_post_data
) AS results
LEFT JOIN visits ON visits.visit_id=results.visit_id
UNION
      SELECT query AS hit, 'targets' AS loc, word_similarity(?, query) AS sml, null AS visit_id, createtime FROM targets WHERE ? <% query
ORDER BY sml DESC, createtime DESC`, 
    [searchterm, searchterm, searchterm, searchterm, searchterm, searchterm, searchterm, 
    searchterm, searchterm, searchterm, searchterm, searchterm, searchterm, searchterm]);*/

    return pg.select('results.*', 'visits.createtime', 'targets.query').from(function() {
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
      FROM targets WHERE ? <% query`, [searchterm, searchterm])])
    .orderBy([{column: 'sml', order: 'desc'}, {column: 'createtime', order: 'desc'}])
    .paginate({perPage: perPage, currentPage: currentPage, isLengthAware: false});
  },
  search_requests: function(searchterm, perPage=20, currentPage=1) {
    return pg.select("*").from(pg.raw("(SELECT count(*), visits.* FROM request_headers rqt \
    LEFT JOIN requests rq ON rq.request_id = rqt.request_id \
    LEFT JOIN visits ON visits.visit_id = rq.visit_id \
    RIGHT JOIN targets ON visits.target_id = targets.target_id \
    WHERE to_tsvector('English', rqt.header_value) @@ to_tsquery('English', ?) \
    OR to_tsvector('English', rqt.header_name) @@ to_tsquery('English', ?) \
    GROUP BY visits.visit_id) rqt_entries", [searchterm, searchterm]))
    .leftJoin("targets", "rqt_entries.target_id", "targets.target_id")
    .paginate({perPage: perPage, currentPage: currentPage, isLengthAware: true});
  },
  search_responses: function(searchterm, perPage=20, currentPage=1) {
    return pg.select("*").from(pg.raw("(SELECT count(*), visits.* FROM response_headers rph \
    LEFT JOIN responses rp ON rp.response_id = rph.response_id \
    LEFT JOIN visits ON visits.visit_id = rp.visit_id \
    RIGHT JOIN targets ON visits.target_id = targets.target_id \
    WHERE to_tsvector('English', rph.header_value) @@ to_tsquery('English', ?) \
    OR to_tsvector('English', rph.header_name) @@ to_tsquery('English', ?) \
    GROUP BY visits.visit_id) rph_entries", [searchterm, searchterm]))
    .leftJoin("targets", "rph_entries.target_id", "targets.target_id")
    .paginate({perPage: perPage, currentPage: currentPage, isLengthAware: true});
  }
}
