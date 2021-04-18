CREATE TABLE targets (
    target_id SERIAL PRIMARY KEY,
    createtime timestamp with time zone,
    query text NOT NULL UNIQUE,
    added_by integer,
    private boolean DEFAULT FALSE
    );

CREATE TABLE visits ( 
    visit_id SERIAL PRIMARY KEY, 
    target_id integer,
    createtime timestamp with time zone,
    time_actioned timestamp with time zone, 
    completed bool DEFAULT FALSE,
    status text,
    referrer text,
    screenshot_path text,
    settings jsonb,
    added_by integer,
    private boolean DEFAULT FALSE
    );

CREATE TABLE requests (
    request_id SERIAL PRIMARY KEY,
    visit_id integer,
    request_time timestamp with time zone,
    request_post_data text,
    request_url text,
    request_method text
    );

CREATE TABLE request_headers (
    header_id SERIAL PRIMARY KEY,
    request_id integer,
    visit_id integer,
    header_name text,
    header_value text
    );

CREATE TABLE responses (
    response_id SERIAL PRIMARY KEY,
    request_id integer,
    visit_id integer,
    file_id integer,
    response_time timestamp with time zone,
    response_size integer,
    response_code integer,
    response_data_length integer
    );

CREATE TABLE response_headers (
    header_id SERIAL PRIMARY KEY,
    response_id integer,
    visit_id integer,
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

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username varchar(100) NOT NULL UNIQUE,
    email varchar(100) NOT NULL UNIQUE,
    password text NOT NULL,
    proposed_email varchar(100),
    account_activate_token text,
    account_activate_token_used boolean DEFAULT FALSE,
    account_activated boolean DEFAULT FALSE,
    account_activated_time timestamp with time zone,
    email_validate_token text,
    email_validate_token_used boolean DEFAULT FALSE,
    email_validated boolean DEFAULT FALSE,
    email_validated_time timestamp with time zone,
    password_reset_token text,
    password_reset_token_used boolean DEFAULT FALSE,
    password_reset_token_expiry timestamp with time zone,
    password_modified_time timestamp with time zone,
    must_change_password boolean default false,
    account_created_time timestamp with time zone,
    creation_ip text,
    account_deleted timestamp with time zone,
    account_deleted_time timestamp with time zone,
    account_locked_out boolean DEFAULT FALSE,
    account_locked_out_time timestamp with time zone,
    account_locked_out_reason text,
    auth_failures_since_login integer DEFAULT 0,
    last_login timestamp with time zone,
    last_login_ip text,
    roles jsonb
    );

CREATE TABLE signup_tokens (
    token_id SERIAL PRIMARY KEY,
    token text NOT NULL UNIQUE,
    token_expiry timestamp with time zone
    );

ALTER TABLE ONLY targets ADD CONSTRAINT added_by FOREIGN KEY (added_by) REFERENCES users (user_id);
ALTER TABLE ONLY visits ADD CONSTRAINT target_id FOREIGN KEY (target_id) REFERENCES targets(target_id);
ALTER TABLE ONLY visits ADD CONSTRAINT added_by FOREIGN KEY (added_by) REFERENCES users(user_id);
ALTER TABLE ONLY requests ADD CONSTRAINT visit_id FOREIGN KEY (visit_id) REFERENCES visits(visit_id);
ALTER TABLE ONLY responses ADD CONSTRAINT request_id FOREIGN KEY (request_id) REFERENCES requests(request_id);
ALTER TABLE ONLY responses ADD CONSTRAINT visit_id FOREIGN KEY (visit_id) REFERENCES visits(visit_id);
ALTER TABLE ONLY request_headers ADD CONSTRAINT request_id FOREIGN KEY (request_id) REFERENCES requests(request_id);
ALTER TABLE ONLY request_headers ADD CONSTRAINT visit_id FOREIGN KEY (visit_id) REFERENCES visits(visit_id);
ALTER TABLE ONLY response_headers ADD CONSTRAINT response_id FOREIGN KEY (response_id) REFERENCES responses(response_id);
ALTER TABLE ONLY response_headers ADD CONSTRAINT visit_id FOREIGN KEY (visit_id) REFERENCES visits(visit_id);
ALTER TABLE ONLY dfpm_detections ADD CONSTRAINT visit_id FOREIGN KEY (visit_id) REFERENCES visits(visit_id);

CREATE INDEX ON targets USING gin ( to_tsvector('english', query) );
CREATE INDEX targets_trgm ON targets USING GIN(query gin_trgm_ops);
CREATE INDEX ON request_headers USING gin ( to_tsvector('english', header_value) );
CREATE INDEX request_header_name_trgm ON request_headers USING GIN(header_name gin_trgm_ops);
CREATE INDEX request_header_val_trgm ON request_headers USING GIN(header_value gin_trgm_ops);
CREATE INDEX ON response_headers USING gin ( to_tsvector('english', header_value) );
CREATE INDEX response_header_name_trgm ON response_headers USING GIN(header_name gin_trgm_ops);
CREATE INDEX response_header_val_trgm ON response_headers USING GIN(header_value gin_trgm_ops);
CREATE INDEX request_url_trgm ON requests USING GIN(request_url gin_trgm_ops);
CREATE INDEX request_post_data_trgm ON requests USING GIN(request_post_data gin_trgm_ops);


CREATE FUNCTION headers_to_rows(jsonb) RETURNS TABLE (header_name text, header_value text) AS $header_rows$
    SELECT e.key, a.value FROM jsonb_each($1) e, jsonb_array_elements_text(CASE WHEN jsonb_typeof(e.value)='array' THEN e.value ELSE jsonb_build_array(e.value) END) a;
$header_rows$ LANGUAGE sql;
