CREATE TABLE targets (
    target_id SERIAL PRIMARY KEY,
    createtime timestamp with time zone,
    query text NOT NULL UNIQUE
    );

CREATE TABLE visits ( 
    visit_id SERIAL PRIMARY KEY, 
    target_id integer,
    createtime timestamp with time zone,
    time_actioned timestamp with time zone, 
    completed bool DEFAULT FALSE,
    screenshot_path text,
    settings jsonb
    );

CREATE TABLE requests (
    request_id SERIAL PRIMARY KEY,
    visit_id integer,
    request_time timestamp with time zone,
    request_post_data text,
    request_url text
    );

CREATE TABLE request_headers (
    header_id SERIAL PRIMARY KEY,
    request_id integer,
    header_name text,
    header_value text
    );

CREATE TABLE responses (
    response_id SERIAL PRIMARY KEY,
    request_id integer,
    visit_id integer,
    file_id integer,
    response_time timestamp with time zone,
    response_size integer
    );

CREATE TABLE response_headers (
    header_id SERIAL PRIMARY KEY,
    response_id integer,
    header_name text,
    header_value text
    );

CREATE TABLE dfpm_detections (
    dfpm_id SERIAL PRIMARY KEY,
    visit_id integer,
    method text,
    dfpm_path text,
    dfpm_level text,
    dfpm_category text,
    dfpm_url text,
    dfpm_raw jsonb
    );


ALTER TABLE ONLY visits ADD CONSTRAINT target_id FOREIGN KEY (target_id) REFERENCES targets(target_id);
ALTER TABLE ONLY requests ADD CONSTRAINT visit_id FOREIGN KEY (visit_id) REFERENCES visits(visit_id);
ALTER TABLE ONLY responses ADD CONSTRAINT request_id FOREIGN KEY (request_id) REFERENCES requests(request_id);
ALTER TABLE ONLY responses ADD CONSTRAINT visit_id FOREIGN KEY (visit_id) REFERENCES visits(visit_id);
ALTER TABLE ONLY request_headers ADD CONSTRAINT request_id FOREIGN KEY (request_id) REFERENCES requests(request_id);
ALTER TABLE ONLY response_headers ADD CONSTRAINT response_id FOREIGN KEY (response_id) REFERENCES responses(response_id);
ALTER TABLE ONLY dfpm_detections ADD CONSTRAINT visit_id FOREIGN KEY (visit_id) REFERENCES visits(visit_id);

CREATE INDEX ON targets USING gin ( to_tsvector('english', query) );
CREATE INDEX ON request_headers USING gin ( to_tsvector('english', header_value) );
CREATE INDEX ON response_headers USING gin ( to_tsvector('english', header_value) );

CREATE FUNCTION headers_to_rows(jsonb) RETURNS TABLE (header_name text, header_value text) AS $header_rows$
    SELECT e.key, a.value FROM jsonb_each($1) e, jsonb_array_elements_text(CASE WHEN jsonb_typeof(e.value)='array' THEN e.value ELSE jsonb_build_array(e.value) END) a;
$header_rows$ LANGUAGE sql;